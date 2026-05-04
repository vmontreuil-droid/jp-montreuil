-- jp-montreuil — commission requests (devis sur mesure)
-- Publiek formulier op /devis. Bezoeker kiest techniek, drager, formaat,
-- voegt referentiefoto's toe. JP ontvangt een mail en behandelt verder
-- via een devis op maat.

set search_path = public;

create table public.commission_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  locale text not null check (locale in ('fr', 'nl')),
  technique text not null check (
    technique in ('crayon_nb', 'aquarelle_couleur', 'acrylique_toile', 'autre')
  ),
  support text check (support in ('papier_aquarelle', 'toile_lin', 'peu_importe')),
  width_cm numeric,
  height_cm numeric,
  framing text check (framing in ('oui', 'non', 'peu_importe')),
  budget_indication text,
  message text not null,
  status text not null default 'nieuw' check (
    status in ('nieuw', 'in_behandeling', 'devis_envoye', 'accepte', 'refuse', 'complete')
  ),
  admin_notes text,
  ip text,
  user_agent text,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index commission_requests_created_at_idx on public.commission_requests(created_at desc);
create index commission_requests_unread_idx on public.commission_requests(created_at desc) where read_at is null;
create index commission_requests_status_idx on public.commission_requests(status);

alter table public.commission_requests enable row level security;

-- Iedereen mag inzenden via service-role (admin client) in server action.
-- Geen anon-policy nodig: inserts gaan altijd langs de service-role.
create policy "commission_requests: anyone can insert"
  on public.commission_requests for insert
  with check (true);

create policy "commission_requests: admin read"
  on public.commission_requests for select
  using (public.is_admin());

create policy "commission_requests: admin update"
  on public.commission_requests for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "commission_requests: admin delete"
  on public.commission_requests for delete
  using (public.is_admin());

create trigger commission_requests_updated_at
  before update on public.commission_requests
  for each row execute function public.set_updated_at();

-- Bijlagen — referentiefoto's per aanvraag
create table public.commission_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.commission_requests(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index commission_attachments_request_id_idx on public.commission_attachments(request_id);

alter table public.commission_attachments enable row level security;

create policy "commission_attachments: anyone can insert"
  on public.commission_attachments for insert
  with check (true);

create policy "commission_attachments: admin read"
  on public.commission_attachments for select
  using (public.is_admin());

create policy "commission_attachments: admin delete"
  on public.commission_attachments for delete
  using (public.is_admin());

-- Storage bucket policies — 'commission-references' moet via dashboard/API
-- aangemaakt zijn voor deze policies effect hebben.
create policy "commission-references bucket: service role write"
  on storage.objects for insert
  with check (bucket_id = 'commission-references');

create policy "commission-references bucket: admin read"
  on storage.objects for select
  using (bucket_id = 'commission-references' and public.is_admin());

create policy "commission-references bucket: admin delete"
  on storage.objects for delete
  using (bucket_id = 'commission-references' and public.is_admin());
