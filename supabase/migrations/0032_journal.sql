-- jp-montreuil — Journal/blog
--
-- Long-form posts in FR + NL voor SEO (long-tail traffic) en
-- klantbinding. JP componeert in /admin/journal — Claude draft optie,
-- JP redigeert, hij publiceert.
--
-- Status:
--  draft     → enkel zichtbaar in admin
--  published → publiek zichtbaar onder /[locale]/journal
--  archived  → verborgen maar bewaard

set search_path = public;

create table public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$' and length(slug) >= 3),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),

  -- Bilinguaal — beide talen verplicht voor publicatie (gevalideerd in app)
  title_fr text not null default '',
  title_nl text not null default '',
  excerpt_fr text not null default '',
  excerpt_nl text not null default '',
  body_fr text not null default '',
  body_nl text not null default '',

  -- Optionele meta
  cover_image_path text, -- referentie naar 'works' bucket
  tags text[] not null default '{}',

  -- Tijdstempel: published_at = wanneer voor publiek zichtbaar
  -- (kan in de toekomst voor scheduled posts — app filtert
  -- published_at <= now())
  published_at timestamptz,

  -- Audit
  ai_drafted_at timestamptz, -- wanneer Claude een draft genereerde
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_posts_published_idx
  on public.journal_posts(published_at desc nulls last)
  where status = 'published';

create index journal_posts_status_idx on public.journal_posts(status);
create index journal_posts_tags_idx on public.journal_posts using gin(tags);

-- updated_at trigger
create or replace function public.journal_posts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger journal_posts_updated_at
  before update on public.journal_posts
  for each row execute function public.journal_posts_set_updated_at();

-- RLS
alter table public.journal_posts enable row level security;

-- Iedereen mag de gepubliceerde posts lezen (gefilterd in app via
-- published_at <= now())
create policy "journal: public read published"
  on public.journal_posts for select
  using (status = 'published');

-- Admin: alles
create policy "journal: admin all"
  on public.journal_posts for all
  using (public.is_admin())
  with check (public.is_admin());
