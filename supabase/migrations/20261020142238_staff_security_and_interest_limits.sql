-- Separate staff operations from sensitive publishing settings.
create function public.is_manager() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and role in ('super_admin','admin'));
$$;
revoke all on function public.is_manager() from public,anon;
grant execute on function public.is_manager() to authenticated;
alter policy "admin manage settings" on public.settings using ((select public.is_manager())) with check ((select public.is_manager()));
alter policy "staff edit christmas event" on public.christmas_event_config using ((select public.is_manager())) with check ((select public.is_manager()));

-- Disable the historical email-based auto-promotion. Existing accounts are preserved.
create or replace function public.handle_owner_signup() returns trigger language plpgsql security invoker set search_path='' as $$
begin return new; end;
$$;
revoke all on function public.handle_owner_signup() from public,anon,authenticated;

-- Public requests now enter exclusively through a validated server action.
revoke insert on public.christmas_event_requests from anon,authenticated;
create table public.event_request_limits (
 key text primary key,
 requests integer not null check(requests>0),
 expires_at timestamptz not null
);
alter table public.event_request_limits enable row level security;
revoke all on public.event_request_limits from public,anon,authenticated;
grant all on public.event_request_limits to service_role;
create function public.submit_christmas_request(p_name text,p_phone text,p_email text,p_places int,p_fingerprint text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare bucket text; attempts int;
begin
 perform pg_advisory_xact_lock(hashtextextended('christmas-interest-request-limit',0));
 if not exists(select 1 from public.christmas_event_config where event_key='noel-2026' and requests_open) then raise exception 'Requests closed'; end if;
 if p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid fingerprint'; end if;
 bucket:=floor(extract(epoch from now())/900)::bigint::text;
 delete from public.event_request_limits where expires_at<now();
 insert into public.event_request_limits values('global:'||bucket,1,now()+interval '30 minutes')
 on conflict(key) do update set requests=event_request_limits.requests+1 returning requests into attempts;
 if attempts>40 then raise exception 'Rate limit'; end if;
 insert into public.event_request_limits values(p_fingerprint||':'||bucket,1,now()+interval '30 minutes')
 on conflict(key) do update set requests=event_request_limits.requests+1 returning requests into attempts;
 if attempts>3 then raise exception 'Rate limit'; end if;
 insert into public.christmas_event_requests(event_key,full_name,phone,email,requested_places,consent_at,status)
 values('noel-2026',p_name,p_phone,nullif(p_email,''),p_places,now(),'requested');
end;
$$;
revoke all on function public.submit_christmas_request(text,text,text,int,text) from public,anon,authenticated;
grant execute on function public.submit_christmas_request(text,text,text,int,text) to service_role;

-- Audit actions without copying customer details or secrets into the log payload.
create function public.audit_staff_operation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.activity_logs(actor_id,action,entity_type,entity_id)
 values(auth.uid(),lower(TG_OP),TG_TABLE_NAME,nullif(to_jsonb(new)->>'id','')::uuid);
 return new;
end;
$$;
revoke all on function public.audit_staff_operation() from public,anon,authenticated;
create trigger audit_product_changes after insert or update on public.products for each row execute function public.audit_staff_operation();
create trigger audit_stock_changes after update on public.product_variants for each row execute function public.audit_staff_operation();
create trigger audit_site_changes after update on public.settings for each row execute function public.audit_staff_operation();
create trigger audit_media_changes after update on public.media_assets for each row execute function public.audit_staff_operation();
