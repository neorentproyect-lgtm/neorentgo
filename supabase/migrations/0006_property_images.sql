-- Bucket público para fotos de publicaciones (lectura pública, subida autenticada a carpeta propia)
insert into storage.buckets (id, name, public) values ('property-images', 'property-images', true) on conflict (id) do nothing;

drop policy if exists propimg_select on storage.objects;
create policy propimg_select on storage.objects for select using (bucket_id = 'property-images');

drop policy if exists propimg_insert on storage.objects;
create policy propimg_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);
