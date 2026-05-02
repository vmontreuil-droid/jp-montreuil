-- jp-montreuil — Newsletter
-- Bezoekers schrijven in op /contact of /social, JP componeert in
-- /admin/newsletter en stuurt naar alle actieve abonnees in hun taal.

set search_path = public;

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'fr' check (locale in ('fr', 'nl')),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  -- Email zonder hoofdletters/extra spaties — uniqueness in lowercase
  -- Werkt met GENERATED column zodat duplicaten via case-difference
  -- ook geweerd worden.
  email_normalized text generated always as (lower(trim(email))) stored
);

create unique index newsletter_subscribers_email_normalized_idx
  on public.newsletter_subscribers(email_normalized);

create index newsletter_subscribers_active_idx
  on public.newsletter_subscribers(subscribed_at desc)
  where unsubscribed_at is null;

alter table public.newsletter_subscribers enable row level security;

-- Iedereen mag inserten (subscribe — gevalideerd in server action)
create policy "newsletter: anon insert"
  on public.newsletter_subscribers for insert
  with check (true);

create policy "newsletter: admin select"
  on public.newsletter_subscribers for select
  using (public.is_admin());

create policy "newsletter: admin update"
  on public.newsletter_subscribers for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "newsletter: admin delete"
  on public.newsletter_subscribers for delete
  using (public.is_admin());

-- Tabel voor verzonden newsletters (history) — voor audit + voorkomen
-- van dubbel verzenden.
create table public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  subject_fr text not null,
  subject_nl text not null,
  body_fr text not null,
  body_nl text not null,
  sent_at timestamptz not null default now(),
  recipients_fr int not null default 0,
  recipients_nl int not null default 0,
  errors int not null default 0
);

create index newsletter_issues_sent_at_idx on public.newsletter_issues(sent_at desc);

alter table public.newsletter_issues enable row level security;
create policy "newsletter_issues: admin all"
  on public.newsletter_issues for all
  using (public.is_admin())
  with check (public.is_admin());
