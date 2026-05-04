-- jp-montreuil — kader vereenvoudigd + livraison express geschrapt
--   1) 4 verschillende kadertypes wegvallen → enkel "avec cadre" / "sans cadre",
--      meerprijs per formaat (groter doek = duurdere kader).
--   2) Supplement "Délai express" (rush) verdwijnt — JP houdt zich aan de
--      standaard termijn van 5 à 20 jours ouvrables.

set search_path = public;

alter table public.commission_pricing
  drop column if exists frame_simple,
  drop column if exists frame_standard,
  drop column if exists frame_travaille,
  drop column if exists frame_sur_mesure,
  drop column if exists supplement_rush;

alter table public.commission_pricing
  add column if not exists frame_40x60 numeric not null default 80,
  add column if not exists frame_57x77 numeric not null default 120,
  add column if not exists frame_60x90 numeric not null default 180,
  add column if not exists frame_130x160 numeric not null default 350;

-- frame_type op commission_requests blijft staan (oude waarden zoals
-- 'standard' / 'travaille' / 'sur_mesure' blijven geldig voor historische
-- aanvragen); de form gebruikt enkel nog 'aucun' en 'simple'. Bestaande rijen
-- met 'rush' in hun supplements-array blijven ook gewoon staan.
