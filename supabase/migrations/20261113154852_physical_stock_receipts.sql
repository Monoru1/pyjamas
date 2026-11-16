create table public.staff_stock_movements (
  request_id uuid primary key,
  variant_id uuid not null references public.product_variants(id),
  staff_id uuid not null,
  kind text not null check (kind in ('receipt', 'adjustment')),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reason text not null check (length(reason) between 1 and 200),
  request_payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.staff_stock_movements enable row level security;
revoke all on public.staff_stock_movements from public, anon, authenticated;
grant select on public.staff_stock_movements to authenticated;
create policy staff_read_stock_movements on public.staff_stock_movements
  for select to authenticated using ((select public.is_admin()));

create function public.admin_record_stock(
  p_request_id uuid, p_quantity integer, p_reason text, p_variant_id uuid default null,
  p_expected_stock integer default null, p_product_id uuid default null,
  p_size text default null, p_price numeric default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  staff uuid := auth.uid();
  reason text := btrim(p_reason);
  received_size text := btrim(p_size);
  payload jsonb;
  previous public.staff_stock_movements;
  variant uuid := p_variant_id;
  stock_before integer;
  stock_after integer;
begin
  if staff is null or not coalesce(public.is_admin(), false) then
    raise exception 'Staff access required';
  end if;
  if p_request_id is null or p_quantity is null or reason is null or length(reason) not between 1 and 200
     or (p_expected_stock is null and p_quantity <= 0)
     or (p_expected_stock is not null and (p_expected_stock < 0 or p_quantity < 0 or variant is null)) then
    raise exception 'Invalid stock movement';
  end if;

  payload := jsonb_build_array(variant, p_quantity, reason, p_expected_stock, p_product_id, received_size, p_price);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into previous from public.staff_stock_movements where request_id = p_request_id;
  if found then
    if previous.staff_id <> staff or previous.request_payload <> payload then
      raise exception 'Stock request already used';
    end if;
    return previous.variant_id;
  end if;

  if variant is null then
    if received_size is null or length(received_size) not between 1 and 50
       or p_price is null or p_price <= 0 or p_price <> trunc(p_price) then
      raise exception 'Valid size and price required';
    end if;
    perform 1 from public.products where id = p_product_id and deleted_at is null for update;
    if not found then raise exception 'Product unavailable'; end if;
    if exists (select 1 from public.product_variants v where v.product_id = p_product_id
               and v.is_active and lower(v.size_label) = lower(received_size)
               and lower(v.color_name_fr) = 'standard') then
      raise exception 'Receive the existing size';
    end if;
    insert into public.product_variants
      (product_id, sku, size_label, color_name_fr, price, stock_quantity, low_stock_threshold)
    values (p_product_id, 'LMP-' || upper(replace(p_request_id::text, '-', '')), received_size,
            'Standard', p_price, 0, 2)
    returning id into variant;
  end if;

  select v.stock_quantity into stock_before from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = variant and v.is_active and p.deleted_at is null for update of v;
  if not found or (p_expected_stock is not null and p_expected_stock <> stock_before) then
    raise exception 'Stock changed; refresh before retrying';
  end if;
  stock_after := case when p_expected_stock is null then stock_before + p_quantity else p_quantity end;
  update public.product_variants set stock_quantity = stock_after where id = variant;
  insert into public.staff_stock_movements
    (request_id, variant_id, staff_id, kind, stock_before, stock_after, reason, request_payload)
  values (p_request_id, variant, staff, case when p_expected_stock is null then 'receipt' else 'adjustment' end,
          stock_before, stock_after, reason, payload);
  return variant;
end $$;

revoke all on function public.admin_record_stock(uuid,integer,text,uuid,integer,uuid,text,numeric)
  from public, anon, authenticated;
grant execute on function public.admin_record_stock(uuid,integer,text,uuid,integer,uuid,text,numeric)
  to authenticated;

create view public.admin_stock_levels with (security_invoker = true) as
select v.id as variant_id, v.stock_quantity as available,
       coalesce(held.reserved, 0) as reserved,
       coalesce(held.awaiting_handover, 0) as awaiting_handover,
       v.stock_quantity + coalesce(held.reserved, 0) + coalesce(held.awaiting_handover, 0) as physical
from public.product_variants v
left join (
  select variant_id, sum(reserved) as reserved, sum(awaiting_handover) as awaiting_handover
  from (
    select m.variant_id,
      case when m.kind = 'reserve' and a.inventory_state = 'reserved' then m.quantity else 0 end as reserved,
      case when m.kind = 'commit' and a.inventory_state = 'committed'
           and o.status <> 'delivered' then m.quantity else 0 end as awaiting_handover
    from public.inventory_movements m
    join public.payment_attempts a on a.id = m.payment_id
    join public.orders o on o.id = a.order_id
    where m.kind in ('reserve', 'commit')
    union all
    select i.variant_id, 0, i.quantity
    from public.order_items i join public.orders o on o.id = i.order_id
    where o.source not in ('fedapay_live', 'fedapay_sandbox')
      and o.status in ('confirmed', 'preparing', 'ready')
  ) quantities
  group by variant_id
) held on held.variant_id = v.id
where (select public.is_admin());
revoke all on public.admin_stock_levels from public, anon, authenticated;
grant select on public.admin_stock_levels to authenticated;

-- A delivery reference may cover several sizes, but each size is counted once.
create unique index staff_stock_receipt_reference
  on public.staff_stock_movements (variant_id, lower(reason)) where kind = 'receipt';

-- Existing staff permissions still allow price, visibility and zero-stock catalogue drafts.
-- Quantity changes by staff must pass through the audited function.
create function public.guard_staff_stock_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.stock_quantity <> 0 then raise exception 'Use the stock receipt action'; end if;
    elsif new.stock_quantity is distinct from old.stock_quantity then
      raise exception 'Use the stock movement action';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_staff_stock_write() from public, anon, authenticated;
create trigger staff_stock_write_guard before insert or update of stock_quantity
  on public.product_variants for each row execute function public.guard_staff_stock_write();
