-- jp-montreuil — Voeg client_locale toe aan event_albums
-- JP kiest bij het aanmaken van een album in welke taal de klant het portail
-- en de mails ontvangt. Default is FR.

set search_path = public;

alter table public.event_albums
  add column if not exists client_locale text not null default 'fr'
  check (client_locale in ('fr','nl'));

create index if not exists event_albums_client_email_lower_idx
  on public.event_albums (lower(client_email));
