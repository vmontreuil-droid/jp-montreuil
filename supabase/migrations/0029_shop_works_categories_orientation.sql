------------------------------------------------------------------------
-- Webshop: koppeling met public.works + categorieën + orientation
--
-- 1) shop.photos krijgt:
--    * work_id (FK -> public.works) — voorkomt dubbele import
--    * category_slug — gekopieerd bij import zodat boutique-filter snel
--      kan filteren zonder cross-schema join
--    * bucket — welke storage-bucket de storage_path bevat
--      ('shop-photos' bestaande, 'works' voor geïmporteerde)
--    * orientation — auto bepaald uit width/height bij import
-- 2) shop.order_items +print_orientation — klant kiest portrait/landscape
--    bij bestellen, drukkerij weet welke kant boven.
-- 3) Index op category_slug voor snelle filter.
--
-- Idempotent.
------------------------------------------------------------------------

alter table shop.photos
  add column if not exists work_id uuid references public.works(id) on delete set null,
  add column if not exists category_slug text,
  add column if not exists bucket text not null default 'shop-photos',
  add column if not exists orientation text not null default 'portrait'
    check (orientation in ('portrait', 'landscape', 'square'));

create unique index if not exists shop_photos_work_id_uidx
  on shop.photos (work_id)
  where work_id is not null;

create index if not exists shop_photos_category_idx
  on shop.photos (category_slug, sort_order)
  where is_published = true;

alter table shop.order_items
  add column if not exists print_orientation text
    check (print_orientation is null or print_orientation in ('portrait', 'landscape'));

notify pgrst, 'reload schema';
