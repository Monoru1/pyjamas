-- Terrain 16 — READ-ONLY checks to run (recette, then production) BEFORE the Terrain 16 migrations.
-- No write, no secret, no password. Expected results are noted under each query.

-- 1. Accounts holding a profile, with their role and number of verified second factors.
--    Expected: exactly the two authorised holders active (super_admin / admin), nothing else active.
select p.id, p.email, p.role, p.is_active, u.created_at, u.last_sign_in_at,
       (select count(*) from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified') as verified_factors
from public.profiles p left join auth.users u on u.id = p.id
order by p.is_active desc, p.role, p.created_at;

-- 2. The two authorised identities in Supabase Auth. Expected: 2 rows, distinct ids, both confirmed.
--    A missing or unconfirmed one must be created/confirmed by its holder (no password is set here).
select lower(u.email) as email, u.id, u.email_confirmed_at is not null as confirmed, u.last_sign_in_at
from auth.users u where lower(u.email) in ('sakryad@gmail.com', 'lamaisondespyjamas@gmail.com');

-- 2b. Active profiles OUTSIDE these two identities: the migration deactivates them (never deletes).
select p.id, p.email, p.role from public.profiles p left join auth.users u on u.id = p.id
where p.is_active and coalesce(lower(u.email), '') not in ('sakryad@gmail.com', 'lamaisondespyjamas@gmail.com');

-- 3. Auth users without a profile (they hold no right; listed for awareness only).
select count(*) as users_without_profile from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);

-- 4. Storage policies on storage.objects. Note the exact names of the public SELECT policies:
--    the migration drops "public read product images bucket" and "christmas videos public read".
select policyname, cmd, roles::text, qual from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;

-- 5. Who may still call the legacy unpaid-order RPC. Expected after migration: no row.
select grantee, privilege_type from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'create_order_request_atomic';

-- 6. Unpaid reservations currently holding stock (they keep their original deadline).
select count(*) as open_reservations, min(expires_at) as first_deadline, max(expires_at) as last_deadline
from public.payment_attempts where inventory_state = 'reserved';

-- 7. Migration history: the six Terrain 15/16 versions must not be present yet.
select version, name from supabase_migrations.schema_migrations where version >= '20261121' order by version;
