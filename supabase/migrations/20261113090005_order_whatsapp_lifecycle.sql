alter table public.notification_jobs drop constraint notification_jobs_kind_check;
alter table public.notification_jobs add constraint notification_jobs_kind_check
  check (kind in ('customer_email', 'admin_email', 'customer_whatsapp',
    'staff_whatsapp_new', 'customer_whatsapp_failed', 'customer_whatsapp_ready',
    'customer_whatsapp_delivered'));

create or replace function public.queue_consented_order_whatsapp()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  notification_kind text;
begin
  if new.order_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    notification_kind := 'staff_whatsapp_new';
  elsif new.status is distinct from old.status and new.customer->>'whatsappUpdates' = 'true' then
    notification_kind := case new.status
      when 'paid' then 'customer_whatsapp'
      when 'failed' then case when new.customer->>'whatsappTracking' = 'true' then 'customer_whatsapp_failed' end
    end;
  end if;
  if notification_kind is not null then
    insert into public.notification_jobs(order_id, kind)
    values (new.order_id, notification_kind) on conflict (order_id, kind) do nothing;
  end if;
  return new;
end;
$$;

create trigger new_order_staff_whatsapp after insert on public.payment_attempts
  for each row execute function public.queue_consented_order_whatsapp();

create function public.queue_consented_order_fulfillment_whatsapp()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if exists (
    select 1 from public.payment_attempts
    where order_id = new.id and customer->>'whatsappUpdates' = 'true'
      and customer->>'whatsappTracking' = 'true'
  ) then
    insert into public.notification_jobs(order_id, kind)
    values (new.id, 'customer_whatsapp_' || new.status::text)
    on conflict (order_id, kind) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.queue_consented_order_fulfillment_whatsapp() from public, anon, authenticated;

create trigger order_fulfillment_whatsapp after update of status on public.orders
  for each row when (
    new.status is distinct from old.status and new.status in ('ready', 'delivered')
    and new.source in ('fedapay_live', 'fedapay_sandbox') and new.payment_state = 'paid'
  ) execute function public.queue_consented_order_fulfillment_whatsapp();
