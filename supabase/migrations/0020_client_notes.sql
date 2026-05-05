-- jp-montreuil — admin notities per klant (geaggregeerd op email)
-- JP kan vrije tekstnotities bewaren per klant ('voorkeur landschap',
-- 'enkel telefonisch te bereiken', 'verjaardag in mei', …).

set search_path = public;

create table if not exists public.client_notes (
  email text primary key,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.client_notes enable row level security;

create policy "client_notes: admin read"
  on public.client_notes for select
  using (public.is_admin());

create policy "client_notes: admin write"
  on public.client_notes for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists client_notes_updated_at_idx
  on public.client_notes(updated_at desc);
