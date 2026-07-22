-- Slice 01b · marketplace real + candidatos (postulaciones)

-- Columnas de display para properties (para render de tarjetas)
alter table public.properties add column if not exists image text;
alter table public.properties add column if not exists rating numeric default 4.7;
alter table public.properties add column if not exists beds int default 0;
alter table public.properties add column if not exists baths int default 1;
alter table public.properties add column if not exists m2 int default 0;
alter table public.properties add column if not exists cochera boolean default false;
alter table public.properties add column if not exists agent text;

-- Candidatos: un inquilino se contacta/postula a una propiedad
create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_id   uuid not null references auth.users(id) on delete cascade,
  message     text,
  status      text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at  timestamptz not null default now(),
  unique (property_id, tenant_id)
);

alter table public.applications enable row level security;

-- El inquilino crea su postulación
drop policy if exists app_insert on public.applications;
create policy app_insert on public.applications for insert with check (auth.uid() = tenant_id);

-- La ve: el propio inquilino, el dueño de la propiedad, o el admin
drop policy if exists app_select on public.applications;
create policy app_select on public.applications for select using (
  auth.uid() = tenant_id
  or public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
);

-- La resuelve (aceptar/rechazar): dueño de la propiedad o admin
drop policy if exists app_update on public.applications;
create policy app_update on public.applications for update using (
  public.is_admin()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
);

alter publication supabase_realtime add table public.applications;
