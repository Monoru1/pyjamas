-- Transport activation remains server-side and disabled by default.
alter table public.notification_jobs drop constraint notification_jobs_kind_check;
alter table public.notification_jobs add constraint notification_jobs_kind_check check(kind in ('customer_email','admin_email','customer_whatsapp'));
alter table public.notification_jobs add column provider_message_id text;
create function public.queue_consented_order_whatsapp() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.status='paid' and new.order_id is not null and new.customer->>'whatsappUpdates'='true' then
  insert into public.notification_jobs(order_id,kind) values(new.order_id,'customer_whatsapp') on conflict do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.queue_consented_order_whatsapp() from public,anon,authenticated;
create trigger paid_order_whatsapp after update of status on public.payment_attempts for each row execute function public.queue_consented_order_whatsapp();
