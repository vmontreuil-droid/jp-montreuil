------------------------------------------------------------------------
-- Webshop batch 2 — reviews, kortingscodes & featured photos
--
-- 1) shop.reviews — klantbeoordelingen per foto (sterrren + tekst).
--    Status workflow: pending -> approved/rejected. Publiek leest enkel
--    approved; admin (service-role) ziet alles.
-- 2) shop.discount_codes — kortingscodes (percent of vast bedrag) met
--    optionele min-subtotaal, max-uses en expiratie. Admin maakt aan,
--    publieke checkout valideert via server-action.
-- 3) shop.discount_redemptions — log per gebruik (voor max_uses-check
--    en analytics).
-- 4) shop.photos krijgt is_featured boolean + featured_order zodat de
--    boutique-landing een "highlights"-rij bovenaan kan tonen.
--
-- Idempotent.
------------------------------------------------------------------------

------------------------------------------------------------------------
-- 1) Reviews
------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'shop' and t.typname = 'review_status'
  ) then
    create type shop.review_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists shop.reviews (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references shop.photos(id) on delete cascade,
  order_id uuid references shop.orders(id) on delete set null,
  name text not null,
  email text,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  status shop.review_status not null default 'pending',
  is_verified_purchase boolean not null default false,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists shop_reviews_photo_status_idx
  on shop.reviews(photo_id, status, created_at desc);
create index if not exists shop_reviews_status_idx
  on shop.reviews(status, created_at desc);

alter table shop.reviews enable row level security;

-- Authenticated (admin) full access — bestaande pattern in shop schema
drop policy if exists shop_reviews_authed on shop.reviews;
create policy shop_reviews_authed on shop.reviews for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Anonieme lezers zien enkel approved
drop policy if exists shop_reviews_public_read on shop.reviews;
create policy shop_reviews_public_read on shop.reviews for select
  using (status = 'approved');

-- Anonieme inserts toelaten (form submission) — krijgen status pending
drop policy if exists shop_reviews_public_insert on shop.reviews;
create policy shop_reviews_public_insert on shop.reviews for insert
  with check (status = 'pending');

------------------------------------------------------------------------
-- 2) Discount codes
------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'shop' and t.typname = 'discount_kind'
  ) then
    create type shop.discount_kind as enum ('percent', 'fixed_amount');
  end if;
end $$;

create table if not exists shop.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind shop.discount_kind not null,
  value integer not null check (value > 0),
  -- value betekenis: percent → 1..100 ; fixed_amount → cents
  min_subtotal_cents integer not null default 0,
  max_uses integer,
  uses_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_discount_codes_active_idx
  on shop.discount_codes(is_active, expires_at);

drop trigger if exists shop_discount_codes_updated_at on shop.discount_codes;
create trigger shop_discount_codes_updated_at before update on shop.discount_codes
  for each row execute function shop.tg_updated_at();

alter table shop.discount_codes enable row level security;

drop policy if exists shop_discount_codes_authed on shop.discount_codes;
create policy shop_discount_codes_authed on shop.discount_codes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

------------------------------------------------------------------------
-- 3) Discount redemptions — log per gebruik
------------------------------------------------------------------------
create table if not exists shop.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references shop.discount_codes(id) on delete cascade,
  order_id uuid not null references shop.orders(id) on delete cascade,
  amount_cents integer not null,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists shop_discount_redemptions_code_idx
  on shop.discount_redemptions(code_id, created_at desc);

alter table shop.discount_redemptions enable row level security;

drop policy if exists shop_discount_redemptions_authed on shop.discount_redemptions;
create policy shop_discount_redemptions_authed on shop.discount_redemptions for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

------------------------------------------------------------------------
-- 4) Featured photos — boutique highlights-rij
------------------------------------------------------------------------
alter table shop.photos
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_order integer not null default 0;

create index if not exists shop_photos_featured_idx
  on shop.photos(is_featured, featured_order)
  where is_featured = true;

notify pgrst, 'reload schema';
