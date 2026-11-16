alter table public.notification_jobs drop constraint notification_jobs_kind_check;
alter table public.notification_jobs add constraint notification_jobs_kind_check check (
  kind in ('customer_email','admin_email','customer_whatsapp','staff_whatsapp_new',
    'customer_whatsapp_failed','customer_whatsapp_ready','customer_whatsapp_delivered',
    'staff_email_new','staff_email_failed','staff_email_ready','staff_email_delivered',
    'staff_telegram_new','staff_telegram_paid','staff_telegram_failed','staff_telegram_ready','staff_telegram_delivered',
    'customer_email_failed','customer_email_ready','customer_email_delivered')
);

create or replace function public.queue_staff_order_notifications() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare event_name text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then event_name := 'new'; end if;
  elsif new.payment_state is distinct from old.payment_state then
    event_name := case new.payment_state when 'paid' then 'paid' when 'failed' then 'failed' end;
  elsif new.status is distinct from old.status and new.status in ('ready', 'delivered') then
    event_name := new.status::text;
  end if;
  if event_name is null then return new; end if;

  insert into public.notification_jobs(order_id, kind)
  values (new.id, case when event_name = 'paid' then 'admin_email' else 'staff_email_' || event_name end)
  on conflict (order_id, kind) do nothing;

  if event_name in ('failed', 'ready', 'delivered')
    and exists (select 1 from public.payment_attempts where order_id = new.id
      and customer->'emailConfirmation' = 'true'::jsonb
      and customer->'emailTracking' = 'true'::jsonb) then
    insert into public.notification_jobs(order_id, kind)
    values (new.id, 'customer_email_' || event_name)
    on conflict (order_id, kind) do nothing;
  end if;
  return new;
end;
$$;

create function public.claim_order_email(p_job_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare job public.notification_jobs%rowtype;
begin
  select * into job from public.notification_jobs
  where (p_job_id is null or id = p_job_id)
    and (p_job_id is not null or not exists (select 1 from public.orders
      where orders.id = notification_jobs.order_id and orders.source = 'notification_demo'))
    and kind in ('admin_email','customer_email','staff_email_new','staff_email_failed','staff_email_ready',
      'staff_email_delivered','customer_email_failed','customer_email_ready','customer_email_delivered')
    and ((status = 'pending' and next_attempt_at <= now())
      or (status = 'sending' and lease_until < now()))
  order by next_attempt_at,id for update skip locked limit 1;
  if not found then return null; end if;
  update public.notification_jobs set status = 'sending', attempts = attempts + 1,
    lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes'
    where id = job.id returning * into job;
  return to_jsonb(job);
end;
$$;
revoke all on function public.claim_order_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_order_email(uuid) to service_role;
revoke execute on function public.claim_staff_notification_job(boolean,boolean,uuid) from service_role;
revoke execute on function public.claim_notification_job() from service_role;
