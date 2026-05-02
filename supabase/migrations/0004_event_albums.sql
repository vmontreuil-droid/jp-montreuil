-- jp-montreuil — Event-albums voor klanten
-- JP maakt een album per evenement (huwelijk, feest...), upload de foto's en
-- deelt een privé link `/album/<slug>` met de opdrachtgever.

set search_path = public;

-- ============================================================================
-- Event albums (1 per evenement / opdrachtgever)
-- ============================================================================

create table public.event_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client_name text,
  client_email text,
  event_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_albums_created_at_idx on public.event_albums(created_at desc);
create index event_albums_slug_idx on public.event_albums(slug);

alter table public.event_albums enable row level security;

-- Public mag actieve albums lezen via slug (om title/client_name te tonen)
create policy "event_albums: public read active"
  on public.event_albums for select
  using (is_active = true);

-- Admin volledige CRUD
create policy "event_albums: admin select all"
  on public.event_albums for select
  using (public.is_admin());

create policy "event_albums: admin insert"
  on public.event_albums for insert
  with check (public.is_admin());

create policy "event_albums: admin update"
  on public.event_albums for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "event_albums: admin delete"
  on public.event_albums for delete
  using (public.is_admin());

create trigger event_albums_updated_at before update on public.event_albums
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Foto's per album
-- ============================================================================

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.event_albums(id) on delete cascade,
  storage_path text not null,
  filename text,
  size_bytes bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index event_photos_album_id_sort_idx on public.event_photos(album_id, sort_order);

alter table public.event_photos enable row level security;

-- Public read van photos van actieve albums
create policy "event_photos: public read of active album"
  on public.event_photos for select
  using (exists (
    select 1 from public.event_albums a
    where a.id = album_id and a.is_active = true
  ));

create policy "event_photos: admin select all"
  on public.event_photos for select
  using (public.is_admin());

create policy "event_photos: admin insert"
  on public.event_photos for insert
  with check (public.is_admin());

create policy "event_photos: admin update"
  on public.event_photos for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "event_photos: admin delete"
  on public.event_photos for delete
  using (public.is_admin());

-- ============================================================================
-- Storage bucket 'events' — PRIVÉ (geen public read)
-- Bucket aanmaken in Supabase Dashboard → Storage → New bucket
--   * Name: events
--   * Public: NO (privé)
-- De public viewer-pagina serveert foto's via signed URLs (1u TTL).
-- ============================================================================

create policy "events bucket: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'events' and public.is_admin());

create policy "events bucket: admin select"
  on storage.objects for select
  using (bucket_id = 'events' and public.is_admin());

create policy "events bucket: admin update"
  on storage.objects for update
  using (bucket_id = 'events' and public.is_admin())
  with check (bucket_id = 'events' and public.is_admin());

create policy "events bucket: admin delete"
  on storage.objects for delete
  using (bucket_id = 'events' and public.is_admin());
