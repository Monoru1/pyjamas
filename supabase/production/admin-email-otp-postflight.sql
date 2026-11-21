-- Read-only. Expect each check to be true before the owner pilot.
select
  (select enabled = false from private.security_flags where key = 'admin_email_otp_required') as activation_off,
  (select enabled = false from private.security_flags where key = 'admin_mfa_required') as legacy_global_mfa_off,
  (select count(*) = 2 from private.authorized_admin_emails) as two_reserved_identities,
  exists (
    select 1
    from private.admin_accounts a
    join private.authorized_admin_emails r on r.reserved_user_id = a.user_id and r.email = a.email
    join auth.users u on u.id = a.user_id and lower(u.email) = a.email
    where a.email = 'sakryad@gmail.com' and u.email_confirmed_at is not null
  ) as owner_confirmed,
  position('private.admin_email_otp_state()' in pg_get_functiondef('private.admin_assurance_ok()'::regprocedure)) > 0 as shared_assurance,
  not exists (
    select 1 from (values ('anon'), ('authenticated')) as roles(name)
    cross join (values ('public.issue_admin_email_otp(uuid,uuid,uuid,text)'),
      ('public.finish_admin_email_otp_delivery(uuid,uuid,uuid,boolean)'),
      ('public.verify_admin_email_otp(uuid,uuid,text)')) as rpcs(signature)
    where has_function_privilege(roles.name, rpcs.signature, 'execute')
       or not has_function_privilege('service_role', rpcs.signature, 'execute')
  ) as challenges_server_only;
