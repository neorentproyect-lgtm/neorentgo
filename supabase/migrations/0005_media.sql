-- Medios por propiedad: varias fotos (y soporte de video hasta 2 min a futuro)
create table if not exists public.property_media (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url         text not null,
  kind        text not null default 'image' check (kind in ('image','video')),
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.property_media enable row level security;

-- Se ven los medios si la propiedad es visible (activa) o sos dueño/admin
drop policy if exists media_select on public.property_media;
create policy media_select on public.property_media for select using (
  exists (select 1 from public.properties p where p.id = property_id and (p.status = 'active' or p.owner_id = auth.uid() or public.is_admin()))
);

-- Sube medios el dueño de la propiedad o el admin
drop policy if exists media_insert on public.property_media;
create policy media_insert on public.property_media for insert to authenticated with check (
  exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or public.is_admin()))
);

alter publication supabase_realtime add table public.property_media;
