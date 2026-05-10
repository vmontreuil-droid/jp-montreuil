------------------------------------------------------------------------
-- Webshop catalog seed — krak hetzelfde als allardphilippe
--
-- Vult de print-on-demand catalogus met:
--   * 4 print_media (fine_art, canvas, aluminum, plexi) in FR/NL/EN
--   * 5 print_sizes (S → XXL, 30×45 tot 120×180 cm)
--   * 20 print_prices (matrix media × sizes met multipliers identiek
--     aan allardphilippe)
--
-- Base-prijzen per medium (in cent):
--   fine_art : 4500   |  canvas : 7500
--   aluminum : 9500   |  plexi  : 11500
-- Size-multipliers:
--   s 1.0  |  m 2.4  |  l 4.0  |  xl 6.5  |  xxl 10.0
--
-- Idempotent: ON CONFLICT DO NOTHING.
------------------------------------------------------------------------

------------------------------------------------------------------------
-- 1) print_media — 4 supports
------------------------------------------------------------------------
insert into shop.print_media (slug, name_fr, name_nl, name_en, description_fr, description_nl, description_en, sort_order)
values
  ('fine_art',
    'Fine-Art papier',     'Fine-art papier',  'Fine-art paper',
    'Tirage giclée sur papier baryté 310 g/m². Rendu mat profond, idéal pour archivage.',
    'Giclée-print op baryta papier 310 g/m². Diepe matte tinten, archivaal.',
    'Giclée print on 310 g/m² baryta paper. Deep matte tones, archival quality.',
    10),
  ('canvas',
    'Toile sur châssis',   'Canvas op spieraam', 'Canvas on stretcher',
    'Toile coton tendue sur châssis bois 4 cm. Bords blancs, prête à accrocher.',
    'Katoenen doek opgespannen op spieraam 4 cm. Witte randen, klaar om op te hangen.',
    'Cotton canvas stretched on 4 cm wood frame. White borders, ready to hang.',
    20),
  ('aluminum',
    'Aluminium dibond',    'Aluminium dibond', 'Aluminum dibond',
    'Impression directe sur dibond 3 mm avec finition mate. Look moderne, durable.',
    'Directe print op 3 mm dibond met matte afwerking. Modern en duurzaam.',
    'Direct print on 3 mm dibond with matte finish. Modern, durable.',
    30),
  ('plexi',
    'Plexiglas brillant',  'Plexiglas glanzend', 'Glossy plexiglass',
    'Tirage sous plexiglas 5 mm avec dos aluminium. Profondeur intense, look galerie.',
    'Print onder plexiglas 5 mm met aluminium achterzijde. Diepe kleuren, galerie-look.',
    'Print under 5 mm plexiglass with aluminum backing. Intense depth, gallery look.',
    40)
on conflict (slug) do nothing;

------------------------------------------------------------------------
-- 2) print_sizes — 5 vaste formaten (S → XXL)
------------------------------------------------------------------------
insert into shop.print_sizes (slug, label, sort_order)
values
  ('s',   'S — 30×45 cm',    10),
  ('m',   'M — 50×75 cm',    20),
  ('l',   'L — 70×100 cm',   30),
  ('xl',  'XL — 90×135 cm',  40),
  ('xxl', 'XXL — 120×180 cm', 50)
on conflict (slug) do nothing;

------------------------------------------------------------------------
-- 3) print_prices — matrix 4×5 = 20 cellen
--   Wordt dynamisch berekend via PL/pgSQL: base-prijs × size-multiplier.
--   ON CONFLICT DO NOTHING zorgt dat herhaling geen errors geeft.
------------------------------------------------------------------------
do $$
declare
  med_id uuid;
  siz_id uuid;
  med_slug text;
  siz_slug text;
  base_cents int;
  multiplier numeric;
  final_cents int;
begin
  for med_slug, base_cents in
    select * from (values
      ('fine_art', 4500),
      ('canvas',   7500),
      ('aluminum', 9500),
      ('plexi',   11500)
    ) as m(slug, base)
  loop
    select id into med_id from shop.print_media where slug = med_slug;
    if med_id is null then continue; end if;

    for siz_slug, multiplier in
      select * from (values
        ('s',   1.0),
        ('m',   2.4),
        ('l',   4.0),
        ('xl',  6.5),
        ('xxl', 10.0)
      ) as s(slug, mult)
    loop
      select id into siz_id from shop.print_sizes where slug = siz_slug;
      if siz_id is null then continue; end if;

      final_cents := round(base_cents * multiplier);

      insert into shop.print_prices (media_id, size_id, price_cents, is_available)
      values (med_id, siz_id, final_cents, true)
      on conflict (media_id, size_id) do nothing;
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';
