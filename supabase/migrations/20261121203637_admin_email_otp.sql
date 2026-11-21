-- Application email verification bound to a Supabase password session.
-- Activation is a separate operation after an end-to-end owner pilot.
insert into private.security_flags(key, enabled)
values ('admin_email_otp_required', false) on conflict (key) do nothing;

create table private.admin_email_otp_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  challenge_id uuid,
  digest text check (digest ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz,
  accepted_at timestamptz,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  verified_at timestamptz
);
create index admin_email_otp_sessions_user_idx on private.admin_email_otp_sessions(user_id);
create table private.admin_email_otp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  session_id uuid not null,
  event text not null check (event in ('issued', 'accepted', 'delivery_failed', 'rejected', 'verified')),
  created_at timestamptz not null default clock_timestamp()
);
create index admin_email_otp_events_user_idx on private.admin_email_otp_events(user_id, event, created_at);
revoke all on private.admin_email_otp_sessions, private.admin_email_otp_events from public, anon, authenticated, service_role;

-- Check database evidence, including the original password AMR and a still-live Auth session.
-- Use the bound and confirmed address, not a destination supplied by the browser or user metadata.
create function private.admin_email_otp_recipient(p_user uuid, p_session uuid) returns text
language sql stable set search_path = '' as $$
  select a.email
  from private.admin_accounts a
  join private.authorized_admin_emails reservation
    on reservation.email = a.email and reservation.reserved_user_id = a.user_id
  join auth.users u on u.id = a.user_id and lower(u.email) = a.email and u.email_confirmed_at is not null
  join auth.sessions s on s.user_id = a.user_id and s.id = p_session
  where a.user_id = p_user
    and (s.not_after is null or s.not_after > now())
    and s.created_at > now() - interval '30 days'
    and exists (select 1 from auth.mfa_amr_claims m
                where m.session_id = s.id and m.authentication_method = 'password'
                  and m.created_at > now() - interval '30 days');
$$;
revoke all on function private.admin_email_otp_recipient(uuid, uuid) from public, anon, authenticated, service_role;

-- Shared by browser navigation and the RLS assurance function. The legacy path is available
-- only for the technical owner before global activation and outside the pilot.
create function private.admin_email_otp_state() returns text
language sql stable set search_path = '' as $$
  with identity as (
    select auth.uid() as user_id,
      case when auth.jwt()->>'session_id' ~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'
           then (auth.jwt()->>'session_id')::uuid end as session_id
  )
  select case
    when r.email is null then 'denied'
    when o.verified_at is not null then 'verified'
    when r.email <> 'sakryad@gmail.com' or o.session_id is not null
      or (select enabled from private.security_flags where key = 'admin_email_otp_required') is distinct from false
      then 'required'
    else 'legacy'
  end
  from identity i
  cross join lateral (select private.admin_email_otp_recipient(i.user_id, i.session_id) as email) r
  left join private.admin_email_otp_sessions o on o.user_id = i.user_id and o.session_id = i.session_id;
$$;
revoke all on function private.admin_email_otp_state() from public, anon, authenticated, service_role;

-- Preserve the previously deployed assurance rule for sessions outside the pilot during rollout.
-- Replacing the original function in place keeps all existing policies and RPCs guarded.
create or replace function private.admin_assurance_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select case private.admin_email_otp_state()
    when 'verified' then true
    when 'legacy' then
      coalesce(auth.jwt()->>'aal', '') = 'aal2'
      or ((select enabled from private.security_flags where key = 'admin_mfa_required') is not true
          and not exists (select 1 from auth.mfa_factors f
                          where f.user_id = auth.uid() and f.status = 'verified'))
    else false
  end;
$$;
revoke all on function private.admin_assurance_ok() from public, anon, authenticated, service_role;

create function public.admin_email_otp_status() returns text
language sql stable security definer set search_path = '' as $$
  select private.admin_email_otp_state();
$$;
revoke all on function public.admin_email_otp_status() from public, anon, authenticated, service_role;
grant execute on function public.admin_email_otp_status() to authenticated;

