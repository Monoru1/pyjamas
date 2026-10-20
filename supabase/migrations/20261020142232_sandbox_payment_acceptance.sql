-- SANDBOX ONLY. No commercial order, real stock decrement or paid event ticket is created.
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  idempotency_key uuid not null unique,
  request_hash text not null,
  environment text not null default 'sandbox' check (environment='sandbox'),
  purpose text not null default 'shop' check (purpose='shop'),
  customer jsonb not null,
  items jsonb not null,
  amount_xof bigint not null check (amount_xof > 0),
  provider_id bigint unique,
  checkout_url text,
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','expired','refunded','partially_refunded')),
  expires_at timestamptz not null default now()+interval '30 minutes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_pending_idx on public.payment_attempts(status,updated_at);
create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid not null references public.payment_attempts(id),
  external_event text not null unique,
  new_status text not null,
  created_at timestamptz not null default now()
);
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.payment_attempts,public.payment_events from public,anon,authenticated;
grant select on public.payment_attempts,public.payment_events to authenticated;
grant all on public.payment_attempts,public.payment_events to service_role;
grant usage,select on sequence public.payment_events_id_seq to service_role;
create policy "staff read sandbox payments" on public.payment_attempts for select to authenticated using ((select public.is_admin()));
create policy "staff read sandbox payment events" on public.payment_events for select to authenticated using ((select public.is_admin()));

create function public.create_sandbox_payment(p_key uuid,p_hash text,p_customer jsonb,p_lines jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  previous public.payment_attempts%rowtype;
  variant record;
  wanted record;
  items jsonb := '[]';
  total bigint := 0;
  held bigint;
  new_payment public.payment_attempts%rowtype;
begin
  -- Serialize the idempotency key, including when the row does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into previous from public.payment_attempts where idempotency_key=p_key for update;
  if found then
    if previous.request_hash<>p_hash then raise exception 'Idempotency conflict'; end if;
    if previous.expires_at<=now() or previous.status<>'pending' then raise exception 'Payment closed'; end if;
    return to_jsonb(previous)||jsonb_build_object('creator',false);
  end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'Invalid lines'; end if;
  -- Stable lock order prevents deadlocks for baskets sharing multiple variants.
  for wanted in select (line->>'variantId')::uuid as id,sum((line->>'quantity')::int) as qty
    from jsonb_array_elements(p_lines) line group by 1 order by 1
  loop
    if wanted.qty is null or wanted.qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
    select v.id,v.sku,v.product_id,v.price,v.stock_quantity,p.name_fr into variant
      from public.product_variants v join public.products p on p.id=v.product_id
      where v.id=wanted.id and v.is_active and p.is_active and p.deleted_at is null and p.currency_code='XOF'
      for update of v;
    if not found or variant.price<=0 or trunc(variant.price)<>variant.price then raise exception 'Unavailable article'; end if;
    select coalesce(sum((line->>'quantity')::int),0) into held
      from public.payment_attempts a cross join lateral jsonb_array_elements(a.items) line
      where a.expires_at>now() and a.status in ('pending','paid') and line->>'variantId'=wanted.id::text;
    if variant.stock_quantity-held<wanted.qty then raise exception 'Insufficient stock'; end if;
    total:=total+variant.price::bigint*wanted.qty;
    items:=items||jsonb_build_array(jsonb_build_object('variantId',wanted.id,'quantity',wanted.qty,'unitPrice',variant.price,'name',variant.name_fr,'sku',variant.sku));
  end loop;
  insert into public.payment_attempts(idempotency_key,request_hash,customer,items,amount_xof)
    values(p_key,p_hash,p_customer,items,total) returning * into new_payment;
  return to_jsonb(new_payment)||jsonb_build_object('creator',true);
end;
$$;
revoke all on function public.create_sandbox_payment(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_sandbox_payment(uuid,text,jsonb,jsonb) to service_role;

create function public.apply_sandbox_payment(p_id uuid,p_provider_id bigint,p_amount bigint,p_status text,p_event text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare payment public.payment_attempts%rowtype;
begin
  select * into payment from public.payment_attempts where id=p_id for update;
  if not found or payment.provider_id is distinct from p_provider_id or payment.amount_xof<>p_amount then raise exception 'Payment mismatch'; end if;
  if p_status not in ('pending','paid','failed','cancelled','expired','refunded','partially_refunded') then raise exception 'Invalid state'; end if;
  -- Paid/refunded records cannot be reverted by a delayed pending/failed notification.
  if payment.status='refunded' then p_status:='refunded';
  elsif payment.status='partially_refunded' and p_status not in ('refunded','partially_refunded') then p_status:='partially_refunded';
  elsif payment.status='paid' and p_status not in ('refunded','partially_refunded') then p_status:='paid'; end if;
  insert into public.payment_events(payment_id,external_event,new_status) values(p_id,p_event,p_status) on conflict(external_event) do nothing;
  if not found then return; end if;
  update public.payment_attempts set status=p_status,updated_at=now() where id=p_id;
end;
$$;
revoke all on function public.apply_sandbox_payment(uuid,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.apply_sandbox_payment(uuid,bigint,bigint,text,text) to service_role;

-- Closing the UI alone did not protect direct Data API inserts. Enforce closure in RLS too.
alter policy "event guests request places" on public.christmas_event_requests
with check (status='requested' and staff_notes is null and requested_places between 1 and 8
  and consent_at between now()-interval '5 minutes' and now()
  and exists(select 1 from public.christmas_event_config c where c.event_key=christmas_event_requests.event_key and c.requests_open));
