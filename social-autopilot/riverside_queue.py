#!/usr/bin/env python3
"""Durable Riverside queue for a connected publishing agent.

This controller never publishes by itself. Its executor must use a supported,
authenticated Riverside publishing interface and record the actual response.
"""
import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

CHICAGO = ZoneInfo("America/Chicago")
HOURS = (10, 14, 18, 22)
STUDIO = "6a6472a78dae1670f790240c"
ACCOUNTS = {
    "Instagram": {"id": "29614016844852451", "handle": "konstantinsaifo"},
    "TikTok": {"id": "-000jlxyrsbP7cEPdg1OJEMuxLS2j4T00I2X", "handle": "konstantinsaifoulline"},
    "YouTube": {"id": "101115005238729528951", "handle": "konstantinsaifo", "channelId": "UC9js4d6T-ItypOrzt-CBuHQ"},
    "LinkedIn": {"id": "8qRnI16BR2", "handle": "Konstantin Saifoulline", "kind": "linkedin_personal_profile"},
}


def connect(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=30, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS clips (
            id TEXT PRIMARY KEY, position INTEGER NOT NULL UNIQUE,
            content TEXT NOT NULL, excluded INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS slots (
            slot TEXT PRIMARY KEY, clip_id TEXT NOT NULL UNIQUE REFERENCES clips(id));
        CREATE TABLE IF NOT EXISTS deliveries (
            clip_id TEXT NOT NULL REFERENCES clips(id), platform TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'prepared', response TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (clip_id, platform));
    """)
    return db


def import_catalog(db, catalog):
    db.execute("BEGIN IMMEDIATE")
    try:
        for clip in catalog:
            if clip.get("studioId") != STUDIO:
                raise ValueError("Refusing a clip outside Konstantin's studio")
            position = db.execute("SELECT COALESCE(MAX(position), -1)+1 FROM clips").fetchone()[0]
            db.execute("INSERT OR IGNORE INTO clips(id, position, content) VALUES (?, ?, ?)",
                       (clip["id"], position, json.dumps(clip)))
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise


def slot_key(now):
    if now.tzinfo is None:
        raise ValueError("A timezone-aware clock is required")
    local = now.astimezone(CHICAGO)
    # Never publish an entire backlog after a sleeping computer wakes.
    if local.hour not in HOURS or local.minute >= 30:
        return None
    return f"{local.date()}-{local.hour:02d}"


def validate_accounts(platform_accounts):
    """Fail before submission if an intended channel is absent or mismatched."""
    for platform, expected in ACCOUNTS.items():
        matches = [a for a in platform_accounts if a.get("platform") == platform
                   and a.get("platformAccountId") == expected["id"]]
        if len(matches) != 1:
            raise ValueError(f"Missing or ambiguous intended {platform} account")
        match = matches[0]
        if platform == "LinkedIn" and match.get("kind") != expected["kind"]:
            raise ValueError("Refusing LinkedIn company/page accounts")
        details = match.get("accounts", [])
        if platform == "YouTube":
            ok = any(a.get("channelId") == expected["channelId"] and
                     a.get("channelHandle", "").lstrip("@") == expected["handle"] for a in details)
        elif platform == "LinkedIn":
            ok = any(a.get("displayName") == expected["handle"] for a in details)
        else:
            ok = any(a.get("username") == expected["handle"] for a in details)
        if not ok:
            raise ValueError(f"Refusing unexpected {platform} identity")


def plan(db, scheduled_for, now=None):
    """Reserve a future Riverside server-side post at an exact Chicago slot."""
    if scheduled_for.tzinfo is None:
        raise ValueError("A timezone-aware scheduled timestamp is required")
    local = scheduled_for.astimezone(CHICAGO)
    if local.hour not in HOURS or local.minute or local.second or local.microsecond:
        raise ValueError("Schedule must be exactly 10:00, 14:00, 18:00 or 22:00 Chicago")
    if scheduled_for <= (now or datetime.now(CHICAGO)):
        raise ValueError("Planning requires a future slot")
    return reserve_key(db, f"{local.date()}-{local.hour:02d}")


def reserve(db, now):
    key = slot_key(now)
    return reserve_key(db, key) if key else None


def reserve_key(db, key):
    db.execute("BEGIN IMMEDIATE")
    try:
        row = db.execute("SELECT clip_id FROM slots WHERE slot=?", (key,)).fetchone()
        if row:
            clip_id = row["clip_id"]
        else:
            clip = db.execute("""SELECT id FROM clips WHERE excluded=0
                AND id NOT IN (SELECT clip_id FROM slots) ORDER BY position LIMIT 1""").fetchone()
            if clip is None:
                db.execute("COMMIT")
                return {"slot": key, "state": "queue_empty"}
            clip_id = clip["id"]
            db.execute("INSERT INTO slots VALUES (?, ?)", (key, clip_id))
            for platform in ACCOUNTS:
                db.execute("INSERT INTO deliveries(clip_id, platform) VALUES (?, ?)", (clip_id, platform))
        content = json.loads(db.execute("SELECT content FROM clips WHERE id=?", (clip_id,)).fetchone()[0])
        deliveries = [dict(r) for r in db.execute("SELECT platform, state FROM deliveries WHERE clip_id=?", (clip_id,))]
        db.execute("COMMIT")
        return {"slot": key, "clip": content, "deliveries": deliveries}
    except Exception:
        db.execute("ROLLBACK")
        raise


def begin(db, clip_id, platform):
    if platform not in ACCOUNTS:
        raise ValueError("Platform not allowed")
    # Commit before the external side effect. A crash stays 'submitting' and
    # requires readback; the next run cannot blindly send the same clip again.
    changed = db.execute("""UPDATE deliveries SET state='submitting', updated_at=CURRENT_TIMESTAMP
        WHERE clip_id=? AND platform=? AND state='prepared'""", (clip_id, platform)).rowcount
    if changed != 1:
        raise ValueError("Already attempted or not reserved; reconcile before any retry")
    content = json.loads(db.execute("SELECT content FROM clips WHERE id=?", (clip_id,)).fetchone()[0])
    return {"studioId": STUDIO, "clipId": clip_id, "platform": platform,
            "platformAccountId": ACCOUNTS[platform]["id"],
            "account": ACCOUNTS[platform], "content": content}


def record(db, clip_id, platform, state, response):
    if state not in {"accepted", "scheduled", "published", "failed", "uncertain", "blocked"}:
        raise ValueError("Unknown delivery state")
    if state == "published" and not response.get("verified_live"):
        raise ValueError("Published requires live verification, not upload acceptance")
    changed = db.execute("""UPDATE deliveries SET state=?, response=?, updated_at=CURRENT_TIMESTAMP
        WHERE clip_id=? AND platform=? AND state IN ('submitting','accepted','scheduled','uncertain')""",
        (state, json.dumps(response), clip_id, platform)).rowcount
    if changed != 1:
        raise ValueError("Invalid state transition")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", required=True, help="Private persistent state; never commit this file")
    sub = p.add_subparsers(dest="command", required=True)
    imp = sub.add_parser("import"); imp.add_argument("catalog")
    due = sub.add_parser("due"); due.add_argument("--now")
    planned = sub.add_parser("plan"); planned.add_argument("--at", required=True)
    start = sub.add_parser("begin"); start.add_argument("clip_id"); start.add_argument("platform")
    result = sub.add_parser("record"); result.add_argument("clip_id"); result.add_argument("platform")
    result.add_argument("state"); result.add_argument("response_file")
    sub.add_parser("status")
    a = p.parse_args(); db = connect(a.db)
    if a.command == "import":
        import_catalog(db, json.loads(Path(a.catalog).read_text())); output = {"imported": True}
    elif a.command == "due":
        output = reserve(db, datetime.fromisoformat(a.now) if a.now else datetime.now(CHICAGO))
    elif a.command == "plan":
        output = plan(db, datetime.fromisoformat(a.at))
    elif a.command == "begin":
        output = begin(db, a.clip_id, a.platform)
    elif a.command == "record":
        record(db, a.clip_id, a.platform, a.state, json.loads(Path(a.response_file).read_text()))
        output = {"recorded": True}
    else:
        output = {"queued": db.execute("SELECT COUNT(*) FROM clips WHERE excluded=0 AND id NOT IN (SELECT clip_id FROM slots)").fetchone()[0],
                  "deliveries": [dict(r) for r in db.execute("SELECT * FROM deliveries")]}
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
