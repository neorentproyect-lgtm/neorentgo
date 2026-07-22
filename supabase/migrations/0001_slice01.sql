-- Neo Rent Go · Slice 01 · esquema con RLS por usuario + rol admin
-- Seguro desde el día 1: cada usuario opera lo suyo; el admin aprueba todo.

-- Perfiles (1:1 con auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  name       text not null,
  roles      text[] not null default '{}',
  validated  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ¿el usuario actual es admin?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and 'admin' = any(p.roles));
$$;

-- Solicitudes de validación de identidad (DNI)
create table if not exists public.validation_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  dni text, cuil text, nacimiento text, origen text, residencia text,
  status     text not null default 'pending' check (status in ('pending','validated','rejected')),
  created_at timestamptz not null default now()
);

-- Propiedades
create table if not exists public.properties (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  type       text not null default 'vivienda' check (type in ('vivienda','comercial','industrial')),
  zona text, address text, price numeric,
  status     text not null default 'pending' check (status in ('pending','active','rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.validation_requests enable row level security;
alter table public.properties enable row level security;

-- profiles: cada uno el suyo; admin ve/edita todo
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (auth.uid() = id or public.is_admin());

-- validation_requests: dueño inserta/lee lo suyo; admin lee y resuelve
drop policy if exists vr_select on public.validation_requests;
create policy vr_select on public.validation_requests for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists vr_insert on public.validation_requests;
create policy vr_insert on public.validation_requests for insert with check (auth.uid() = user_id);
drop policy if exists vr_update on public.validation_requests;
create policy vr_update on public.validation_requests for update using (public.is_admin());

-- properties: activas visibles para todos; dueño gestiona la suya; admin habilita
drop policy if exists pr_select on public.properties;
create policy pr_select on public.properties for select using (status = 'active' or auth.uid() = owner_id or public.is_admin());
drop policy if exists pr_insert on public.properties;
create policy pr_insert on public.properties for insert with check (auth.uid() = owner_id);
drop policy if exists pr_update on public.properties;
create policy pr_update on public.properties for update using (auth.uid() = owner_id or public.is_admin());

-- Realtime para el panel /administer
alter publication supabase_realtime add table public.validation_requests;
alter publication supabase_realtime add table public.properties;
