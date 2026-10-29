-- Additive migration. Run on an isolated acceptance DB before production approval.
-- stock_quantity is AVAILABLE stock: reserve now, commit once on payment, release only
-- on provider-confirmed expiry. FedaPay canceled/declined are retryable, not final.
alter table public.orders add column payment_state text not null default 'unpaid'
 check(payment_state in ('unpaid','pending_payment','paid','failed','cancelled','expired','refunded','partially_refunded'));
alter table public.orders add column delivery jsonb;
alter table public.orders add column needs_attention boolean not null default false;
alter table public.payment_attempts drop constraint payment_attempts_environment_check;
alter table public.payment_attempts add constraint payment_attempts_environment_check check(environment in ('sandbox','live'));
alter table public.payment_attempts drop constraint payment_attempts_provider_id_key;
alter table public.payment_attempts add constraint payment_provider_environment_unique unique(environment,provider_id);
alter table public.payment_attempts add column order_id uuid unique references public.orders(id);
alter table public.payment_attempts add column inventory_state text not null default 'none' check(inventory_state in ('none','reserved','committed','released'));
alter table public.payment_attempts add column merchant_account_id bigint;
alter table public.payment_attempts add column initialization_started_at timestamptz;
alter table public.payment_attempts add column next_reconcile_at timestamptz not null default now();
alter table public.payment_attempts add column last_error text;
create index payment_reconcile_due_idx on public.payment_attempts(environment,next_reconcile_at) where order_id is not null;
create index orders_payment_date_idx on public.orders(payment_state,created_at desc);
create table public.inventory_movements(
 id bigint generated always as identity primary key,
 payment_id uuid not null references public.payment_attempts(id),
 variant_id uuid not null references public.product_variants(id),
 kind text not null check(kind in ('reserve','commit','release','reacquire')),
 quantity int not null check(quantity>0),
 created_at timestamptz not null default now(), unique(payment_id,variant_id,kind)
);
create index inventory_variant_idx on public.inventory_movements(variant_id,created_at);
create table public.notification_jobs(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 kind text not null check(kind in ('customer_email','admin_email')),
 status text not null default 'pending' check(status in ('pending','sending','sent','blocked')),
 attempts int not null default 0, next_attempt_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, first_delivery_at timestamptz, last_error text, sent_at timestamptz,
 created_at timestamptz not null default now(), unique(order_id,kind)
);
create index notifications_due_idx on public.notification_jobs(status,next_attempt_at);
alter table public.inventory_movements enable row level security;
alter table public.notification_jobs enable row level security;
revoke all on public.inventory_movements,public.notification_jobs from public,anon,authenticated;
grant all on public.inventory_movements,public.notification_jobs to service_role;
grant usage,select on sequence public.inventory_movements_id_seq to service_role;
grant select on public.inventory_movements,public.notification_jobs to authenticated;
create policy "staff inventory history" on public.inventory_movements for select to authenticated using((select public.is_admin()));
create policy "staff notification history" on public.notification_jobs for select to authenticated using((select public.is_admin()));
-- Fulfillment is exposed only through the guarded transition RPC, never table writes.
revoke insert,update,delete on public.orders,public.order_items from anon,authenticated;
-- Explicit legacy column grants, if present, survive a table-level REVOKE.
do $$ declare t text; cols text; begin
 foreach t in array array['orders','order_items'] loop
  select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name=t;
  execute format('revoke insert (%s), update (%s) on public.%I from public,anon,authenticated',cols,cols,t);
 end loop;
end $$;

