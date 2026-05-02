-- jp-montreuil — Ibooks van singleton (site_texts) naar dedicated tabel
-- JP kan nu meerdere PDF-boeken beheren (catalogus, expo's...) elk met
-- eigen cover/QR/PDF.

set search_path = public;

create table public.ibooks (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  title_nl text not null default '',
  description_fr text not null default '',
  description_nl text not null default '',
  cover_path text,
  qr_path text,
  pdf_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ibooks_sort_idx on public.ibooks(sort_order);
create index ibooks_active_idx on public.ibooks(is_active) where is_active = true;

alter table public.ibooks enable row level security;

create policy "ibooks: public read active"
  on public.ibooks for select
  using (is_active = true);

create policy "ibooks: admin select all"
  on public.ibooks for select
  using (public.is_admin());

create policy "ibooks: admin insert"
  on public.ibooks for insert
  with check (public.is_admin());

create policy "ibooks: admin update"
  on public.ibooks for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "ibooks: admin delete"
  on public.ibooks for delete
  using (public.is_admin());

create trigger ibooks_updated_at before update on public.ibooks
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Migreer bestaande singleton (uit site_texts) naar de nieuwe tabel
-- ============================================================================
do $$
declare
  v_pdf text;
  v_cover text;
  v_qr text;
  v_title_fr text;
  v_title_nl text;
  v_desc_fr text;
  v_desc_nl text;
begin
  select value_fr into v_pdf from public.site_texts where key = 'ibook_pdf_path';
  select value_fr into v_cover from public.site_texts where key = 'ibook_cover_path';
  select value_fr into v_qr from public.site_texts where key = 'ibook_qr_path';
  select value_fr, value_nl into v_title_fr, v_title_nl from public.site_texts where key = 'ibook_title';
  select value_fr, value_nl into v_desc_fr, v_desc_nl from public.site_texts where key = 'ibook_description';

  if v_pdf is not null and v_pdf <> '' then
    insert into public.ibooks (
      title_fr, title_nl, description_fr, description_nl,
      cover_path, qr_path, pdf_path,
      sort_order, is_active
    )
    values (
      coalesce(nullif(v_title_fr, ''), 'Le livre'),
      coalesce(v_title_nl, ''),
      coalesce(v_desc_fr, ''),
      coalesce(v_desc_nl, ''),
      nullif(v_cover, ''),
      nullif(v_qr, ''),
      v_pdf,
      0,
      true
    );
  end if;
end$$;

-- Oude site_texts keys laten staan voor history; ze worden niet meer gelezen.
