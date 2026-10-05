# Riverside queue controller

This replaces the source-video selection with the existing edits in Konstantin's Riverside studio. `riverside-catalog.json` contains 30 actual Riverside edit IDs and their canonical editor links. It does not contain downloaded video files or authentication credentials.

`riverside_queue.py` is a durable controller, **not an autonomous publisher**. The local Codex heartbeat `riverside-personal-autoposting` is active hourly to reconcile results and maintain a Riverside server-side publishing queue. This is not a GitHub-hosted publisher: queue maintenance requires the Mac and Codex to be available. Do not count a prepared payload or an accepted upload as a successful post.

## Verified live test — October 5, 2026

Edit `6ac12978ee77cfef00498a86` was submitted once through Riverside's planner to only three personal accounts. All three completed, with the content and identity checked on the destination platform:

- Instagram: https://www.instagram.com/reels/DeHS5_nDc9M/
- YouTube Shorts: https://www.youtube.com/shorts/5ssW66abIrQ
- Personal LinkedIn: https://www.linkedin.com/feed/update/urn:li:ugcPost:7512863253266489344/

TikTok was not submitted. Its direct publisher opened a Riverside authorization refresh screen for the connected account; user interaction and the pending Music Usage Confirmation decision are required. The four-platform end-to-end test is therefore incomplete.

The private persistent ledger is `work/riverside-autopilot.sqlite3` in this chat's workspace. The test clip is reserved and excluded from new slot selection. Do not initialize a replacement ledger or resubmit successful platform deliveries.

## Runtime contract

- Use 10:00, 14:00, 18:00 and 22:00 **America/Chicago**, including DST.
- Keep the SQLite state in private persistent storage outside Git. Never recreate it on each scheduled run.
- Fetch and validate the live Riverside accounts using `validate_accounts` before posting. Only the four explicitly configured personal accounts are permitted. LinkedIn pages are rejected.
- Import the catalog once. Importing again keeps existing clip reservations and appends new IDs.
- Run `due` to reserve one clip per slot. A repeated or simultaneous run returns the same reservation. A late wake-up does not publish a backlog.
- Before each external publish, run `begin CLIP_ID PLATFORM`. This commits the `submitting` state before the side effect. If it refuses, reconcile the previous attempt instead of publishing again.
- Read the clip and final metadata, confirm eligibility, and submit through the authenticated Riverside interface. Preserve each platform's visibility and export requirements.
- Run `record` with the platform's actual outcome and response. An upload acceptance is `accepted`; a future post is `scheduled`; a timeout is `uncertain`. Those states must never be blindly resubmitted.
- Record `published` only after an authoritative terminal success/live post readback, with `verified_live: true` and the available post URL or upload ID in the response.
- Prior to activation, compare the catalog with Riverside's scheduled/published history and exclude previously used edits. The catalog alone is not evidence that every edit is unpublished.

## Remaining work

1. Finish TikTok's authorization and live test, respecting applicable confirmations.
2. Verify a rolling queue at all four Chicago slots on every eligible personal platform. An active heartbeat alone is not evidence that those scheduled posts exist.
3. Replenish and reconcile the catalog against scheduled/published history. The 30 edits are not all proven unpublished.

The previous BrightBean worker has not been promoted to a working Riverside integration. GitHub Actions cannot use a desktop connector session by itself.
