-- jp-montreuil — Exhibitions/agenda
-- Tentoonstellingen, beurzen, salons... waar JP exposeert.

set search_path = public;

create table public.exhibitions (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  title_nl text not null default '',
  description_fr text not null default '',
  description_nl text not null default '',
  location text,
  date_from date not null,
  date_to date,
  image_path text,
  external_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exhibitions_date_from_idx on public.exhibitions(date_from desc);
create index exhibitions_active_idx on public.exhibitions(is_active) where is_active = true;

alter table public.exhibitions enable row level security;

create policy "exhibitions: public read active"
  on public.exhibitions for select
  using (is_active = true);

create policy "exhibitions: admin select all"
  on public.exhibitions for select
  using (public.is_admin());

create policy "exhibitions: admin insert"
  on public.exhibitions for insert
  with check (public.is_admin());

create policy "exhibitions: admin update"
  on public.exhibitions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "exhibitions: admin delete"
  on public.exhibitions for delete
  using (public.is_admin());

create trigger exhibitions_updated_at before update on public.exhibitions
  for each row execute function public.set_updated_at();
