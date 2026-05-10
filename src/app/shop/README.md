# Shop module — geport van allardphilippe

Webshop-functionaliteit binnen jp.montreuil.be, geïsoleerd onder het
PostgreSQL schema `shop` zodat geen interferentie met de bestaande
jp-montreuil tabellen (`photos`, `albums`, `exhibitions`, `ibook`, …).

## Setup (eenmalig)

### 1. Migration uitvoeren

Run [`supabase/migrations/0011_create_shop_schema.sql`](../../../supabase/migrations/0011_create_shop_schema.sql)
in de Supabase SQL Editor. Dit maakt:

- Schema `shop`
- Tabellen `shop.photos`, `shop.products`, `shop.product_variants`,
  `shop.print_media`, `shop.print_sizes`, `shop.print_prices`,
  `shop.customers`, `shop.orders`, `shop.order_items`
- Enums `shop.product_kind`, `shop.order_status`
- RLS-policies voor authenticated access
- `notify pgrst, 'reload schema'`

### 2. Schema exposen aan PostgREST

Supabase Dashboard → **Project Settings → API → Data API Settings →
Exposed schemas** → vink `shop` aan → **Save**. Wacht ~30s tot
PostgREST een nieuwe versie uitrolt.

### 3. Verifiëren

Open `/shop` (publiek) of `/shop/admin` (na login). Bovenaan zie je een
groene banner "Schema 'shop' is bereikbaar — webshop kan worden gebruikt."

Als je een ambergele waarschuwing ziet, controleer of stap 1 én stap 2
correct zijn uitgevoerd.

## Routes

| URL | Wat |
|---|---|
| `/shop` | Publieke landing — toont health-status + module-counts |
| `/shop/admin` | Admin-dashboard met module-cards (vereist login) |

## Roadmap

- [x] **v0** Scaffolding: schema, isolated Supabase clients, layout,
      lege landing + admin met health-check
- [ ] **v1** Photos + Products CRUD (geport uit `allardphilippe/src/app/admin/foto`
      en `/admin/boutique`)
- [ ] **v2** Publieke `/shop/boutique` + photo-configurator + cart
- [ ] **v3** Checkout + Mollie integration + factuur
- [ ] **v4** Customers + B2B + VIES
- [ ] **v5** Suppliers + auto bons de production
- [ ] **v6** Statistics + reviews + newsletters

## Architectuur-keuzes

**Schema-isolatie boven multi-tenant**: ipv een `tenant_id` op elke
tabel toe te voegen, gebruiken we PostgreSQL schemas. De webshop leeft
compleet in `shop.*` en kan nooit per ongeluk jp-montreuil-data lezen.

**Eigen Supabase clients** in `src/lib/shop/supabase.ts` met
`db: { schema: 'shop' }`. Alle webshop-code gebruikt deze clients,
nooit de algemene `createAdminClient()` van `src/lib/supabase/admin.ts`.

**Geen integratie met de bestaande AdminShell** in v0. Webshop heeft
eigen mini-header met link terug naar `/admin`. In een latere iteratie
kan dit geïntegreerd worden met de gewone jp-montreuil shell.

**Auth gedeeld**: dezelfde Supabase auth als de rest van jp-montreuil.
`/shop/admin` redirects naar `/admin/login?next=/shop/admin` als geen
sessie.

## Originele referentie

De volledige werkende versie staat in `c:\Users\vince\allardphilippe\`.
De port volgt 1-op-1 dezelfde componentnamen, aangepast voor de
schema-isolatie.
