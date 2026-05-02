-- jp-montreuil — Analytics events
-- Anonieme tracking (geen cookies, sessionStorage-id) voor de admin
-- web-activiteit dashboard.

set search_path = public;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in (
    'page_view',
    'work_view',
    'ibook_view',
    'album_view'
  )),
  path text not null,
  referrer text,
  country text,
  device text,
  browser text,
  os text,
  session_id text not null,
  -- art-specifieke kolommen (optioneel per event)
  work_id uuid references public.works(id) on delete set null,
  category_slug text,
  ibook_id uuid references public.ibooks(id) on delete set null,
  album_slug text
);

create index analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index analytics_events_session_idx on public.analytics_events(session_id, created_at desc);
create index analytics_events_event_type_idx on public.analytics_events(event_type, created_at desc);
create index analytics_events_path_idx on public.analytics_events(path);
create index analytics_events_country_idx on public.analytics_events(country);
create index analytics_events_work_idx on public.analytics_events(work_id) where work_id is not null;
create index analytics_events_ibook_idx on public.analytics_events(ibook_id) where ibook_id is not null;

alter table public.analytics_events enable row level security;

-- Public mag inserten (anonymous tracking)
create policy "analytics_events: anon insert"
  on public.analytics_events for insert
  with check (true);

-- Alleen admin mag lezen
create policy "analytics_events: admin select"
  on public.analytics_events for select
  using (public.is_admin());

create policy "analytics_events: admin delete"
  on public.analytics_events for delete
  using (public.is_admin());
