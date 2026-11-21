-- Terrain 18 incident recovery. Keep the tables and event history for investigation.
begin;
update private.security_flags set enabled=false where key='admin_email_otp_required';
create or replace function private.admin_assurance_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  with claims as (select coalesce((select auth.jwt()), '{}'::jsonb) as j),
  first_factor as (
    select max((e ->> 'timestamp')::bigint) as at
    from claims, jsonb_array_elements(case when jsonb_typeof(claims.j -> 'amr') = 'array' then claims.j -> 'amr' else '[]'::jsonb end) e
    where coalesce(e ->> 'method', '') not in ('', 'totp', 'phone', 'webauthn', 'mfa/totp', 'mfa/phone', 'mfa/webauthn')
      and coalesce(e ->> 'timestamp', '') ~ '^[0-9]{1,12}$'
  )
  select
    exists (
      select 1 from auth.sessions s, claims
      where claims.j ->> 'session_id' ~ '^[0-9a-fA-F-]{36}$'
        and s.id = (claims.j ->> 'session_id')::uuid
        and s.user_id = (select auth.uid())
        and (s.not_after is null or s.not_after > now())
    )
    and coalesce((select at <= extract(epoch from now()) + 300 and extract(epoch from now()) - at < 30 * 24 * 3600 from first_factor), false)
    and (coalesce((select claims.j ->> 'aal' from claims), '') = 'aal2'
         or (
           not coalesce((select f.enabled from private.security_flags f where f.key = 'admin_mfa_required'), false)
           and not exists (select 1 from auth.mfa_factors f
                           where f.user_id = (select auth.uid()) and f.status = 'verified')
         ));
$$;
revoke all on function private.admin_assurance_ok() from public, anon, authenticated;
commit;
