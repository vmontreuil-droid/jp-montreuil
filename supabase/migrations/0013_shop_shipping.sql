------------------------------------------------------------------------
-- Webshop: verzendzones + 1 default-zone (BE).
-- Vincent kan via /shop/admin/shipping zones bewerken/toevoegen.
------------------------------------------------------------------------

create table if not exists shop.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  countries text[] not null default '{}',
  base_cents integer not null default 0,
  free_above_cents integer,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_shipping_active_idx on shop.shipping_zones(is_active, sort_order);

drop trigger if exists shop_shipping_zones_updated_at on shop.shipping_zones;
create trigger shop_shipping_zones_updated_at before update on shop.shipping_zones
  for each row execute function shop.tg_updated_at();

alter table shop.shipping_zones enable row level security;

drop policy if exists shop_shipping_authed on shop.shipping_zones;
create policy shop_shipping_authed on shop.shipping_zones for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed: BE-zone als enige default. €5,95 — gratis vanaf €75
-- (Vincent kan later bewerken via /shop/admin/shipping)
insert into shop.shipping_zones (name, countries, base_cents, free_above_cents, is_default, sort_order)
values ('Belgique', array['BE'], 595, 7500, true, 0)
on conflict do nothing;

-- Catch-all "Reste du monde" zone — flat 19,95€, no free threshold
insert into shop.shipping_zones (name, countries, base_cents, free_above_cents, is_default, sort_order)
values ('Reste du monde', array[]::text[], 1995, null, false, 99)
on conflict do nothing;

notify pgrst, 'reload schema';
