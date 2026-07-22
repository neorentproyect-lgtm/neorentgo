-- Crea el perfil automáticamente cuando entra un usuario nuevo (Google o manual).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  uname := split_part(new.email, '@', 1);
  if exists (select 1 from public.profiles where username = uname) then
    uname := uname || '-' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;
  insert into public.profiles (id, username, name, roles)
  values (new.id, uname, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', uname), '{}')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
