------------------------------------------------------------------------
-- Storage-bucket voor de webshop-foto's. Apart van de bestaande
-- `photos` bucket (galerij van jp-montreuil) om vermenging te vermijden.
--
-- Bucket = public read (foto's worden via CDN getoond op de boutique).
-- Upload/delete = enkel service-role + authenticated.
------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('shop-photos', 'shop-photos', true)
  on conflict (id) do update set public = true;

-- Public read
drop policy if exists "shop_photos_public_read" on storage.objects;
create policy "shop_photos_public_read" on storage.objects
  for select to public
  using (bucket_id = 'shop-photos');

-- Authenticated upload + update + delete
drop policy if exists "shop_photos_authed_write" on storage.objects;
create policy "shop_photos_authed_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'shop-photos')
  with check (bucket_id = 'shop-photos');
