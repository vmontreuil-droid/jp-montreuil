-- jp-montreuil — devis-flow op commission_requests
-- Voegt devis-velden + signature + status-tijdlijn toe aan bestaande aanvragen.

set search_path = public;

-- Nieuwe statussen (verving het oude check-constraint)
alter table public.commission_requests
  drop constraint if exists commission_requests_status_check;

alter table public.commission_requests
  add constraint commission_requests_status_check check (status in (
    'nieuw',
    'in_behandeling',
    'devis_envoye',
    'signe',
    'refuse',
    'acompte_recu',
    'en_cours',
    'livre',
    'complete'
  ));

-- Devis-velden
alter table public.commission_requests
  add column if not exists devis_subject text,
  add column if not exists devis_intro text,
  add column if not exists devis_lines jsonb not null default '[]'::jsonb,
  add column if not exists devis_total_eur numeric,
  add column if not exists devis_acompte_pct numeric,
  add column if not exists devis_acompte_eur numeric,
  add column if not exists devis_valid_until date,
  add column if not exists devis_payment_reference text,
  add column if not exists devis_sent_at timestamptz;

-- Signature
alter table public.commission_requests
  add column if not exists signature_token uuid unique,
  add column if not exists signature_data text,
  add column if not exists signer_name text,
  add column if not exists signed_at timestamptz;

-- Status-tijdlijn (timestamps per stap, optioneel)
alter table public.commission_requests
  add column if not exists acompte_received_at timestamptz,
  add column if not exists in_progress_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists refused_at timestamptz;

create index if not exists commission_requests_signature_token_idx
  on public.commission_requests(signature_token)
  where signature_token is not null;

-- Publieke sign-pagina gaat via service-role in server actions (RLS bypass) —
-- de token is unguessable (uuid) en blijft alleen bij de klant in de mail.
-- Geen anon-policies nodig.
