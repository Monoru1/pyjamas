-- Public checkout data only enters through the validated Edge Function.
-- Admin status changes are atomic: stock is reserved when an order is accepted.

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status public.order_status
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Commande introuvable';
  end if;

  if v_order.status = p_new_status then
    return;
  end if;

  if not (
    (v_order.status = 'pending' and p_new_status in ('confirmed', 'cancelled')) or
    (v_order.status = 'confirmed' and p_new_status in ('preparing', 'cancelled')) or
    (v_order.status = 'preparing' and p_new_status in ('ready', 'cancelled')) or
    (v_order.status = 'ready' and p_new_status in ('delivered', 'cancelled'))
  ) then
    raise exception 'Transition de statut non autorisée';
  end if;

  if p_new_status = 'confirmed' then
    for v_item in
      select oi.variant_id, oi.quantity, pv.stock_quantity, pv.sku
      from public.order_items oi
      join public.product_variants pv on pv.id = oi.variant_id
      where oi.order_id = p_order_id
      order by oi.variant_id
      for update of pv
    loop
      if v_item.stock_quantity < v_item.quantity then
        raise exception 'Stock insuffisant pour %', v_item.sku;
      end if;

      update public.product_variants
      set stock_quantity = stock_quantity - v_item.quantity
      where id = v_item.variant_id;
    end loop;
  elsif p_new_status = 'cancelled' and v_order.status in ('confirmed', 'preparing', 'ready') then
    update public.product_variants pv
    set stock_quantity = pv.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id = pv.id;
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id;

  insert into public.order_status_history (order_id, old_status, new_status, changed_by, note)
  values (p_order_id, v_order.status, p_new_status, auth.uid(), null);
end;
$$;

revoke all on function public.admin_update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.admin_update_order_status(uuid, public.order_status) to authenticated;