-- Only the application server can issue, complete delivery, or verify challenges. Serialize
-- per administrator, including requests from different devices, for the rate and attempt limits.
create function public.issue_admin_email_otp(p_user uuid, p_session uuid, p_challenge uuid, p_digest text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  recipient text;
  current_challenge private.admin_email_otp_sessions%rowtype;
  issued_at timestamptz;
begin
  if p_user is null or p_session is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-email-otp:' || p_user::text, 0));
  recipient := private.admin_email_otp_recipient(p_user, p_session);
  if recipient is null then return null; end if;

  delete from private.admin_email_otp_events e
    where e.user_id = p_user and e.created_at < clock_timestamp() - interval '30 days';
  delete from private.admin_email_otp_sessions o
    where o.user_id = p_user and not exists (
      select 1 from auth.sessions s where s.id = o.session_id
        and s.created_at > now() - interval '30 days'
        and (s.not_after is null or s.not_after > now())
    );
  insert into private.admin_email_otp_sessions(session_id, user_id) values (p_session, p_user)
    on conflict (session_id) do nothing;
  select * into current_challenge from private.admin_email_otp_sessions where session_id = p_session;
  if current_challenge.user_id <> p_user or current_challenge.verified_at is not null
    or p_challenge is null or p_digest is null or p_digest !~ '^[0-9a-f]{64}$' then return null; end if;

  issued_at := clock_timestamp();
  if exists (select 1 from private.admin_email_otp_events e where e.user_id = p_user
              and e.event = 'issued' and e.created_at > issued_at - interval '1 minute')
      or (select count(*) from private.admin_email_otp_events e where e.user_id = p_user
          and e.event = 'issued' and e.created_at > issued_at - interval '1 hour') >= 5 then
    return null;
  end if;
  if current_challenge.digest = p_digest then return jsonb_build_object('retry', true); end if;

  update private.admin_email_otp_sessions
    set challenge_id = p_challenge, digest = p_digest, expires_at = issued_at + interval '5 minutes',
        accepted_at = null, failed_attempts = 0
    where session_id = p_session;
  insert into private.admin_email_otp_events(user_id, session_id, event) values (p_user, p_session, 'issued');
  return jsonb_build_object('recipient', recipient);
end;
$$;

create function public.finish_admin_email_otp_delivery(p_user uuid, p_session uuid, p_challenge uuid, p_accepted boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_session is null or p_accepted is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-email-otp:' || p_user::text, 0));
  if private.admin_email_otp_recipient(p_user, p_session) is null then return false; end if;
  update private.admin_email_otp_sessions
    set accepted_at = case when p_accepted then clock_timestamp() end,
        digest = case when p_accepted then digest end
    where user_id = p_user and session_id = p_session and challenge_id = p_challenge
      and digest is not null and accepted_at is null and verified_at is null and expires_at > clock_timestamp();
  if not found then return false; end if;
  insert into private.admin_email_otp_events(user_id, session_id, event)
    values (p_user, p_session, case when p_accepted then 'accepted' else 'delivery_failed' end);
  return p_accepted;
end;
$$;

create function public.verify_admin_email_otp(p_user uuid, p_session uuid, p_digest text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_challenge private.admin_email_otp_sessions%rowtype;
  matched boolean;
begin
  if p_user is null or p_session is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-email-otp:' || p_user::text, 0));
  if private.admin_email_otp_recipient(p_user, p_session) is null then return false; end if;
  select * into current_challenge from private.admin_email_otp_sessions
    where session_id = p_session and user_id = p_user;
  if not found or current_challenge.verified_at is not null or current_challenge.digest is null
    or current_challenge.accepted_at is null or current_challenge.expires_at <= clock_timestamp()
    or current_challenge.failed_attempts >= 5 then return false; end if;

  matched := coalesce(current_challenge.digest = p_digest, false);
  update private.admin_email_otp_sessions
    set verified_at = case when matched then clock_timestamp() end,
        digest = case when matched or failed_attempts = 4 then null else digest end,
        failed_attempts = failed_attempts + case when matched then 0 else 1 end
    where session_id = p_session;
  insert into private.admin_email_otp_events(user_id, session_id, event)
    values (p_user, p_session, case when matched then 'verified' else 'rejected' end);
  return matched;
end;
$$;

revoke all on function public.issue_admin_email_otp(uuid, uuid, uuid, text),
  public.finish_admin_email_otp_delivery(uuid, uuid, uuid, boolean), public.verify_admin_email_otp(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.issue_admin_email_otp(uuid, uuid, uuid, text),
  public.finish_admin_email_otp_delivery(uuid, uuid, uuid, boolean), public.verify_admin_email_otp(uuid, uuid, text)
  to service_role;
