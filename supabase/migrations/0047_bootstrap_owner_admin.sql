-- Only the verified store owner can bootstrap the back-office account.
create or replace function public.handle_owner_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'alice@lamaisonduconfort.com' then
    insert into public.profiles (id, full_name, email, role, is_active)
    values (new.id, 'La Maison des Pyjamas', new.email, 'super_admin', true)
    on conflict (id) do update
      set email = excluded.email,
          role = 'super_admin',
          is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists on_owner_signup on auth.users;
create trigger on_owner_signup
after insert on auth.users
for each row execute function public.handle_owner_signup();
