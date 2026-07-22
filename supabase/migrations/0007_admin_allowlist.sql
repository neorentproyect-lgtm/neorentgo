-- Admin cerrado por lista de emails (server-side, no auto-promovible)
create table if not exists public.admin_emails (email text primary key);
insert into public.admin_emails (email) values
  ('neorentproyect@gmail.com'),
  ('maxiconsoli.md@gmail.com')
on conflict (email) do nothing;

alter table public.admin_emails enable row level security;
-- Sin políticas: ni anon ni authenticated pueden leerla. Solo la función security-definer.

-- is_admin() ahora se basa en el email del usuario contra la allowlist (no en roles auto-asignables)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_emails a on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;
