-- Shared request budgets survive serverless restarts. No raw phone/IP is stored.
create table public.order_request_limits (
  subject text not null,
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 121),
  primary key (subject, window_start)
);
alter table public.order_request_limits enable row level security;
revoke all on public.order_request_limits from public,anon,authenticated;
grant select,insert,update,delete on public.order_request_limits to service_role;
create policy "service manages request budgets" on public.order_request_limits to service_role using (true) with check (true);
create function public.consume_order_request_budget(p_subject text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare window_at timestamptz := date_bin(interval '5 minutes',clock_timestamp(),timestamptz '2026-01-01 00:00:00+00');
  allowed integer;
begin
  if p_subject is null or p_subject !~ '^[a-f0-9]{64}$' then raise exception 'Invalid fingerprint'; end if;
  -- Global ceiling bounds DB work even if anonymous callers rotate claimed phone numbers.
  insert into public.order_request_limits(subject,window_start,attempts) values('global',window_at,1)
  on conflict(subject,window_start) do update set attempts=public.order_request_limits.attempts+1
    where public.order_request_limits.attempts<120 returning attempts into allowed;
  if allowed is null then return false; end if;
  allowed:=null;
  insert into public.order_request_limits(subject,window_start,attempts) values(p_subject,window_at,1)
  on conflict(subject,window_start) do update set attempts=public.order_request_limits.attempts+1
    where public.order_request_limits.attempts<5 returning attempts into allowed;
  delete from public.order_request_limits where window_start<window_at-interval '1 hour';
  return allowed is not null;
end;
$$;
revoke all on function public.consume_order_request_budget(text) from public,anon,authenticated;
grant execute on function public.consume_order_request_budget(text) to service_role;
-- Align Storage's enforced image size with the administration's 5 MiB limit.
update storage.buckets set file_size_limit=5242880 where id in ('site-assets','product-images');
