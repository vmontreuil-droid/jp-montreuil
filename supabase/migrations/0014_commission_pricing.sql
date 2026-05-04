-- jp-montreuil — kader-types + bewerkbare prijslijst
-- Vervangt het simpele framing 'oui'/'non' door een keuze uit 4 kadertypes,
-- en introduceert een commission_pricing tabel zodat JP via admin alle
-- prijzen kan aanpassen zonder code-wijziging.

set search_path = public;

-- ─── Frame type op de aanvraag zelf ─────────────────────────────────
alter table public.commission_requests
  add column if not exists frame_type text
    check (frame_type in ('aucun', 'simple', 'standard', 'travaille', 'sur_mesure'));

-- ─── Pricing tabel (één rij, id = 1) ────────────────────────────────
create table if not exists public.commission_pricing (
  id int primary key default 1 check (id = 1),

  -- Basis per formaat (gelijke prijs voor alle 3 technieken)
  format_40x60 numeric not null default 390,
  format_57x77 numeric not null default 495,
  format_60x90 numeric not null default 720,
  format_130x160 numeric not null default 2250,

  -- Kaders (vast bedrag, ongeacht formaat). NULL = "sur devis".
  frame_simple numeric not null default 80,
  frame_standard numeric not null default 150,
  frame_travaille numeric not null default 280,
  frame_sur_mesure numeric,  -- null = "op aanvraag"

  -- Supplementen (vast bedrag elk)
  supplement_background numeric not null default 120,
  supplement_complex_decor numeric not null default 200,
  supplement_high_detail numeric not null default 150,
  supplement_hyperrealism numeric not null default 250,
  supplement_rush numeric not null default 180,

  -- Extra portret (per portret bovenop de eerste)
  extra_portrait numeric not null default 200,

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Seed één rij met defaults
insert into public.commission_pricing (id) values (1)
on conflict (id) do nothing;

alter table public.commission_pricing enable row level security;

create policy "commission_pricing: public read"
  on public.commission_pricing for select
  using (true);

create policy "commission_pricing: admin write"
  on public.commission_pricing for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger commission_pricing_updated_at
  before update on public.commission_pricing
  for each row execute function public.set_updated_at();
