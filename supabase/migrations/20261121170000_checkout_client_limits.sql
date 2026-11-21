-- Terrain 15 · SEC-001: unpaid reservations could lock the stock and one connection could
-- exhaust the shop-wide checkout ceiling. Additive only: no existing row, function or grant
-- is modified. Only a keyed HMAC of the connection is stored, never the raw address.
alter table public.payment_attempts add column if not exists client_fingerprint text
  check (client_fingerprint is null or client_fingerprint ~ '^[a-f0-9]{64}$');
create index if not exists payment_attempts_client_reserved_idx on public.payment_attempts(client_fingerprint)
  where client_fingerprint is not null and inventory_state = 'reserved';

-- Returns 'ok' or the reason for refusal. Order matters: a client already over its own
-- budget is refused BEFORE touching the shared ceiling, so it cannot starve other customers.
create function public.consume_checkout_budget(p_client text, p_subject text, p_units integer, p_max_open_units integer)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  window_at timestamptz := date_bin(interval '5 minutes', clock_timestamp(), timestamptz '2026-01-01 00:00:00+00');
  allowed integer;
  held bigint;
begin
  if p_client is null or p_client !~ '^[a-f0-9]{64}$' or p_subject is null or p_subject !~ '^[a-f0-9]{64}$'
     or p_units is null or p_units not between 0 and 200
     or p_max_open_units is null or p_max_open_units not between 1 and 1000 then
    raise exception 'Invalid checkout budget request';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('checkout-client:' || p_client, 0));

  insert into public.order_request_limits(subject, window_start, attempts) values ('client:' || p_client, window_at, 1)
  on conflict (subject, window_start) do update set attempts = public.order_request_limits.attempts + 1
    where public.order_request_limits.attempts < 12 returning attempts into allowed;
  if allowed is null then return 'client_rate'; end if;

  -- Units this connection already holds in unpaid, still-open reservations.
  if p_units > 0 then
    select coalesce(sum((line ->> 'quantity')::int), 0) into held
    from public.payment_attempts a cross join lateral jsonb_array_elements(a.items) line
    where a.client_fingerprint = p_client and a.inventory_state = 'reserved'
      and a.status in ('pending', 'failed', 'cancelled') and a.expires_at > now();
    if held + p_units > p_max_open_units then return 'client_units'; end if;
  end if;

  allowed := null;
  insert into public.order_request_limits(subject, window_start, attempts) values (p_subject, window_at, 1)
  on conflict (subject, window_start) do update set attempts = public.order_request_limits.attempts + 1
    where public.order_request_limits.attempts < 5 returning attempts into allowed;
  if allowed is null then return 'subject_rate'; end if;

  allowed := null;
  insert into public.order_request_limits(subject, window_start, attempts) values ('global', window_at, 1)
  on conflict (subject, window_start) do update set attempts = public.order_request_limits.attempts + 1
    where public.order_request_limits.attempts < 120 returning attempts into allowed;
  if allowed is null then return 'global_rate'; end if;

  delete from public.order_request_limits where window_start < window_at - interval '1 hour';
  return 'ok';
end;
$$;
revoke all on function public.consume_checkout_budget(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_checkout_budget(text, text, integer, integer) to service_role;
