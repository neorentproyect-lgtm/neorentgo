-- PANÓPTICO: audit log (triggers) + procedencia + identidad real para admin

-- 1) Audit log append-only
create table if not exists public.audit_events (
  id          bigserial primary key,
  actor       uuid,
  actor_label text,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);
alter table public.audit_events enable row level security;
drop policy if exists audit_admin_select on public.audit_events;
create policy audit_admin_select on public.audit_events for select using (public.is_admin());
alter publication supabase_realtime add table public.audit_events;

create or replace function public.actor_label(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select '@' || username from public.profiles where id = uid), 'sistema');
$$;

-- 2) Procedencia
alter table public.profiles   add column if not exists source text not null default 'real';
alter table public.properties add column if not exists source text not null default 'real';

-- 3) Triggers de auditoría
create or replace function public.audit_profiles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.id, '@'||new.username, 'user.created', 'profile', new.id, jsonb_build_object('name', new.name, 'source', new.source));
  elsif (tg_op = 'UPDATE') then
    if (new.roles is distinct from old.roles) then
      insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
      values (new.id, '@'||new.username, 'user.roles_changed', 'profile', new.id, jsonb_build_object('roles', new.roles));
    end if;
    if (new.validated is distinct from old.validated) then
      insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
      values (new.id, '@'||new.username, case when new.validated then 'user.validated' else 'user.unvalidated' end, 'profile', new.id, '{}'::jsonb);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles after insert or update on public.profiles for each row execute function public.audit_profiles();

create or replace function public.audit_validation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.user_id, public.actor_label(new.user_id), 'validation.submitted', 'validation_request', new.id, jsonb_build_object('name', new.name, 'has_docs', (new.dni_front is not null or new.dni_back is not null)));
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.user_id, public.actor_label(new.user_id), 'validation.'||new.status, 'validation_request', new.id, '{}'::jsonb);
  end if;
  return new;
end; $$;
drop trigger if exists trg_audit_validation on public.validation_requests;
create trigger trg_audit_validation after insert or update on public.validation_requests for each row execute function public.audit_validation();

create or replace function public.audit_properties() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.owner_id, public.actor_label(new.owner_id), 'property.created', 'property', new.id, jsonb_build_object('title', new.title, 'source', new.source));
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.owner_id, public.actor_label(new.owner_id), 'property.'||new.status, 'property', new.id, jsonb_build_object('title', new.title));
  end if;
  return new;
end; $$;
drop trigger if exists trg_audit_properties on public.properties;
create trigger trg_audit_properties after insert or update on public.properties for each row execute function public.audit_properties();

create or replace function public.audit_applications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.tenant_id, public.actor_label(new.tenant_id), 'application.created', 'application', new.id, jsonb_build_object('property_id', new.property_id));
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.audit_events(actor, actor_label, action, entity, entity_id, meta)
    values (new.tenant_id, public.actor_label(new.tenant_id), 'application.'||new.status, 'application', new.id, '{}'::jsonb);
  end if;
  return new;
end; $$;
drop trigger if exists trg_audit_applications on public.applications;
create trigger trg_audit_applications after insert or update on public.applications for each row execute function public.audit_applications();

-- 4) handle_new_user setea procedencia según el proveedor
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text; prov text;
begin
  uname := split_part(new.email, '@', 1);
  if exists (select 1 from public.profiles where username = uname) then
    uname := uname || '-' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;
  prov := coalesce(new.raw_app_meta_data->>'provider', 'email');
  insert into public.profiles (id, username, name, roles, source)
  values (new.id, uname,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', uname),
    '{}',
    case when prov = 'google' then 'real' else 'legacy' end)
  on conflict (id) do nothing;
  return new;
end; $$;

-- 5) Backfill de seeds/legacy existentes
update public.profiles set source = 'seed'   where username in ('lucas', 'juanp', 'administer');
update public.profiles set source = 'legacy' where username = 'maxiprueba';
update public.properties set source = 'seed' where owner_id = 'a662b18f-d952-4673-b0d8-22f5f2031f8d';

-- 6) RPC de usuarios enriquecidos (solo admin, server-side)
create or replace function public.admin_users()
returns table (id uuid, username text, name text, email text, provider text, roles text[], validated boolean, source text, created_at timestamptz, last_sign_in timestamptz, props_count bigint, apps_count bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.name, u.email::text,
    coalesce(u.raw_app_meta_data->>'provider', 'email') as provider,
    p.roles, p.validated, p.source, p.created_at, u.last_sign_in_at,
    (select count(*) from public.properties pr where pr.owner_id = p.id) as props_count,
    (select count(*) from public.applications a where a.tenant_id = p.id) as apps_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;
grant execute on function public.admin_users() to authenticated;
