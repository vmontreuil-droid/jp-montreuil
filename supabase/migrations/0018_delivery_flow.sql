-- jp-montreuil — uitgebreide leverings-flow
-- Voegt 3 nieuwe statussen toe (pret, solde_recu, livraison_planifiee),
-- een tweede gestructureerde mededeling voor het saldo, en alle
-- delivery-velden (adres, voorgestelde datum, bevestiging, alt-instructies).

set search_path = public;

-- Status-check uitbreiden
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
    'pret',
    'solde_recu',
    'livraison_planifiee',
    'livre',
    'complete'
  ));

-- Nieuwe timeline-timestamps
alter table public.commission_requests
  add column if not exists ready_at timestamptz,
  add column if not exists balance_received_at timestamptz,
  add column if not exists delivery_proposed_at timestamptz,
  add column if not exists delivery_confirmed_at timestamptz;

-- Tweede gestructureerde mededeling (saldo, afzonderlijk van voorschot)
alter table public.commission_requests
  add column if not exists devis_balance_reference text;

-- Leveringsdetails
alter table public.commission_requests
  add column if not exists delivery_address text,
  add column if not exists delivery_proposed_date timestamptz,
  add column if not exists delivery_confirmed_date timestamptz,
  add column if not exists delivery_alt_option text check (
    delivery_alt_option in ('home', 'neighbours', 'door', 'safe_place', 'other')
  ),
  add column if not exists delivery_alt_specs text;
