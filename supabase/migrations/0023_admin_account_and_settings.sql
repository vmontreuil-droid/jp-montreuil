------------------------------------------------------------------------
-- Admin batch A — extra kolommen voor /admin/account + /admin/settings
--
-- 1) profiles krijgt een display_name + avatar_url zodat de admin z'n
--    profielnaam kan instellen (verschijnt in compose-pages, footer, ...).
-- 2) Nieuwe tabel public.site_settings (key/value/text) zodat we losse
--    site-configuratie kunnen beheren zonder voor elke flag een eigen
--    kolom te maken. Eén row = één instelling.
--    Seedt direct de standaard-keys met lege defaults.
-- 3) RLS: alleen admins kunnen settings lezen+schrijven (werkt via de
--    bestaande `profiles.role = 'admin'` check).
--
-- Idempotent.
------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text;

------------------------------------------------------------------------
-- site_settings — generieke key-value voor losse site-config
------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.tg_site_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.tg_site_settings_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists site_settings_admin_all on public.site_settings;
create policy site_settings_admin_all on public.site_settings
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Publieke leestoegang voor enkele "publishable" keys (zoals site_title,
-- meta_description) zodat publieke pagina's ze rechtstreeks kunnen lezen
-- zonder service-role.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select
  using (
    key in (
      'site_title',
      'site_tagline',
      'meta_description',
      'social_default_image',
      'announcement_banner',
      'reply_to_email'
    )
  );

-- Seed defaults (insert-or-ignore via on conflict)
insert into public.site_settings (key, description) values
  ('site_title', 'Titre du site (utilisé dans <title> et OpenGraph)'),
  ('site_tagline', 'Sous-titre / tagline (visible sur la page d''accueil)'),
  ('meta_description', 'Méta-description par défaut pour SEO'),
  ('social_default_image', 'Image par défaut pour partages sociaux (URL)'),
  ('announcement_banner', 'Bannière d''annonce (vide = masquée)'),
  ('reply_to_email', 'Adresse Reply-To pour les emails sortants'),
  ('contact_phone', 'Numéro de téléphone affiché en pied de page'),
  ('contact_address', 'Adresse postale affichée en pied de page'),
  ('admin_notification_email', 'Email pour les notifications admin (commandes, messages)'),
  ('default_locale', 'Langue par défaut (fr ou nl)')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
