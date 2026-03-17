-- Table for storing doc purchaser emails (for Notion page access)
create table if not exists public.doc_purchasers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  session_id text,
  created_at timestamptz default now()
);

-- Enable RLS (table is only written via Edge Function with service role)
alter table public.doc_purchasers enable row level security;

-- No policies needed: Edge Function uses service role and bypasses RLS.
-- Anon/authenticated users cannot read or write directly.
