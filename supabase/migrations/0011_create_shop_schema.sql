------------------------------------------------------------------------
-- Webshop module — geport van allardphilippe
--
-- Volledige isolatie via PostgreSQL schema `shop` zodat deze tabellen
-- nooit kunnen botsen met de bestaande jp-montreuil tabellen in `public`
-- (photos, albums, exhibitions, ibook, …).
--
-- BELANGRIJK na uitvoeren:
--   Supabase Dashboard → Project Settings → API → Data API Settings →
--   Exposed schemas → voeg 'shop' toe naast 'public'. Anders kan
--   PostgREST de tabellen niet benaderen via REST.
------------------------------------------------------------------------

create schema if not exists shop;
grant usage on schema shop to anon, authenticated, service_role;
grant all on all tables in schema shop to service_role;
grant all on all sequences in schema shop to service_role;

alter default privileges in schema shop
  grant all on tables to service_role;
alter default privileges in schema shop
  grant all on sequences to service_role;

------------------------------------------------------------------------
-- Photos — bron voor de print-on-demand configurator
------------------------------------------------------------------------
create table if not exists shop.photos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text,
  description text,
  alt_text text,
  ai_alt_generated_at timestamptz,
  storage_path text not null,
  taken_at date,
  taken_at_location text,
  species text,
  width integer,
  height integer,
  is_published boolean not null default false,
  is_slider boolean not null default false,
  slider_order integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_photos_published_idx on shop.photos(is_published, sort_order);

------------------------------------------------------------------------
-- Products + variants + configurator-matrix
------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'shop' and t.typname = 'product_kind'
  ) then
    create type shop.product_kind as enum ('calendar', 'print', 'download', 'commission');
  end if;
end $$;

create table if not exists shop.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kind shop.product_kind not null,
  title_fr text not null,
  title_nl text,
  title_en text,
  description_fr text,
  description_nl text,
  description_en text,
  cover_photo_id uuid references shop.photos(id) on delete set null,
  price_cents integer,
  is_published boolean not null default false,
  is_archived boolean not null default false,
  pre_order_until timestamptz,
  ships_from date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shop.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shop.products(id) on delete cascade,
  label text not null,
  price_cents integer not null,
  stock integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shop_products_published_idx on shop.products(is_published, sort_order);
create index if not exists shop_variants_product_idx on shop.product_variants(product_id);

create table if not exists shop.print_media (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  name_nl text,
  name_en text,
  description_fr text,
  description_nl text,
  description_en text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shop.print_sizes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shop.print_prices (
  media_id uuid not null references shop.print_media(id) on delete cascade,
  size_id uuid not null references shop.print_sizes(id) on delete cascade,
  price_cents integer not null,
  is_available boolean not null default true,
  primary key (media_id, size_id)
);

------------------------------------------------------------------------
-- Customers + Orders
------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'shop' and t.typname = 'order_status'
  ) then
    create type shop.order_status as enum (
      'pending', 'paid', 'shipped', 'fulfilled', 'canceled', 'refunded'
    );
  end if;
end $$;

create table if not exists shop.customers (
  email text primary key,
  full_name text,
  phone text,
  company text,
  address jsonb,
  billing_address jsonb,
  notes text,
  tags text[] not null default '{}',
  source text not null default 'manual',
  is_archived boolean not null default false,
  vat_number text,
  vat_validated_at timestamptz,
  vat_company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shop.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  status shop.order_status not null default 'pending',
  email text not null,
  full_name text not null,
  shipping_address jsonb,
  shipping_country text,
  shipping_cents integer not null default 0,
  mollie_payment_id text unique,
  mollie_checkout_url text,
  amount_cents integer not null,
  currency text not null default 'EUR',
  locale text not null default 'fr',
  notes text,
  tracking_number text,
  tracking_carrier text,
  internal_status text,
  discount_code text,
  discount_cents integer not null default 0,
  gift_card_code text,
  gift_card_cents integer not null default 0,
  company_name text,
  vat_number text,
  vat_validated_at timestamptz,
  vat_company_name text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_status_idx on shop.orders(status, created_at desc);
create index if not exists shop_orders_email_idx on shop.orders(email);

create table if not exists shop.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop.orders(id) on delete cascade,
  product_id uuid references shop.products(id) on delete set null,
  variant_id uuid references shop.product_variants(id) on delete set null,
  title text not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  photo_id uuid references shop.photos(id) on delete set null,
  print_media_slug text,
  print_size_slug text,
  print_size_label text,
  created_at timestamptz not null default now()
);

create index if not exists shop_order_items_order_idx on shop.order_items(order_id);

------------------------------------------------------------------------
-- updated_at-triggers (gedeeld voor het hele schema)
------------------------------------------------------------------------
create or replace function shop.tg_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists shop_photos_updated_at on shop.photos;
create trigger shop_photos_updated_at before update on shop.photos
  for each row execute function shop.tg_updated_at();

drop trigger if exists shop_products_updated_at on shop.products;
create trigger shop_products_updated_at before update on shop.products
  for each row execute function shop.tg_updated_at();

drop trigger if exists shop_customers_updated_at on shop.customers;
create trigger shop_customers_updated_at before update on shop.customers
  for each row execute function shop.tg_updated_at();

drop trigger if exists shop_orders_updated_at on shop.orders;
create trigger shop_orders_updated_at before update on shop.orders
  for each row execute function shop.tg_updated_at();

------------------------------------------------------------------------
-- RLS — alleen authenticated full access (publiek leest server-side via
-- de service-role admin client uit /lib/shop/supabase.ts).
------------------------------------------------------------------------
alter table shop.photos enable row level security;
alter table shop.products enable row level security;
alter table shop.product_variants enable row level security;
alter table shop.print_media enable row level security;
alter table shop.print_sizes enable row level security;
alter table shop.print_prices enable row level security;
alter table shop.customers enable row level security;
alter table shop.orders enable row level security;
alter table shop.order_items enable row level security;

drop policy if exists shop_photos_authed on shop.photos;
create policy shop_photos_authed on shop.photos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_products_authed on shop.products;
create policy shop_products_authed on shop.products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_variants_authed on shop.product_variants;
create policy shop_variants_authed on shop.product_variants for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_print_media_authed on shop.print_media;
create policy shop_print_media_authed on shop.print_media for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_print_sizes_authed on shop.print_sizes;
create policy shop_print_sizes_authed on shop.print_sizes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_print_prices_authed on shop.print_prices;
create policy shop_print_prices_authed on shop.print_prices for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_customers_authed on shop.customers;
create policy shop_customers_authed on shop.customers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_orders_authed on shop.orders;
create policy shop_orders_authed on shop.orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_order_items_authed on shop.order_items;
create policy shop_order_items_authed on shop.order_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
