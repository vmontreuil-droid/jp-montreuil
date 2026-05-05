-- jp-montreuil — voortgangsfoto's per commission
-- JP kan tijdens de uitvoering foto's posten met een korte caption.
-- Klant ziet ze in zijn portaal en krijgt een notificatie-mail.

set search_path = public;

create table if not exists public.commission_progress_updates (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commission_requests(id) on delete cascade,
  caption text,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists commission_progress_updates_commission_idx
  on public.commission_progress_updates(commission_id, created_at desc);

create table if not exists public.commission_progress_photos (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.commission_progress_updates(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists commission_progress_photos_update_idx
  on public.commission_progress_photos(update_id, sort_order);

-- RLS — admin alleen voor schrijven, lezen via service-role in de routes
alter table public.commission_progress_updates enable row level security;
alter table public.commission_progress_photos enable row level security;

create policy "commission_progress_updates: admin all"
  on public.commission_progress_updates for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "commission_progress_photos: admin all"
  on public.commission_progress_photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage policies — hergebruik commission-references bucket met
-- prefix '{commission_id}/progress/...'. Bestaande policies dekken
-- die paden al af.
