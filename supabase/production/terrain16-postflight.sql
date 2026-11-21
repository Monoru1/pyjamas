-- Terrain 16 — READ-ONLY checks right after applying the migrations. All must return true.
select
  has_function_privilege('anon', 'public.consume_checkout_budget(text,text,integer,integer)', 'execute') = false as checkout_budget_private,
  has_function_privilege('authenticated', 'public.consume_checkout_budget(text,text,integer,integer)', 'execute') = false as checkout_budget_not_browser,
  has_function_privilege('service_role', 'public.reserve_checkout_payment(text,integer,uuid,text,jsonb,jsonb,text,bigint,bigint,jsonb,uuid,uuid,bigint)', 'execute')
    and not has_function_privilege('anon', 'public.reserve_checkout_payment(text,integer,uuid,text,jsonb,jsonb,text,bigint,bigint,jsonb,uuid,uuid,bigint)', 'execute')
    and not has_function_privilege('authenticated', 'public.reserve_checkout_payment(text,integer,uuid,text,jsonb,jsonb,text,bigint,bigint,jsonb,uuid,uuid,bigint)', 'execute') as checkout_reservation_server_only,
  has_function_privilege('service_role', 'public.create_order_request_atomic(uuid,text,text,text,text,jsonb)', 'execute') = false as legacy_orders_closed,
  has_function_privilege('anon', 'public.is_admin_account()', 'execute') = false as account_check_not_anon,
  exists (select 1 from pg_trigger where tgname = 'cap_unpaid_reservation') as reservation_30_min,
  (select enabled from private.security_flags where key = 'admin_mfa_required') = false as mfa_switch_still_off,
  not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
              and cmd = 'SELECT' and roles::text like '%public%') as no_public_listing,
  (select array_agg(email order by email) from private.authorized_admin_emails) = array['lamaisondespyjamas@gmail.com', 'sakryad@gmail.com'] as exactly_two_authorised_addresses,
  exists (select 1 from private.admin_accounts where email = 'sakryad@gmail.com') and not exists (
    select 1
    from private.authorized_admin_emails a
    left join auth.users u on u.id = a.reserved_user_id and lower(u.email) = a.email
    left join private.admin_accounts b on b.email = a.email
    where u.id is null or b.user_id is distinct from
      case when u.email_confirmed_at is not null then u.id else null end
  ) as reserved_admin_identities_match_confirmed_bindings,
  not exists (select 1 from public.profiles p where p.is_active and not exists (select 1 from private.admin_accounts b where b.user_id = p.id)) as no_other_active_profile,
  (select pg_get_functiondef('private.admin_assurance_ok()'::regprocedure) like '%auth.sessions%') as session_revocation_checked,
  (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_active') = 'false' as new_profiles_inactive;
