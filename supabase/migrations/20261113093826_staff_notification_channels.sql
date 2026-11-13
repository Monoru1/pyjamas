drop trigger paid_order_whatsapp on public.payment_attempts;
drop trigger new_order_staff_whatsapp on public.payment_attempts;
drop trigger order_fulfillment_whatsapp on public.orders;

alter table public.notification_jobs drop constraint notification_jobs_kind_check;
alter table public.notification_jobs add constraint notification_jobs_kind_check check (
  kind in ('customer_email', 'admin_email', 'customer_whatsapp', 'staff_whatsapp_new',
    'customer_whatsapp_failed', 'customer_whatsapp_ready', 'customer_whatsapp_delivered',
    'staff_email_new', 'staff_email_failed', 'staff_email_ready', 'staff_email_delivered',
    'staff_telegram_new', 'staff_telegram_paid', 'staff_telegram_failed',
    'staff_telegram_ready', 'staff_telegram_delivered')
);

create function public.queue_staff_order_notifications() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  event_name text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then event_name := 'new'; end if;
  elsif new.payment_state is distinct from old.payment_state then
    event_name := case new.payment_state when 'paid' then 'paid' when 'failed' then 'failed' end;
  elsif new.status is distinct from old.status and new.status in ('ready', 'delivered') then
    event_name := new.status::text;
  end if;
  if event_name is not null then
    insert into public.notification_jobs(order_id, kind)
    values (new.id, 'staff_telegram_' || event_name),
           (new.id, case when event_name = 'paid' then 'admin_email' else 'staff_email_' || event_name end)
    on conflict (order_id, kind) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.queue_staff_order_notifications() from public, anon, authenticated;
create trigger staff_order_created after insert on public.orders
  for each row when (new.source in ('website', 'fedapay_live', 'fedapay_sandbox', 'notification_demo'))
  execute function public.queue_staff_order_notifications();
create trigger staff_order_updated after update of payment_state, status on public.orders
  for each row when (new.source in ('website', 'fedapay_live', 'fedapay_sandbox'))
  execute function public.queue_staff_order_notifications();

-- apply_shop_payment continues to own the customer confirmation; require opt-in at enqueue time.
create function public.require_customer_email_consent() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.payment_attempts
      where order_id = new.order_id and customer->'emailConfirmation' = 'true'::jsonb) then
    return new;
  end if;
  return null;
end;
$$;
revoke all on function public.require_customer_email_consent() from public, anon, authenticated;
create trigger consented_customer_email before insert on public.notification_jobs
  for each row when (new.kind = 'customer_email') execute function public.require_customer_email_consent();

create function public.claim_staff_notification_job(p_email boolean, p_telegram boolean, p_job_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare job public.notification_jobs%rowtype;
begin
  select * into job from public.notification_jobs
  where (p_job_id is null or id = p_job_id)
    and (p_job_id is not null or not exists (select 1 from public.orders
      where orders.id = notification_jobs.order_id and orders.source = 'notification_demo'))
    and ((p_email and (kind in ('admin_email', 'customer_email') or left(kind, 12) = 'staff_email_'))
         or (p_telegram and left(kind, 15) = 'staff_telegram_'))
    and ((status = 'pending' and next_attempt_at <= now())
         or (status = 'sending' and lease_until < now()))
  order by next_attempt_at, id for update skip locked limit 1;
  if not found then return null; end if;
  update public.notification_jobs set status = 'sending', attempts = attempts + 1,
    lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes'
    where id = job.id returning * into job;
  return to_jsonb(job);
end;
$$;
revoke all on function public.claim_staff_notification_job(boolean, boolean, uuid) from public, anon, authenticated;
grant execute on function public.claim_staff_notification_job(boolean, boolean, uuid) to service_role;
