-- Additive. One order = same reference, lines and amounts in Supabase, the back-office and e-mails.
-- No financial function is redefined; no historical order_number is rewritten.

-- 1. Readable public reference for new paid-checkout orders (MDP-YYYYMMDD-XXXXXX),
--    same format as legacy requests. create_shop_payment keeps supplying its long
--    idempotency-derived value; it is replaced before insert and returned by RETURNING.
create or replace function public.generate_order_number() returns trigger
language plpgsql set search_path = public, extensions as $$
declare candidate text; tries int := 0;
begin
  if new.order_number is null or new.order_number = ''
    or (new.source like 'fedapay\_%' and new.order_number ~ '^MDP-[0-9A-F]{32}$') then
    loop
      candidate := 'MDP-' || to_char(now(), 'YYYYMMDD') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      exit when not exists (select 1 from public.orders where order_number = candidate);
      tries := tries + 1;
      if tries > 5 then raise exception 'Order reference unavailable'; end if;
    end loop;
    new.order_number := candidate;
  end if;
  return new;
end;
$$;

-- 2. Commercial snapshot: name, SKU, colour, size, unit price and line total already live
--    on order_items. Only the photo was read from the live catalogue.
alter table public.order_items add column image_url text;
create function public.snapshot_order_item_image() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.image_url is null and new.product_id is not null then
    select url into new.image_url from public.product_images
    where product_id = new.product_id order by is_primary desc, sort_order, id limit 1;
  end if;
  return new;
end;
$$;
revoke all on function public.snapshot_order_item_image() from public, anon, authenticated;
create trigger order_item_image_snapshot before insert on public.order_items
  for each row execute function public.snapshot_order_item_image();
update public.order_items i set image_url = (
  select url from public.product_images p where p.product_id = i.product_id
  order by is_primary desc, sort_order, id limit 1)
where i.image_url is null and i.product_id is not null;

-- 3. Delivery tracking. status='sent' only means "accepted by Resend".
alter table public.notification_jobs
  add column recipient text,
  add column delivery_status text check (delivery_status in
    ('delivery_delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed')),
  add column delivery_updated_at timestamptz,
  add column delivered_at timestamptz;
create index notification_provider_message_idx on public.notification_jobs(provider_message_id)
  where provider_message_id is not null;

-- Demonstration sends: never an order, a payment or a stock movement.
create table public.notification_demo_sends(
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  kind text not null,
  recipient text not null,
  staff_user_id uuid not null,
  provider_message_id text,
  delivery_status text check (delivery_status in
    ('delivery_delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed')),
  delivery_updated_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now()
);
create index notification_demo_message_idx on public.notification_demo_sends(provider_message_id)
  where provider_message_id is not null;

