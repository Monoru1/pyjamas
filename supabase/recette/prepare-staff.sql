-- Run ONLY in oxhymanjibveayhcaqvj after creating/inviting a test Auth user securely.
-- No password or copied production identity is required here.
-- Set app.recette_staff_user_id to that Auth UUID in the same SQL session.
do $$
declare uid uuid:=nullif(current_setting('app.recette_staff_user_id',true),'')::uuid;
begin
 if uid is null then raise exception 'Set app.recette_staff_user_id to the approved test Auth user UUID';end if;
 if not exists(select 1 from auth.users where id=uid) then raise exception 'Create the test user in Supabase Auth first';end if;
 insert into public.profiles(id,full_name,role,is_active) values(uid,'Équipe de recette','admin',true)
 on conflict(id) do update set role='admin',is_active=true;
end $$;
