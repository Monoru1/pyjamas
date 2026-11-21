-- Terrain 16 — persistent administrator session, bounded and revocable (Supabase Auth only).
-- An administrative right now also requires, at the database level:
--   1. a session that still exists in auth.sessions (sign-out / revocation is effective at once
--      for every RLS-protected read or write, without waiting for the access token to expire);
--   2. a primary authentication (password, e-mail OTP, recovery) at most 30 days old, read from
--      the JWT `amr` claim: token refreshes and TOTP re-entries never extend it;
--   3. AAL2 once private.security_flags.admin_mfa_required is on (unchanged).
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
    and (not coalesce((select f.enabled from private.security_flags f where f.key = 'admin_mfa_required'), false)
         or coalesce((select claims.j ->> 'aal' from claims), '') = 'aal2');
$$;
revoke all on function private.admin_assurance_ok() from public, anon, authenticated;
