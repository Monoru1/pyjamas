-- Canonical commercial prices are product_variants.price, including promotions.
-- base_price becomes a derived display summary when active variants exist.
create function public.sync_product_price_summary() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare pid uuid; cheapest numeric;
begin
 pid:=case when TG_OP='DELETE' then old.product_id else new.product_id end;
 select min(price) into cheapest from public.product_variants where product_id=pid and is_active;
 if cheapest is not null then update public.products set base_price=cheapest where id=pid and base_price is distinct from cheapest; end if;
 if TG_OP='UPDATE' and old.product_id<>new.product_id then
  select min(price) into cheapest from public.product_variants where product_id=old.product_id and is_active;
  if cheapest is not null then update public.products set base_price=cheapest where id=old.product_id and base_price is distinct from cheapest; end if;
 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger sync_variant_price_summary after insert or delete or update of price,is_active,product_id on public.product_variants for each row execute function public.sync_product_price_summary();
create function public.guard_product_price_summary() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare cheapest numeric;
begin
 select min(price) into cheapest from public.product_variants where product_id=new.id and is_active;
 if cheapest is not null then new.base_price:=cheapest; end if;
 return new;
end $$;
create trigger guard_derived_product_price before update of base_price on public.products for each row execute function public.guard_product_price_summary();
revoke all on function public.sync_product_price_summary(),public.guard_product_price_summary() from public,anon,authenticated;
-- Changes only derived summaries, never a variant price or historical order item.
update public.products p set base_price=x.price from (select product_id,min(price) price from public.product_variants where is_active group by product_id)x where p.id=x.product_id and p.base_price is distinct from x.price;

create function public.quote_shop_basket(p_lines jsonb,p_shipping bigint) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare wanted record; variant record; items jsonb:='[]'; total bigint:=0;
begin
 if p_shipping is null or p_shipping<0 or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'Invalid basket'; end if;
 for wanted in select (x->>'variantId')::uuid id,sum((x->>'quantity')::int) qty from jsonb_array_elements(p_lines)x group by 1 order by 1 loop
  if wanted.qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
  select v.*,p.name_fr into variant from public.product_variants v join public.products p on p.id=v.product_id where v.id=wanted.id and v.is_active and p.is_active and p.deleted_at is null and p.currency_code='XOF';
  if not found or variant.stock_quantity<wanted.qty or variant.price<=0 or trunc(variant.price)<>variant.price then raise exception 'Stock unavailable'; end if;
  total:=total+variant.price::bigint*wanted.qty;
  items:=items||jsonb_build_array(jsonb_build_object('variantId',variant.id,'quantity',wanted.qty,'unitPrice',variant.price,'name',variant.name_fr,'maxStock',variant.stock_quantity));
 end loop;
 return jsonb_build_object('amount_xof',total+p_shipping,'shipping_xof',p_shipping,'currency','XOF','items',items);
end $$;
revoke all on function public.quote_shop_basket(jsonb,bigint) from public;
grant execute on function public.quote_shop_basket(jsonb,bigint) to anon,authenticated,service_role;

create or replace view public.product_catalog with (security_invoker=true) as  SELECT p.id,
    p.category_id,
    p.slug,
    p.name_fr,
    p.name_en,
    p.description_fr,
    p.description_en,
    p.base_price,
    p.compare_at_price,
    p.currency_code,
    p.is_active,
    p.is_featured,
    p.is_new,
    p.sort_order,
    p.seo_title_fr,
    p.seo_title_en,
    p.seo_description_fr,
    p.seo_description_en,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    c.slug AS category_slug,
    c.name_fr AS category_name_fr,
    c.name_en AS category_name_en,
    COALESCE(sum(v.stock_quantity), 0::bigint)::integer AS total_stock,
    min(v.price) AS min_variant_price,
    max(v.price) AS max_variant_price,
    pi.url AS primary_image_url,
    COALESCE(( SELECT array_agg(col.slug ORDER BY col.slug) AS array_agg
           FROM product_collections pc
             JOIN collections col ON col.id = pc.collection_id
          WHERE pc.product_id = p.id), ARRAY[]::text[]) AS collection_slugs,
    (select case when cheapest.compare_at_price>cheapest.price then cheapest.compare_at_price else null end from public.product_variants cheapest where cheapest.product_id=p.id and cheapest.is_active order by cheapest.price,cheapest.id limit 1) AS min_variant_compare_at_price
   FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, c.slug, c.name_fr, c.name_en, pi.url;

