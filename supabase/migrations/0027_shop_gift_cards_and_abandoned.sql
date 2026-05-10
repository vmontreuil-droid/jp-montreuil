------------------------------------------------------------------------
-- Webshop: gift cards + abandoned carts (geport van allardphilippe
-- 0013 + 0016, in shop schema).
--
-- Gift cards:
--   * Eén code = één saldo. Klant kan code invoeren bij checkout en
--     het bedrag wordt afgetrokken (capped op orderbedrag).
--   * Usages-tabel logt elk gebruik (audit + remaining_cents bewaakt).
-- Abandoned carts:
--   * Gevangen tijdens checkout zodra klant z'n email getypt heeft +
--     items in cart. Cart-snapshot in JSONB. Cart-signature voorkomt
--     dat snel re-typen 10 rijen geeft.
--   * Cron-friendly (reminder_sent_at + recovered_order_id) zodat een
--     batch-job ze later kan opvolgen.
--
-- Idempotent.
------------------------------------------------------------------------

------------------------------------------------------------------------
-- Gift cards
------------------------------------------------------------------------
create table if not exists shop.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  initial_cents integer not null check (initial_cents > 0),
  remaining_cents integer not null check (remaining_cents >= 0),
  recipient_email text,
  recipient_name text,
  message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  source_order_id uuid references shop.orders(id) on delete set null,
  created_by text
);

create index if not exists shop_gift_cards_code_idx on shop.gift_cards(code);
create index if not exists shop_gift_cards_recipient_idx on shop.gift_cards(recipient_email);

create table if not exists shop.gift_card_usages (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references shop.gift_cards(id) on delete cascade,
  order_id uuid references shop.orders(id) on delete set null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

create index if not exists shop_gift_card_usages_card_idx
  on shop.gift_card_usages(gift_card_id, created_at desc);

alter table shop.gift_cards enable row level security;
alter table shop.gift_card_usages enable row level security;

drop policy if exists shop_gift_cards_authed on shop.gift_cards;
create policy shop_gift_cards_authed on shop.gift_cards for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists shop_gift_card_usages_authed on shop.gift_card_usages;
create policy shop_gift_card_usages_authed on shop.gift_card_usages for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

------------------------------------------------------------------------
-- Abandoned carts
------------------------------------------------------------------------
create table if not exists shop.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  locale text not null default 'fr',
  items jsonb not null,
  subtotal_cents integer not null,
  cart_signature text,
  recovered_order_id uuid references shop.orders(id) on delete set null,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_abandoned_carts_email_idx
  on shop.abandoned_carts(email, created_at desc);
create index if not exists shop_abandoned_carts_pending_idx
  on shop.abandoned_carts(reminder_sent_at, recovered_order_id, created_at)
  where reminder_sent_at is null and recovered_order_id is null;

drop trigger if exists shop_abandoned_carts_updated_at on shop.abandoned_carts;
create trigger shop_abandoned_carts_updated_at before update on shop.abandoned_carts
  for each row execute function shop.tg_updated_at();

alter table shop.abandoned_carts enable row level security;

drop policy if exists shop_abandoned_carts_authed on shop.abandoned_carts;
create policy shop_abandoned_carts_authed on shop.abandoned_carts for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

------------------------------------------------------------------------
-- Order: gift_card snapshot kolommen — bestaan al uit 0011, maar
-- voor zekerheid via IF NOT EXISTS.
------------------------------------------------------------------------
alter table shop.orders
  add column if not exists gift_card_code text,
  add column if not exists gift_card_cents integer not null default 0;

notify pgrst, 'reload schema';