create function public.create_shop_payment(p_key uuid,p_hash text,p_customer jsonb,p_lines jsonb,p_environment text,p_account bigint,p_shipping bigint)
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
revoke all on function public.create_shop_payment(uuid,text,jsonb,jsonb,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.create_shop_payment(uuid,text,jsonb,jsonb,text,bigint,bigint) to service_role;

create function public.apply_shop_payment(p_id uuid,p_provider_id bigint,p_amount bigint,p_account bigint,p_environment text,p_status text,p_event text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare payment public.payment_attempts%rowtype; item record; target text:=p_status; attention boolean:=false;
begin
 select * into payment from public.payment_attempts where id=p_id for update;
 if not found or payment.order_id is null or payment.environment<>p_environment
  or payment.provider_id is distinct from p_provider_id or payment.amount_xof<>p_amount
  or payment.merchant_account_id is distinct from p_account then raise exception 'Payment mismatch'; end if;
 if target not in ('pending','paid','failed','cancelled','expired','refunded','partially_refunded') then raise exception 'Invalid state'; end if;
 if payment.status='refunded' then target:='refunded';
 elsif payment.status='partially_refunded' and target not in ('refunded','partially_refunded') then target:='partially_refunded';
 elsif payment.status='paid' and target not in ('refunded','partially_refunded') then target:='paid'; end if;
 insert into public.payment_events(payment_id,external_event,new_status) values(p_id,p_event,target) on conflict(external_event) do nothing;
 if not found then return; end if;
 perform 1 from public.orders where id=payment.order_id for update;
 -- Stable variant locks for every inventory operation, matching checkout/admin locks.
 if target='paid' and payment.inventory_state='released' then
  for item in select v.id,v.stock_quantity,oi.quantity from public.order_items oi join public.product_variants v on v.id=oi.variant_id where oi.order_id=payment.order_id order by v.id for update of v loop
   if item.stock_quantity<item.quantity then attention:=true; end if;
  end loop;
  if not attention then
   update public.product_variants v set stock_quantity=v.stock_quantity-oi.quantity from public.order_items oi where oi.order_id=payment.order_id and oi.variant_id=v.id;
   insert into public.inventory_movements(payment_id,variant_id,kind,quantity) select p_id,variant_id,'reacquire',quantity from public.order_items where order_id=payment.order_id on conflict do nothing;
  end if;
 end if;
 if target='paid' and payment.inventory_state<>'committed' and not attention then
  insert into public.inventory_movements(payment_id,variant_id,kind,quantity) select p_id,variant_id,'commit',quantity from public.order_items where order_id=payment.order_id on conflict do nothing;
  update public.payment_attempts set inventory_state='committed' where id=p_id;
 elsif target='expired' and payment.inventory_state='reserved' then
  perform v.id from public.product_variants v join public.order_items oi on oi.variant_id=v.id where oi.order_id=payment.order_id order by v.id for update of v;
  update public.product_variants v set stock_quantity=v.stock_quantity+oi.quantity from public.order_items oi where oi.order_id=payment.order_id and oi.variant_id=v.id;
  insert into public.inventory_movements(payment_id,variant_id,kind,quantity) select p_id,variant_id,'release',quantity from public.order_items where order_id=payment.order_id on conflict do nothing;
  update public.payment_attempts set inventory_state='released' where id=p_id;
 end if;
 -- Refunds require a physical return decision; never restock automatically.
 if target in ('refunded','partially_refunded') then attention:=true; end if;
 update public.payment_attempts set status=target,last_error=case when target in ('pending','failed','cancelled') and expires_at<now() then 'reservation_overdue' else null end,updated_at=now(),next_reconcile_at=now()+case when target in ('pending','failed','cancelled') then interval '10 minutes' else interval '24 hours' end where id=p_id;
 update public.orders set payment_state=case when target='pending' then 'pending_payment' else target end,
 needs_attention=needs_attention or attention where id=payment.order_id;
 if payment.status<>target or attention then
  insert into public.order_status_history(order_id,old_status,new_status,note) select id,status,status,'FedaPay: '||target||case when attention then ' — intervention requise' else '' end from public.orders where id=payment.order_id;
 end if;
 if target='paid' then
  insert into public.notification_jobs(order_id,kind) values(payment.order_id,'customer_email'),(payment.order_id,'admin_email') on conflict do nothing;
 end if;
end; $$;
revoke all on function public.apply_shop_payment(uuid,bigint,bigint,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_shop_payment(uuid,bigint,bigint,bigint,text,text,text) to service_role;

-- Keep legacy WhatsApp stock handling. Paid checkout stock is already reserved.
create or replace function public.admin_transition_order(p_order_id uuid,p_expected_status public.order_status,p_new_status public.order_status)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders%rowtype;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Staff access required'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status is distinct from p_expected_status then raise exception 'Order changed; refresh before retrying'; end if;
 if o.source not in ('fedapay_live','fedapay_sandbox') then perform public.admin_update_order_status(p_order_id,p_new_status); return; end if;
 if o.status=p_new_status then return; end if;
 if o.payment_state<>'paid' or o.needs_attention then raise exception 'Provider-confirmed payment required'; end if;
 if not ((o.status='pending' and p_new_status in ('confirmed','cancelled')) or (o.status='confirmed' and p_new_status in ('preparing','cancelled')) or (o.status='preparing' and p_new_status in ('ready','cancelled')) or (o.status='ready' and p_new_status in ('delivered','cancelled'))) then raise exception 'Invalid transition'; end if;
 update public.orders set status=p_new_status,needs_attention=(p_new_status='cancelled') where id=p_order_id;
 insert into public.order_status_history(order_id,old_status,new_status,changed_by,note) values(p_order_id,o.status,p_new_status,auth.uid(),case when p_new_status='cancelled' then 'Annulation logistique: remboursement et retour à traiter séparément.' else 'Paiement confirmé par FedaPay.' end);
end; $$;
revoke all on function public.admin_transition_order(uuid,public.order_status,public.order_status) from public,anon;
grant execute on function public.admin_transition_order(uuid,public.order_status,public.order_status) to authenticated;

create function public.claim_notification_job() returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare job public.notification_jobs%rowtype;
begin
 select * into job from public.notification_jobs where
 (status='pending' and next_attempt_at<=now()) or (status='sending' and lease_until<now())
 order by next_attempt_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.notification_jobs set status='sending',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' where id=job.id returning * into job;
 return to_jsonb(job);
end; $$;
revoke all on function public.claim_notification_job() from public,anon,authenticated;
grant execute on function public.claim_notification_job() to service_role;
