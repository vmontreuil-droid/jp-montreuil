-- 0030: Seed van een 'BUNDLE3' korting (-10 % zonder min-bedrag, geen
-- vervaldatum, ongelimiteerd aantal uses). Wordt door de checkout
-- automatisch toegepast wanneer een klant ≥ 3 print-lijnen in z'n cart
-- heeft. Idempotent — `on conflict do nothing` zodat re-runs niet
-- crashen.

insert into shop.discount_codes (code, kind, value, min_subtotal_cents, description, is_active)
values (
  'BUNDLE3',
  'percent',
  10,
  0,
  'Set de 3 tirages — 10 % de réduction automatique',
  true
)
on conflict (code) do nothing;
