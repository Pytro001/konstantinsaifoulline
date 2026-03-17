# Supabase + Stripe PDF Delivery Setup

## 1. Create Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Storage** → **New bucket**
3. Name: `documents`
4. **Private bucket** (important!)
5. Create

## 2. Upload the PDF

1. In Storage → `documents` bucket
2. **Upload file**
3. Upload your PDF as `how-to-manage-life.pdf` (or set `DOC_FILE_PATH` secret)

## 3. Set Stripe Success URL

In Stripe Dashboard → Payment Links → Edit your link:

**After payment** → Redirect to:
```
https://konstantinsaifoulline.com/doc/thank-you.html?session_id={CHECKOUT_SESSION_ID}
```

For local testing:
```
http://localhost:3000/doc/thank-you.html?session_id={CHECKOUT_SESSION_ID}
```

**Important:** Use the exact placeholder `{CHECKOUT_SESSION_ID}` (Stripe replaces it). The param name `session_id` must match what the thank-you page expects. The project includes `serve.json` with `cleanUrls: false` so the `serve` dev server preserves query params (otherwise Stripe's redirect would lose the session_id).

## 4. Create the doc_purchasers Table

Run the migration to store purchaser emails for the Notion page:

**Option A – Supabase Dashboard**
1. Go to **SQL Editor** → **New query**
2. Paste and run the contents of `supabase/migrations/20240316180000_create_doc_purchasers.sql`

**Option B – Supabase CLI**
```bash
supabase db push
```

## 5. Deploy the Edge Functions

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref pjhprqoozwvftzuhgtdr

# Set secrets (replace with your Stripe secret key)
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx

# Optional: custom bucket/file
# supabase secrets set DOC_BUCKET_NAME=documents
# supabase secrets set DOC_FILE_PATH=how-to-manage-life.pdf

# Deploy both functions
supabase functions deploy verify-download
supabase functions deploy save-doc-email
```

## 6. Get Your Stripe Secret Key

1. [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys
2. Copy **Secret key** (starts with `sk_`)
3. Use it in `supabase secrets set STRIPE_SECRET_KEY=sk_xxx`

## Summary

- **Bucket:** `documents` (private)
- **File:** `how-to-manage-life.pdf`
- **Table:** `doc_purchasers` (email, session_id, created_at)
- **Edge Functions:** `verify-download` (signed PDF URL), `save-doc-email` (stores purchaser email)
- **Success URL:** Must include `?session_id={CHECKOUT_SESSION_ID}`
