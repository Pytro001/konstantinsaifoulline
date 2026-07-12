-- Private, cross-site analytics.
-- Raw rows are NOT readable with the public anon key (RLS on, no policies).
-- All access goes through SECURITY DEFINER functions:
--   • log_event(events jsonb)          — anyone can append events (ingest)
--   • get_site_analytics(pw, days)     — returns aggregates ONLY if pw matches
-- The password is checked server-side and never ships in page source.

create table if not exists public.site_events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  site        text not null,
  type        text not null,            -- 'pageview' | 'click' | 'session'
  session_id  text,
  path        text,
  referrer    text,
  ua          text,
  screen_w    int,
  screen_h    int,
  vp_w        int,
  vp_h        int,
  x           real,                      -- click x as fraction (0..1) of viewport width
  y           real,                      -- click y as fraction (0..1) of document height
  target      text,                      -- short description of the clicked element
  duration_ms bigint,                    -- for 'session' events: time on page
  meta        jsonb
);

create index if not exists site_events_ts_idx   on public.site_events (ts);
create index if not exists site_events_site_idx on public.site_events (site);
create index if not exists site_events_type_idx on public.site_events (type);

alter table public.site_events enable row level security;
-- No policies on purpose: the anon role can't read/write the table directly.

-- ---- Ingest ---------------------------------------------------------------
create or replace function public.log_event(events jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e jsonb;
  n int := 0;
begin
  if jsonb_typeof(events) <> 'array' then
    return;
  end if;
  for e in select * from jsonb_array_elements(events) loop
    n := n + 1;
    if n > 60 then exit; end if;  -- basic anti-abuse cap per call
    insert into public.site_events
      (site, type, session_id, path, referrer, ua,
       screen_w, screen_h, vp_w, vp_h, x, y, target, duration_ms, meta)
    values (
      left(coalesce(e->>'site','unknown'), 40),
      left(coalesce(e->>'type','pageview'), 20),
      left(e->>'session_id', 64),
      left(e->>'path', 300),
      left(e->>'referrer', 300),
      left(e->>'ua', 300),
      nullif(e->>'screen_w','')::int,
      nullif(e->>'screen_h','')::int,
      nullif(e->>'vp_w','')::int,
      nullif(e->>'vp_h','')::int,
      nullif(e->>'x','')::real,
      nullif(e->>'y','')::real,
      left(e->>'target', 200),
      nullif(e->>'duration_ms','')::bigint,
      e->'meta'
    );
  end loop;
end;
$$;

-- ---- Read (password-gated) ------------------------------------------------
create or replace function public.get_site_analytics(pw text, since_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  cutoff timestamptz;
  d int;
begin
  if pw is distinct from 'qw29lo!?' then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  d := least(greatest(coalesce(since_days, 30), 1), 365);
  cutoff := now() - make_interval(days => d);

  select jsonb_build_object(
    'range_days', d,
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'pageviews', count(*) filter (where type = 'pageview'),
        'sessions',  count(distinct session_id),
        'clicks',    count(*) filter (where type = 'click'),
        'avg_seconds', round(avg(duration_ms) filter (where type = 'session' and duration_ms > 0) / 1000.0)::int
      ) from site_events where ts >= cutoff
    ),
    'by_site', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) from (
        select site,
          count(*) filter (where type = 'pageview') as pageviews,
          count(distinct session_id) as sessions,
          count(*) filter (where type = 'click') as clicks,
          round(avg(duration_ms) filter (where type = 'session' and duration_ms > 0) / 1000.0)::int as avg_seconds
        from site_events where ts >= cutoff
        group by site order by pageviews desc
      ) s
    ),
    'top_pages', (
      select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) from (
        select site, coalesce(nullif(path,''),'/') as path, count(*) as views
        from site_events where ts >= cutoff and type = 'pageview'
        group by site, path order by views desc limit 30
      ) p
    ),
    'referrers', (
      select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) from (
        select coalesce(nullif(referrer,''), 'direct') as referrer, count(*) as n
        from site_events where ts >= cutoff and type = 'pageview'
        group by 1 order by n desc limit 15
      ) r
    ),
    'daily', (
      select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
        select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as day,
          count(*) filter (where type = 'pageview') as pageviews,
          count(distinct session_id) as sessions
        from site_events where ts >= cutoff group by 1 order by 1
      ) x
    ),
    'top_clicks', (
      select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) from (
        select site, coalesce(nullif(target,''),'(unknown)') as target, count(*) as n
        from site_events where ts >= cutoff and type = 'click'
        group by site, target order by n desc limit 30
      ) c
    ),
    'clicks', (
      select coalesce(jsonb_agg(row_to_json(k)), '[]'::jsonb) from (
        select site, coalesce(nullif(path,''),'/') as path, x, y, target
        from site_events where ts >= cutoff and type = 'click' and x is not null
        order by ts desc limit 3000
      ) k
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.log_event(jsonb)              to anon;
grant execute on function public.get_site_analytics(text, int) to anon;
