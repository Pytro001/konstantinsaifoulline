#!/usr/bin/env python3
import argparse
import json
import os
import pathlib
import subprocess
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

USER_AGENT = "konstantin-social-autopilot/1.0"


def sh(*args):
    print("+", " ".join(args), flush=True)
    subprocess.run(args, check=True)


def http_json(method, url, token, payload=None, extra_headers=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read().decode("utf-8")
            return r.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} -> HTTP {e.code}: {body}") from e


def upload_media(api_base, token, video_path, idem_key):
    cmd = [
        "curl", "--fail-with-body", "--silent", "--show-error",
        "-X", "POST", f"{api_base}/media/",
        "-H", f"Authorization: Bearer {token}",
        "-H", f"User-Agent: {USER_AGENT}",
        "-H", f"Idempotency-Key: {idem_key}",
        "-F", f"file=@{video_path};type=video/mp4",
        "-F", "title=Autopilot clip",
        "-F", f"idempotency_key={idem_key}",
    ]
    print("+ curl POST media (video bytes hidden)", flush=True)
    p = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(p.stdout)


def wait_media(api_base, token, asset_id, timeout=600):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        _, obj = http_json("GET", f"{api_base}/media/{asset_id}", token)
        last = obj
        status = obj.get("processing_status") or obj.get("status")
        if status in (None, "completed", "ready"):
            return obj
        if status in ("failed", "error"):
            raise RuntimeError(f"BrightBean media processing failed: {obj}")
        time.sleep(5)
    raise RuntimeError(f"Timed out waiting for media processing: {last}")


def list_accounts(api_base, token):
    _, obj = http_json("GET", f"{api_base}/accounts/", token)
    return obj.get("accounts", [])


def normalize_platform(p):
    p = (p or "").lower()
    if "instagram" in p:
        return "instagram"
    if "tiktok" in p:
        return "tiktok"
    if "youtube" in p:
        return "youtube"
    if "linkedin" in p:
        return "linkedin"
    return p


def choose_targets(accounts, requested):
    requested = {x.lower() for x in requested}
    out = []
    for a in accounts:
        p = normalize_platform(a.get("platform"))
        if p in requested and a.get("connection_status") in ("connected", "active", "healthy", None):
            out.append((p, a))
    return out


def render_clip(source_url, start, end, output_path):
    work = pathlib.Path(output_path).parent
    source = work / "source.mp4"
    sh(
        "yt-dlp", "--no-playlist",
        "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
        "--merge-output-format", "mp4",
        "-o", str(source), source_url,
    )

    duration = max(1.0, end - start)
    fc = (
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,boxblur=28:14[bg];"
        "[0:v]scale=1080:-2:force_original_aspect_ratio=decrease[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]"
    )
    sh(
        "ffmpeg", "-y", "-ss", str(start), "-i", str(source), "-t", str(duration),
        "-filter_complex", fc, "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", output_path,
    )


def publish_one(api_base, token, account, asset_id, caption, title, scheduled_at, idem):
    payload = {
        "social_account_id": account["id"],
        "caption": caption,
        "title": title if account.get("needs_title") else "",
        "first_comment": "",
        "internal_notes": "Created by Konstantin social autopilot",
        "media_asset_ids": [asset_id],
        "action": "schedule",
        "scheduled_at": scheduled_at,
        "idempotency_key": idem,
    }
    _, obj = http_json(
        "POST",
        f"{api_base}/posts/",
        token,
        payload,
        {"Idempotency-Key": idem},
    )
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--gate-ct",
        action="store_true",
        help="No-op unless current America/Chicago hour is a configured posting slot",
    )
    args = ap.parse_args()

    manifest = json.loads(pathlib.Path(args.manifest).read_text())

    if args.gate_ct:
        ct_now = datetime.now(ZoneInfo("America/Chicago"))
        slots = set(manifest.get("ct_hours", [10, 14, 18, 22]))
        if ct_now.hour not in slots:
            print(
                f"No-op: {ct_now.isoformat()} is not a configured CT posting hour "
                f"{sorted(slots)}"
            )
            return

    required = ["source_url", "start_seconds", "end_seconds", "caption", "title"]
    missing = [k for k in required if k not in manifest]
    if missing:
        raise SystemExit(f"Manifest missing: {', '.join(missing)}")

    start = float(manifest["start_seconds"])
    end = float(manifest["end_seconds"])
    if not (0 <= start < end and end - start <= 180):
        raise SystemExit(
            "Invalid clip range. Require 0 <= start < end and duration <= 180s"
        )

    with tempfile.TemporaryDirectory() as td:
        out = str(pathlib.Path(td) / "clip.mp4")
        render_clip(manifest["source_url"], start, end, out)
        print(json.dumps({"rendered": out, "bytes": os.path.getsize(out)}, indent=2))

        if args.dry_run:
            print("DRY RUN: render succeeded; publisher not called.")
            return

        api_base = os.environ.get(
            "BRIGHTBEAN_API_BASE", "https://brightbean.xyz/api/v1"
        ).rstrip("/")
        token = os.environ.get("BRIGHTBEAN_API_TOKEN")
        if not token:
            raise SystemExit("BRIGHTBEAN_API_TOKEN is required for live publishing")

        accounts = list_accounts(api_base, token)
        platforms = manifest.get(
            "platforms", ["instagram", "tiktok", "youtube", "linkedin"]
        )
        targets = choose_targets(accounts, platforms)
        found = {p for p, _ in targets}
        missing_platforms = [p for p in platforms if p not in found]
        if missing_platforms:
            raise SystemExit(
                f"Missing connected/allowed BrightBean accounts for: "
                f"{missing_platforms}. Available={accounts}"
            )

        clip_key = manifest.get("clip_key") or f"clip-{int(time.time())}"
        asset = upload_media(api_base, token, out, f"media-{clip_key}")
        asset_id = asset.get("id")
        if not asset_id:
            raise RuntimeError(f"No media asset id returned: {asset}")
        wait_media(api_base, token, asset_id)

        schedule_iso = manifest.get("scheduled_at")
        if not schedule_iso:
            schedule_iso = (
                datetime.now(timezone.utc) + timedelta(minutes=2)
            ).isoformat().replace("+00:00", "Z")

        results = []
        captions = manifest.get("captions", {})
        titles = manifest.get("titles", {})
        for platform, account in targets:
            caption = captions.get(platform, manifest["caption"])
            title = titles.get(platform, manifest["title"])
            idem = f"post-{clip_key}-{platform}"
            obj = publish_one(
                api_base,
                token,
                account,
                asset_id,
                caption,
                title,
                schedule_iso,
                idem,
            )
            results.append(
                {
                    "platform": platform,
                    "account": account.get("account_handle")
                    or account.get("account_name"),
                    "result": obj,
                }
            )

        print(json.dumps({"scheduled_at": schedule_iso, "results": results}, indent=2))


if __name__ == "__main__":
    import tempfile
    main()
