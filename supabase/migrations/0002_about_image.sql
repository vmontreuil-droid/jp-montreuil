-- Voeg image_path toe aan about_sections — pad naar foto in 'works' bucket,
-- typisch onder 'about/<filename>'.

alter table public.about_sections
  add column if not exists image_path text;
