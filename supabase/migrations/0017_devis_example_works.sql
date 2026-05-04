-- jp-montreuil — selecteer werken die als voorbeeld op /devis verschijnen
-- JP kan via admin per werk aanvinken of het in de inspiratie-strook op
-- /devis getoond wordt. Volgorde volgt sort_order.

set search_path = public;

alter table public.works
  add column if not exists is_devis_example boolean not null default false;

create index if not exists works_is_devis_example_idx
  on public.works(is_devis_example, sort_order)
  where is_devis_example = true;