create function public.create_shop_payment(p_key uuid,p_hash text,p_customer jsonb,p_lines jsonb,p_environment text,p_account bigint,p_shipping bigint,p_expected_items jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous public.payment_attempts%rowtype; payment public.payment_attempts%rowtype;
 new_order public.orders%rowtype; wanted record; variant record; item jsonb; items jsonb:='[]'; total bigint:=0; customer_id uuid;
begin
 if p_environment not in ('sandbox','live') or p_account is null or p_account<1 or p_shipping is null or p_shipping<0 then raise exception 'Invalid configuration'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into previous from public.payment_attempts where idempotency_key=p_key for update;
 if found then
  if previous.request_hash<>p_hash or previous.environment<>p_environment or previous.merchant_account_id is distinct from p_account then raise exception 'Idempotency conflict'; end if;
  return to_jsonb(previous)||jsonb_build_object('creator',false);
 end if;
 if char_length(coalesce(p_customer->>'name','')) not between 2 and 80
  or coalesce(p_customer->>'phone','') !~ '^22901[0-9]{8}$'
  or char_length(coalesce(p_customer->>'address','')) not between 8 and 300
  or char_length(coalesce(p_customer->>'city','')) not between 2 and 80
  or char_length(coalesce(p_customer->>'email','')) not between 3 and 254
  or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'Invalid checkout'; end if;
 -- Contact/global budgets are consumed by the server before this transaction.
 for wanted in select (line->>'variantId')::uuid id,sum((line->>'quantity')::int) qty
  from jsonb_array_elements(p_lines) line group by 1 order by 1 loop
  if wanted.qty is null or wanted.qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
  select v.*,p.name_fr into variant from public.product_variants v join public.products p on p.id=v.product_id
   where v.id=wanted.id and v.is_active and p.is_active and p.deleted_at is null and p.currency_code='XOF' for update of v;
  if not found or variant.stock_quantity<wanted.qty or variant.price<=0 or trunc(variant.price)<>variant.price then raise exception 'Stock unavailable'; end if;
  total:=total+variant.price::bigint*wanted.qty;
  items:=items||jsonb_build_array(jsonb_build_object('variantId',variant.id,'productId',variant.product_id,'quantity',wanted.qty,'unitPrice',variant.price,'name',variant.name_fr,'sku',variant.sku,'size',variant.size_label,'color',variant.color_name_fr));
 end loop;
 if p_expected_items is null or
  (select jsonb_agg(jsonb_build_object('variantId',x->>'variantId','quantity',(x->>'quantity')::int,'unitPrice',(x->>'unitPrice')::numeric) order by x->>'variantId') from jsonb_array_elements(items)x)
  is distinct from
  (select jsonb_agg(jsonb_build_object('variantId',x->>'variantId','quantity',(x->>'quantity')::int,'unitPrice',(x->>'unitPrice')::numeric) order by x->>'variantId') from jsonb_array_elements(p_expected_items)x)
 then raise exception 'PRICE_CHANGED'; end if;
 -- Snapshot customer data per order, never overwrite another person's identity by phone.
 insert into public.customers(full_name,phone,whatsapp_phone,email,city,country)
 values(p_customer->>'name',p_customer->>'phone',p_customer->>'phone',p_customer->>'email',p_customer->>'city','BJ') returning id into customer_id;
 insert into public.orders(order_number,customer_id,status,source,currency_code,subtotal,discount_total,total,customer_note,delivery,payment_state)
 values('MDP-'||upper(replace(p_key::text,'-','')),customer_id,'pending','fedapay_'||p_environment,'XOF',total,0,total+p_shipping,p_customer->>'comment',
 jsonb_build_object('name',p_customer->>'name','phone',p_customer->>'phone','email',p_customer->>'email','address',p_customer->>'address','city',p_customer->>'city','country','BJ','shipping_xof',p_shipping),'pending_payment') returning * into new_order;
 insert into public.payment_attempts(idempotency_key,request_hash,environment,customer,items,amount_xof,order_id,inventory_state,merchant_account_id,expires_at)
 values(p_key,p_hash,p_environment,p_customer,items,total+p_shipping,new_order.id,'reserved',p_account,now()+interval '24 hours') returning * into payment;
 for item in select * from jsonb_array_elements(items) loop
  insert into public.order_items(order_id,product_id,variant_id,sku,product_name,color_name,size_label,quantity,unit_price,line_total)
  values(new_order.id,(item->>'productId')::uuid,(item->>'variantId')::uuid,item->>'sku',item->>'name',item->>'color',item->>'size',(item->>'quantity')::int,(item->>'unitPrice')::numeric,(item->>'unitPrice')::numeric*(item->>'quantity')::int);
  update public.product_variants set stock_quantity=stock_quantity-(item->>'quantity')::int where id=(item->>'variantId')::uuid;
  insert into public.inventory_movements(payment_id,variant_id,kind,quantity) values(payment.id,(item->>'variantId')::uuid,'reserve',(item->>'quantity')::int);
 end loop;
 insert into public.order_status_history(order_id,new_status,note) values(new_order.id,'pending','pending_payment: stock réservé, en attente de FedaPay.');
 return to_jsonb(payment)||jsonb_build_object('creator',true,'order_number',new_order.order_number);
end; $$;
revoke all on function public.create_shop_payment(uuid,text,jsonb,jsonb,text,bigint,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.create_shop_payment(uuid,text,jsonb,jsonb,text,bigint,bigint,jsonb) to service_role;

-- Explicit owner authorization of ONE financial intent, inserted only after approval.
create table public.live_test_authorizations(
 id uuid primary key default gen_random_uuid(), staff_user_id uuid not null references auth.users(id),
 merchant_account_id bigint not null check(merchant_account_id>0),
 amount_xof bigint not null check(amount_xof between 1 and 1000),
 expires_at timestamptz not null, revoked_at timestamptz,
 payment_id uuid unique references public.payment_attempts(id), created_at timestamptz not null default now()
);
create index live_test_staff_idx on public.live_test_authorizations(staff_user_id);
alter table public.live_test_authorizations enable row level security;
revoke all on public.live_test_authorizations from public,anon,authenticated;
grant all on public.live_test_authorizations to service_role;
create policy "server manages explicit test authorizations" on public.live_test_authorizations to service_role using(true) with check(true);
create function public.create_authorized_live_test_payment(p_authorization uuid,p_staff uuid,p_key uuid,p_hash text,p_customer jsonb,p_lines jsonb,p_account bigint,p_shipping bigint,p_expected_items jsonb,p_ceiling bigint)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare permission public.live_test_authorizations%rowtype; payment jsonb;
begin
 select * into permission from public.live_test_authorizations where id=p_authorization for update;
 if not found or permission.revoked_at is not null or permission.expires_at<=now() or permission.staff_user_id<>p_staff or permission.merchant_account_id<>p_account or permission.amount_xof>p_ceiling then raise exception 'Owner authorization required'; end if;
 if not exists(select 1 from public.profiles where id=p_staff and is_active and role in ('super_admin','admin','employee')) then raise exception 'Staff access required'; end if;
 payment:=public.create_shop_payment(p_key,p_hash,p_customer,p_lines,'live',p_account,p_shipping,p_expected_items);
 if (payment->>'amount_xof')::bigint<>permission.amount_xof or (payment->>'amount_xof')::bigint>p_ceiling then raise exception 'Approved amount mismatch'; end if;
 if permission.payment_id is not null and permission.payment_id<>(payment->>'id')::uuid then raise exception 'Authorization already used'; end if;
 update public.live_test_authorizations set payment_id=(payment->>'id')::uuid where id=p_authorization;
 return payment;
end $$;
revoke all on function public.create_authorized_live_test_payment(uuid,uuid,uuid,text,jsonb,jsonb,bigint,bigint,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.create_authorized_live_test_payment(uuid,uuid,uuid,text,jsonb,jsonb,bigint,bigint,jsonb,bigint) to service_role;