-- Signed provider events: identifiers and timestamps only, no recipient or content.
create table public.notification_provider_events(
  event_id text primary key,
  provider_message_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index notification_provider_events_message_idx
  on public.notification_provider_events(provider_message_id, occurred_at);

alter table public.notification_demo_sends enable row level security;
alter table public.notification_provider_events enable row level security;
revoke all on public.notification_demo_sends, public.notification_provider_events from public, anon, authenticated;
grant all on public.notification_demo_sends, public.notification_provider_events to service_role;
grant select on public.notification_demo_sends, public.notification_provider_events to authenticated;
create policy "staff demo send history" on public.notification_demo_sends
  for select to authenticated using ((select public.is_admin()));
create policy "staff provider event history" on public.notification_provider_events
  for select to authenticated using ((select public.is_admin()));

create function public.email_delivery_rank(p_state text) returns int
language sql immutable set search_path = public, pg_temp as $$
  select case p_state when 'delivery_delayed' then 1 when 'delivered' then 2
    when 'bounced' then 3 when 'complained' then 3 when 'failed' then 3 when 'suppressed' then 3 end;
$$;

-- Derives the delivery state from every stored event of a message, so duplicates and
-- out-of-order deliveries converge on the same result. Also called after a send to
-- absorb an event that overtook the persistence of the provider identifier.
create function public.refresh_email_delivery(p_message_id text) returns text
language plpgsql security invoker set search_path = public, pg_temp as $$
declare best record; touched int := 0; n int;
begin
  select replace(event_type, 'email.', '') state, occurred_at into best
  from public.notification_provider_events
  where provider_message_id = p_message_id
    and public.email_delivery_rank(replace(event_type, 'email.', '')) is not null
  order by public.email_delivery_rank(replace(event_type, 'email.', '')) desc, occurred_at desc
  limit 1;
  if not found then return null; end if;
  update public.notification_jobs set delivery_status = best.state, delivery_updated_at = best.occurred_at,
    delivered_at = coalesce(delivered_at, (select min(occurred_at) from public.notification_provider_events
      where provider_message_id = p_message_id and event_type = 'email.delivered'))
  where provider_message_id = p_message_id;
  get diagnostics n = row_count; touched := touched + n;
  update public.notification_demo_sends set delivery_status = best.state, delivery_updated_at = best.occurred_at,
    delivered_at = coalesce(delivered_at, (select min(occurred_at) from public.notification_provider_events
      where provider_message_id = p_message_id and event_type = 'email.delivered'))
  where provider_message_id = p_message_id;
  get diagnostics n = row_count; touched := touched + n;
  return case when touched > 0 then best.state end;
end;
$$;

create function public.record_email_delivery_event(p_event_id text, p_message_id text, p_type text, p_at timestamptz)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 200
    or p_message_id is null or char_length(p_message_id) not between 1 and 200
    or p_type !~ '^email\.[a-z_]{1,40}$' or p_at is null then raise exception 'Invalid provider event'; end if;
  insert into public.notification_provider_events(event_id, provider_message_id, event_type, occurred_at)
  values (p_event_id, p_message_id, p_type, p_at) on conflict (event_id) do nothing;
  if not found then return 'duplicate'; end if;
  return coalesce(public.refresh_email_delivery(p_message_id), 'recorded');
end;
$$;

-- 4. Staff retry: atomic with its journal entry. The worker still enforces consent,
--    recipient allow-list, payment state and the provider idempotency window.
create function public.staff_retry_notification(p_job_id uuid, p_staff uuid) returns boolean
language plpgsql security invoker set search_path = public, pg_temp as $$
declare job public.notification_jobs%rowtype;
begin
  select * into job from public.notification_jobs where id = p_job_id for update;
  if not found or p_staff is null or job.status not in ('pending', 'blocked')
    or job.kind not in ('admin_email', 'customer_email', 'staff_email_new', 'staff_email_failed',
      'staff_email_ready', 'staff_email_delivered', 'customer_email_failed', 'customer_email_ready',
      'customer_email_delivered')
    -- Beyond the provider idempotency window a resend could duplicate an accepted message.
    or coalesce(job.last_error, '') = 'delivery_window_exceeded'
    or job.first_delivery_at < now() - interval '12 hours'
    or exists (select 1 from public.activity_logs where entity_id = p_job_id
      and action = 'notification_retry' and created_at > now() - interval '1 minute')
  then return false; end if;
  update public.notification_jobs set status = 'pending', lease_until = null, lease_token = null,
    next_attempt_at = now(), attempts = case when status = 'blocked' then 0 else attempts end
  where id = p_job_id;
  insert into public.activity_logs(actor_id, action, entity_type, entity_id)
  values (p_staff, 'notification_retry', 'notification_job', p_job_id);
  return true;
end;
$$;

revoke all on function public.email_delivery_rank(text), public.refresh_email_delivery(text),
  public.record_email_delivery_event(text, text, text, timestamptz),
  public.staff_retry_notification(uuid, uuid) from public, anon, authenticated;
grant execute on function public.email_delivery_rank(text), public.refresh_email_delivery(text),
  public.record_email_delivery_event(text, text, text, timestamptz),
  public.staff_retry_notification(uuid, uuid) to service_role;
grant execute on function public.email_delivery_rank(text) to authenticated;

-- 5. Back-office list: one row per order, searchable, with its notification summary.
create view public.admin_order_list with (security_invoker = true) as
select o.id, o.order_number, o.created_at, o.status, o.payment_state, o.source, o.needs_attention,
  o.total, o.currency_code,
  coalesce(o.delivery->>'name', c.full_name) as client_name,
  coalesce(o.delivery->>'phone', c.whatsapp_phone, c.phone) as client_phone,
  coalesce((select sum(i.quantity) from public.order_items i where i.order_id = o.id), 0)::int as item_count,
  n.notification_total, n.notification_failed, n.notification_waiting, n.notification_accepted,
  n.notification_delivered,
  lower(concat_ws(' ', o.order_number, o.delivery->>'name', c.full_name, o.delivery->>'phone',
    c.phone, c.whatsapp_phone, o.delivery->>'email', c.email)) as search_text
from public.orders o
left join public.customers c on c.id = o.customer_id
left join lateral (
  select count(*)::int as notification_total,
    count(*) filter (where j.status = 'blocked'
      or public.email_delivery_rank(j.delivery_status) = 3)::int as notification_failed,
    count(*) filter (where j.status in ('pending', 'sending'))::int as notification_waiting,
    count(*) filter (where j.status = 'sent'
      and coalesce(public.email_delivery_rank(j.delivery_status), 1) = 1)::int as notification_accepted,
    count(*) filter (where j.status = 'sent' and j.delivery_status = 'delivered')::int as notification_delivered
  from public.notification_jobs j where j.order_id = o.id
) n on true;
revoke all on public.admin_order_list from public, anon, authenticated;
grant select on public.admin_order_list to authenticated, service_role;
