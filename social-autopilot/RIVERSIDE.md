# Riverside queue controller

This replaces the source-video selection with the existing edits in Konstantin's Riverside studio. `riverside-catalog.json` contains 30 actual Riverside edit IDs and their canonical editor links. It does not contain downloaded video files or authentication credentials.

`riverside_queue.py` is a durable controller, **not an autonomous publisher**. A supported, authenticated executor is still required. Publishing has not been tested or activated by adding these files. Do not count a prepared payload or an accepted upload as a successful post.

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

## Components still needed before activation

1. A successful live test through an authenticated publishing executor.
2. A scheduler that actually invokes that executor, rather than merely generating payloads.
3. Readback of actual per-platform results and replenishment when the 30-clip queue runs low.

The previous BrightBean worker has not been promoted to a working Riverside integration. GitHub Actions cannot use a desktop connector session by itself.
