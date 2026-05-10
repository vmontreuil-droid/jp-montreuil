------------------------------------------------------------------------
-- Webshop v4 — klantenportaal-koppeling + B2B
--
-- 1) Koppel shop.customers aan auth.users (auth_user_id) zodat een
--    ingelogde klant zijn eigen klantenrij kan vinden.
-- 2) Boolean is_b2b op shop.customers + shop.orders (de string-kolommen
--    company_name / vat_number zaten er al, dit normaliseert de "is b2b
--    bestelling/profiel?" vraag tot één checkbox).
-- 3) RLS self-policies: een ingelogde klant mag z'n eigen rij lezen+
--    updaten in shop.customers en z'n eigen orders lezen — gematcht op
--    lower(auth.email()) = lower(email).
-- 4) Index op lower(email) voor snelle look-ups van orders/customer per
--    ingelogde gebruiker.
--
-- Deze migration is idempotent: alle ALTERs doen IF NOT EXISTS, alle
-- policies worden eerst gedropt.
------------------------------------------------------------------------

alter table shop.customers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_b2b boolean not null default false;

alter table shop.orders
  add column if not exists is_b2b boolean not null default false;

-- Snelle case-insensitive lookups op email
create unique index if not exists shop_customers_email_lower_uidx
  on shop.customers (lower(email));
create index if not exists shop_orders_email_lower_idx
  on shop.orders (lower(email));
create index if not exists shop_customers_auth_user_idx
  on shop.customers (auth_user_id);

------------------------------------------------------------------------
-- RLS — voeg "self"-policies toe naast de bestaande authenticated-all
-- policies. Volgorde van checks in PostgREST = OR over alle policies, dus
-- de bestaande all-policy wint zolang die nog bestaat. Bij volgende
-- harden-pass kunnen we die droppen, maar voor nu houden we backwards-
-- compat (admin/server-side blijft werken via service-role).
------------------------------------------------------------------------

drop policy if exists shop_customers_self_select on shop.customers;
create policy shop_customers_self_select on shop.customers for select
  using (
    auth.role() = 'authenticated'
    and lower(email) = lower(coalesce(auth.email(), ''))
  );

drop policy if exists shop_customers_self_update on shop.customers;
create policy shop_customers_self_update on shop.customers for update
  using (
    auth.role() = 'authenticated'
    and lower(email) = lower(coalesce(auth.email(), ''))
  )
  with check (
    auth.role() = 'authenticated'
    and lower(email) = lower(coalesce(auth.email(), ''))
  );

drop policy if exists shop_orders_self_select on shop.orders;
create policy shop_orders_self_select on shop.orders for select
  using (
    auth.role() = 'authenticated'
    and lower(email) = lower(coalesce(auth.email(), ''))
  );

drop policy if exists shop_order_items_self_select on shop.order_items;
create policy shop_order_items_self_select on shop.order_items for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from shop.orders o
      where o.id = order_items.order_id
        and lower(o.email) = lower(coalesce(auth.email(), ''))
    )
  );

notify pgrst, 'reload schema';
