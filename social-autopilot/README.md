# Social Autopilot

Zero-cost publishing worker for Konstantin's podcast clips.

## Architecture

1. A manifest identifies a public source video and clip start/end timestamps.
2. GitHub Actions downloads the source with yt-dlp.
3. ffmpeg renders a 1080x1920 short using a blurred vertical background while keeping the full podcast frame visible.
4. The worker uploads the MP4 to BrightBean Studio.
5. BrightBean schedules it to the connected Instagram, TikTok, YouTube and personal LinkedIn accounts.
6. Idempotency keys prevent duplicate media/post creation when a job retries.

## Posting clock

10:00, 14:00, 18:00 and 22:00 America/Chicago.

The workflow fires at both possible UTC equivalents and the Python worker gates against the real America/Chicago timezone, so US DST changes do not shift the intended slots.

## Required one-time setup

Use BrightBean Studio's free hosted version.

Connect the four personal social accounts and create a workspace API key with:
- upload_media
- create_posts
- publish_directly

Allowlist only the four intended accounts.

Add GitHub Actions repository secrets:
- BRIGHTBEAN_API_BASE = https://brightbean.xyz/api/v1
- BRIGHTBEAN_API_TOKEN = the scoped bb_studio_... key

No paid scheduler is required.

## Queue

Put the next exact package at:

social-autopilot/queue/next.json

Use a unique clip_key and an explicit scheduled_at timestamp. Keeping scheduled_at fixed makes retries idempotent.

See example-manifest.json.

## Safety

The API key should only be allowed to publish to:
- Instagram @konstantinsaifo
- TikTok @konstantinsaifoulline
- YouTube @konstantinsaifo
- Konstantin Saifoulline personal LinkedIn

Do not allowlist company pages.
