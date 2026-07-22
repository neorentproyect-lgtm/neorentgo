-- KYC real: bucket privado para fotos de DNI + columnas + políticas de storage (Ley 25.326)
insert into storage.buckets (id, name, public) values ('kyc', 'kyc', false) on conflict (id) do nothing;

alter table public.validation_requests add column if not exists dni_front text;
alter table public.validation_requests add column if not exists dni_back text;

-- El usuario sube solo a su propia carpeta (path = {user_id}/...)
drop policy if exists kyc_insert on storage.objects;
create policy kyc_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lee sus propias imágenes; el admin lee todas (para validar)
drop policy if exists kyc_select on storage.objects;
create policy kyc_select on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
