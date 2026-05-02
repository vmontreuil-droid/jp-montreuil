-- jp-montreuil — Ibook blok (PDF + cover + QR-code) op /a-propos
-- JP kan via /admin/ibook een PDF + cover-foto + QR-code uploaden;
-- bezoekers zien een kaart met de twee thumbnails en een knop om de
-- PDF te bekijken / downloaden.

set search_path = public;

-- Pre-seed rows in site_texts zodat de admin-form ze direct kan editten.
-- Waarden komen leeg, JP vult ze in via /admin/ibook.
insert into public.site_texts (key, value_fr, value_nl, description) values
  (
    'ibook_title',
    'Le livre de Jean-Pierre Montreuil',
    'Het boek van Jean-Pierre Montreuil',
    'Titel boven het ibook-blok op /a-propos'
  ),
  (
    'ibook_description',
    '',
    '',
    'Korte intro-tekst voor het ibook-blok (optioneel)'
  ),
  (
    'ibook_cover_path',
    '',
    '',
    'Storage path naar de cover-afbeelding (bucket: ibook)'
  ),
  (
    'ibook_qr_path',
    '',
    '',
    'Storage path naar de QR-code afbeelding (bucket: ibook)'
  ),
  (
    'ibook_pdf_path',
    '',
    '',
    'Storage path naar het PDF-bestand (bucket: ibook)'
  )
on conflict (key) do nothing;

-- ============================================================================
-- Storage bucket 'ibook' — PUBLIC (PDF moet rechtstreeks deelbaar zijn)
-- Bucket aanmaken in Supabase Dashboard → Storage → New bucket
--   * Name: ibook
--   * Public: YES
-- ============================================================================

create policy "ibook bucket: public read"
  on storage.objects for select
  using (bucket_id = 'ibook');

create policy "ibook bucket: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'ibook' and public.is_admin());

create policy "ibook bucket: admin update"
  on storage.objects for update
  using (bucket_id = 'ibook' and public.is_admin())
  with check (bucket_id = 'ibook' and public.is_admin());

create policy "ibook bucket: admin delete"
  on storage.objects for delete
  using (bucket_id = 'ibook' and public.is_admin());
