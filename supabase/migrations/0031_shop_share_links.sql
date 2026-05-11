-- 0031: Korte share-codes voor de configurator-URL.
-- Klant klikt "Partager", we maken een 6-char code aan en mailen of
-- delen `/s/abc123`. Bij bezoek wordt de code opgezocht en redirect
-- naar /shop/boutique/photo/{slug}?material=...&size=...&...

create table if not exists shop.share_links (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  photo_slug text not null,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  uses_count integer not null default 0,
  created_ip text -- voor lichte misbruik-tracking
);

create index if not exists shop_share_links_code_idx
  on shop.share_links(code);

-- Auto-cleanup van oude codes (>180 dagen) — manueel of via cron.
comment on table shop.share_links is
  'Short-codes voor configurator-URLs. Codes >180 dagen oud kunnen
   worden opgekuist, maar dat blokkeert geen functionaliteit (de
   originele lange URL met query-params blijft altijd werken).';
