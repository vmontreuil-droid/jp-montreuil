------------------------------------------------------------------------
-- Webshop drukkerijen-flow — geport van allardphilippe (0023_suppliers)
--
-- 1) shop.suppliers — lijst van drukkerijen met default-medium per
--    leverancier (bv. fine_art → drukkerij A, canvas → drukkerij B).
-- 2) shop.supplier_order_status enum — bon-lifecycle.
-- 3) shop.supplier_orders — één rij per print-order_item; gemaakt zodra
--    de klant-order op 'paid' gaat. UNIQUE op order_item_id zorgt voor
--    idempotency (auto-trigger kan vrij vaak draaien).
-- 4) RLS authed-all (admin via service-role bypasst toch).
--
-- Idempotent.
------------------------------------------------------------------------

create table if not exists shop.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  default_for_media text[] not null default '{}',
  is_active boolean not null default true,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_suppliers_active_idx
  on shop.suppliers(is_active, sort_order);
create index if not exists shop_suppliers_media_idx
  on shop.suppliers using gin (default_for_media);

drop trigger if exists shop_suppliers_updated_at on shop.suppliers;
create trigger shop_suppliers_updated_at before update on shop.suppliers
  for each row execute function shop.tg_updated_at();

------------------------------------------------------------------------
-- Status enum
------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'shop' and t.typname = 'supplier_order_status'
  ) then
    create type shop.supplier_order_status as enum (
      'pending',
      'sent',
      'acked',
      'in_production',
      'received_by_studio',
      'cancelled'
    );
  end if;
end $$;

------------------------------------------------------------------------
-- Bons de production
------------------------------------------------------------------------
create table if not exists shop.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop.orders(id) on delete cascade,
  order_item_id uuid not null references shop.order_items(id) on delete cascade,
  supplier_id uuid references shop.suppliers(id) on delete set null,

  status shop.supplier_order_status not null default 'pending',
  sent_at timestamptz,
  acked_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,

  external_ref text,
  signed_url_expires_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (order_item_id)
);

create index if not exists shop_supplier_orders_status_idx
  on shop.supplier_orders(status, created_at desc);
create index if not exists shop_supplier_orders_order_idx
  on shop.supplier_orders(order_id);
create index if not exists shop_supplier_orders_supplier_idx
  on shop.supplier_orders(supplier_id, status);

drop trigger if exists shop_supplier_orders_updated_at on shop.supplier_orders;
create trigger shop_supplier_orders_updated_at before update on shop.supplier_orders
  for each row execute function shop.tg_updated_at();

------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------
alter table shop.suppliers enable row level security;
alter table shop.supplier_orders enable row level security;

drop policy if exists shop_suppliers_authed on shop.suppliers;
create policy shop_suppliers_authed on shop.suppliers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_supplier_orders_authed on shop.supplier_orders;
create policy shop_supplier_orders_authed on shop.supplier_orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
