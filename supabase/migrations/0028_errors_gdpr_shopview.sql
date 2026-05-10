------------------------------------------------------------------------
-- Errors log + GDPR requests + shop_photo_view tracking
--
-- 1) public.error_log — server + client errors centraal opslaan, met
--    acknowledge-flag voor de admin-inbox (geport van allardphilippe).
-- 2) public.gdpr_requests — klant kan via portail om data-deletion
--    vragen, admin verwerkt manueel (verwijdert customer + orders +
--    PII overal).
-- 3) Uitbreiding analytics_events: nieuw event_type 'shop_photo_view'
--    + shop_photo_id kolom zodat we top-photos op de boutique kunnen
--    rangschikken.
--
-- Idempotent.
------------------------------------------------------------------------

------------------------------------------------------------------------
-- 1) error_log
------------------------------------------------------------------------
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  stack text,
  url text,
  user_agent text,
  user_email text,
  context jsonb,
  occurred_at timestamptz not null default now(),
  is_acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null
);

create index if not exists error_log_recent_idx
  on public.error_log(occurred_at desc);
create index if not exists error_log_open_idx
  on public.error_log(is_acknowledged, occurred_at desc)
  where is_acknowledged = false;
create index if not exists error_log_dup_idx
  on public.error_log(message, url);

alter table public.error_log enable row level security;

-- Anon mag client-errors POSTen via /api/log-error (server-side validate)
drop policy if exists error_log_anon_insert on public.error_log;
create policy error_log_anon_insert on public.error_log for insert
  with check (true);

drop policy if exists error_log_admin_all on public.error_log;
create policy error_log_admin_all on public.error_log
  for all
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );

------------------------------------------------------------------------
-- 2) gdpr_requests
------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'gdpr_request_status'
  ) then
    create type public.gdpr_request_status as enum (
      'received', 'in_progress', 'completed', 'rejected'
    );
  end if;
end $$;

create table if not exists public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  request_type text not null check (request_type in ('export', 'delete', 'rectification')),
  message text,
  status public.gdpr_request_status not null default 'received',
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists gdpr_requests_status_idx
  on public.gdpr_requests(status, created_at desc);
create index if not exists gdpr_requests_email_idx
  on public.gdpr_requests(email);

alter table public.gdpr_requests enable row level security;

drop policy if exists gdpr_requests_anon_insert on public.gdpr_requests;
create policy gdpr_requests_anon_insert on public.gdpr_requests for insert
  with check (true);

drop policy if exists gdpr_requests_admin_all on public.gdpr_requests;
create policy gdpr_requests_admin_all on public.gdpr_requests
  for all
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );

------------------------------------------------------------------------
-- 3) analytics_events: nieuw event_type + shop_photo_id kolom
------------------------------------------------------------------------
alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'page_view',
    'work_view',
    'ibook_view',
    'album_view',
    'shop_photo_view'
  ));

alter table public.analytics_events
  add column if not exists shop_photo_id uuid;

create index if not exists analytics_events_shop_photo_idx
  on public.analytics_events(shop_photo_id, created_at desc)
  where shop_photo_id is not null;

notify pgrst, 'reload schema';
