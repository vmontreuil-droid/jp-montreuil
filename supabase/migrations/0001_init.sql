-- jp-montreuil — initieel schema
-- Categorieën, werken (gallery items), à propos secties, contact-formulier inzendingen, admin profiles.

set search_path = public;

-- ============================================================================
-- Profiles + role-check helper
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create profile bij registratie
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin-check helper — wordt overal in policies hergebruikt
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles: own row readable"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles: admin can update role"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Categorieën (10 galerij-categorieën)
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sort_order int not null default 0,
  label_fr text not null,
  label_nl text not null,
  description_fr text,
  description_nl text,
  cover_work_id uuid,  -- FK toegevoegd na works-tabel
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_sort_order_idx on public.categories(sort_order);

alter table public.categories enable row level security;

create policy "categories: public read"
  on public.categories for select
  using (true);

create policy "categories: admin write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Works (gallery items)
-- ============================================================================

create table public.works (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  storage_path text not null,           -- pad in 'works' bucket, bv. 'voitures/abc.jpg'
  width int,                             -- pixels (voor next/image sizing)
  height int,
  -- Optionele metadata, vrijwel altijd leeg na initial scrape (bestaande site
  -- heeft geen per-werk metadata) maar JP kan ze later invullen via admin.
  title_fr text,
  title_nl text,
  year int,
  technique_fr text,
  technique_nl text,
  dimensions text,                       -- bv. "60 x 80 cm"
  sort_order int not null default 0,
  -- Provenance: oorspronkelijke URL op WordPress site (voor migratie-tracing)
  original_source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index works_category_id_idx on public.works(category_id);
create index works_sort_order_idx on public.works(category_id, sort_order);

alter table public.works enable row level security;

create policy "works: public read"
  on public.works for select
  using (true);

create policy "works: admin write"
  on public.works for all
  using (public.is_admin())
  with check (public.is_admin());

-- Cover-work FK pas nu, na works tabel
alter table public.categories
  add constraint categories_cover_work_id_fkey
  foreign key (cover_work_id) references public.works(id) on delete set null;

-- ============================================================================
-- À Propos secties (ordered list of titled blocks, NL+FR)
-- ============================================================================

create table public.about_sections (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  title_fr text not null,
  title_nl text not null,
  body_fr text not null,
  body_nl text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index about_sections_sort_order_idx on public.about_sections(sort_order);

alter table public.about_sections enable row level security;

create policy "about_sections: public read"
  on public.about_sections for select
  using (true);

create policy "about_sections: admin write"
  on public.about_sections for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Site-teksten (key/value voor home tagline, intro, footer enz.)
-- ============================================================================

create table public.site_texts (
  key text primary key,
  value_fr text not null default '',
  value_nl text not null default '',
  description text,
  updated_at timestamptz not null default now()
);

alter table public.site_texts enable row level security;

create policy "site_texts: public read"
  on public.site_texts for select
  using (true);

create policy "site_texts: admin write"
  on public.site_texts for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Contact-formulier inzendingen
-- ============================================================================

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  locale text,                          -- 'fr' of 'nl', vanwaar het ingediend werd
  ip text,
  user_agent text,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index contact_messages_unread_idx on public.contact_messages(created_at desc) where read_at is null;

alter table public.contact_messages enable row level security;

-- Iedereen mag inzenden (anoniem). Geen public read.
create policy "contact_messages: anyone can insert"
  on public.contact_messages for insert
  with check (true);

create policy "contact_messages: admin read"
  on public.contact_messages for select
  using (public.is_admin());

create policy "contact_messages: admin update"
  on public.contact_messages for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "contact_messages: admin delete"
  on public.contact_messages for delete
  using (public.is_admin());

-- ============================================================================
-- updated_at trigger (gemeenschappelijk)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger works_updated_at before update on public.works
  for each row execute function public.set_updated_at();
create trigger about_sections_updated_at before update on public.about_sections
  for each row execute function public.set_updated_at();
create trigger site_texts_updated_at before update on public.site_texts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Storage bucket — 'works' voor galerij-afbeeldingen
-- (Bucket wordt door supabase niet via CREATE BUCKET aangemaakt, dat moet via
--  dashboard of API. Dit blok stelt enkel de RLS policies in voor de bucket.)
-- ============================================================================

-- Public read voor 'works' bucket: iedereen kan foto's bekijken.
-- Schrijven enkel via service role (seed) of admin (via authenticated client).

create policy "works bucket: public read"
  on storage.objects for select
  using (bucket_id = 'works');

create policy "works bucket: admin write"
  on storage.objects for insert
  with check (bucket_id = 'works' and public.is_admin());

create policy "works bucket: admin update"
  on storage.objects for update
  using (bucket_id = 'works' and public.is_admin())
  with check (bucket_id = 'works' and public.is_admin());

create policy "works bucket: admin delete"
  on storage.objects for delete
  using (bucket_id = 'works' and public.is_admin());
