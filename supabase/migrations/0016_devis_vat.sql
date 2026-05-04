-- jp-montreuil — BTW op devis
-- Voegt BTW-velden toe aan commission_requests + standaard BTW-tarief
-- aan de pricing-tabel. devis_total_eur blijft het te betalen TTC-bedrag,
-- devis_subtotal_eur bevat het bedrag exclusief BTW.

set search_path = public;

alter table public.commission_requests
  add column if not exists devis_vat_rate numeric,
  add column if not exists devis_subtotal_eur numeric;

alter table public.commission_pricing
  add column if not exists default_vat_rate numeric not null default 0;
