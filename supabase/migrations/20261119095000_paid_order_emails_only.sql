-- Paid-order receipts only. Keep every historical notification and stock record.
-- apply_shop_payment already inserts the client receipt after provider verification;
-- the consent trigger remains authoritative for that optional receipt.
create or replace function public.queue_staff_order_notifications() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.payment_state = 'paid' and (tg_op = 'INSERT' or old.payment_state is distinct from new.payment_state) then
    insert into public.notification_jobs(order_id, kind) values (new.id, 'admin_email')
      on conflict (order_id, kind) do nothing;
  end if;
  return new;
end;
$$;

-- Ignore obsolete pending jobs without deleting or rewriting their history.
create or replace function public.claim_order_email(p_job_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare job public.notification_jobs%rowtype;
begin
  select j.* into job from public.notification_jobs j
  where (p_job_id is null or j.id = p_job_id)
    and j.kind in ('admin_email', 'customer_email')
    and exists (select 1 from public.orders o join public.payment_attempts p on p.order_id = o.id
      where o.id = j.order_id and o.source in ('fedapay_live', 'fedapay_sandbox')
        and o.payment_state = 'paid' and p.status = 'paid' and p.provider_id is not null)
    and ((j.status = 'pending' and j.next_attempt_at <= now())
      or (j.status = 'sending' and j.lease_until < now()))
  order by j.next_attempt_at, j.id for update of j skip locked limit 1;
  if not found then return null; end if;
  update public.notification_jobs set status = 'sending', attempts = attempts + 1,
    lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes'
    where id = job.id returning * into job;
  return to_jsonb(job);
end;
$$;
revoke all on function public.claim_order_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_order_email(uuid) to service_role;
