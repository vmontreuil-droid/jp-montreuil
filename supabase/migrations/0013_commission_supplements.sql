-- jp-montreuil — supplementen + aantal portretten op commission_requests
-- Klant kan aantal portretten kiezen (1-10) en optionele supplementen aanvinken
-- (gewerkte achtergrond, hoog detailniveau, spoedlevering). Admin gebruikt
-- deze info als richtsnoer bij het opstellen van de devis.

set search_path = public;

alter table public.commission_requests
  add column if not exists supplements text[] not null default '{}'::text[],
  add column if not exists portrait_count int not null default 1
    check (portrait_count between 1 and 10);
