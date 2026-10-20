-- Keep the existing WhatsApp-request model, but commit all its rows atomically.
alter table public.orders add column request_key uuid unique;
alter table public.orders add column request_hash text;
create function public.create_order_request_atomic(p_key uuid,p_hash text,p_name text,p_phone text,p_comment text,p_lines jsonb)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.orders%rowtype; customer uuid; new_order public.orders%rowtype; wanted record; variant record; items jsonb:='[]'; total numeric:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into existing from public.orders where request_key=p_key for update;
 if found then
  if existing.request_hash<>p_hash then raise exception 'Idempotency conflict'; end if;
  return existing.order_number;
 end if;
 if char_length(btrim(p_name)) not between 2 and 80 or p_phone !~ '^[0-9]{8,15}$' or char_length(coalesce(p_comment,''))>500 then raise exception 'Invalid customer'; end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'Invalid basket'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer:'||p_phone,0));
 if (select count(*) from public.orders o join public.customers c on c.id=o.customer_id where c.whatsapp_phone=p_phone and o.source='website' and o.status='pending' and o.created_at>now()-interval '15 minutes')>=2 then raise exception 'Rate limit'; end if;
 for wanted in select (line->>'variantId')::uuid as id,sum((line->>'quantity')::int) as qty from jsonb_array_elements(p_lines) line group by 1 order by 1 loop
  if wanted.qty is null or wanted.qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
  select v.*,p.name_fr into variant from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=wanted.id and v.is_active and p.is_active and p.deleted_at is null and p.currency_code='XOF' for update of v;
  if not found or variant.stock_quantity<wanted.qty or variant.price<=0 then raise exception 'Stock unavailable'; end if;
  total:=total+variant.price*wanted.qty;
  items:=items||jsonb_build_array(jsonb_build_object('product_id',variant.product_id,'variant_id',variant.id,'sku',variant.sku,'product_name',variant.name_fr,'color_name',variant.color_name_fr,'size_label',variant.size_label,'quantity',wanted.qty,'unit_price',variant.price,'line_total',variant.price*wanted.qty));
 end loop;
 -- Do not overwrite an existing customer's identity merely because a public request claims their phone.
 select id into customer from public.customers where whatsapp_phone=p_phone order by created_at limit 1;
 if customer is null then
  insert into public.customers(full_name,phone,whatsapp_phone) values(p_name,p_phone,p_phone) returning id into customer;
 end if;
 insert into public.orders(customer_id,status,currency_code,subtotal,discount_total,total,customer_note,source,request_key,request_hash)
 values(customer,'pending','XOF',total,0,total,nullif(p_comment,''),'website',p_key,p_hash) returning * into new_order;
 insert into public.order_items(order_id,product_id,variant_id,sku,product_name,color_name,size_label,quantity,unit_price,line_total)
 select new_order.id,(item->>'product_id')::uuid,(item->>'variant_id')::uuid,item->>'sku',item->>'product_name',item->>'color_name',item->>'size_label',(item->>'quantity')::int,(item->>'unit_price')::numeric,(item->>'line_total')::numeric from jsonb_array_elements(items) item;
 insert into public.order_status_history(order_id,new_status,note) values(new_order.id,'pending','Demande créée depuis le site. Aucun paiement confirmé.');
 return new_order.order_number;
end;
$$;
revoke all on function public.create_order_request_atomic(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_order_request_atomic(uuid,text,text,text,text,jsonb) to service_role;

-- Prevent an employee's stale form from applying a transition against a newer order state.
create function public.admin_transition_order(p_order_id uuid,p_expected_status public.order_status,p_new_status public.order_status)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare current_status public.order_status;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Staff access required'; end if;
 select status into current_status from public.orders where id=p_order_id for update;
 if not found or current_status is distinct from p_expected_status then raise exception 'Order changed; refresh before retrying'; end if;
 perform public.admin_update_order_status(p_order_id,p_new_status);
end;
$$;
revoke all on function public.admin_transition_order(uuid,public.order_status,public.order_status) from public,anon;
grant execute on function public.admin_transition_order(uuid,public.order_status,public.order_status) to authenticated;
revoke execute on function public.admin_update_order_status(uuid,public.order_status) from authenticated;
