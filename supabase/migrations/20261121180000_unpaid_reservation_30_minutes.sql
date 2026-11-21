-- Terrain 16 · SEC-001: an unpaid reservation holds stock for 30 minutes, no longer 24 hours.
-- Additive: the checkout functions are not rewritten. Expiry itself is unchanged: an attempt is
-- only closed by reconcilePayment AFTER FedaPay has been read, and a late approval re-acquires
-- the stock or flags the order (apply_shop_payment).
create function public.cap_unpaid_reservation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.inventory_state = 'reserved' and (new.expires_at is null or new.expires_at > now() + interval '30 minutes') then
    new.expires_at := now() + interval '30 minutes';
  end if;
  return new;
end $$;
revoke all on function public.cap_unpaid_reservation() from public, anon, authenticated;
create trigger cap_unpaid_reservation before insert on public.payment_attempts
  for each row execute function public.cap_unpaid_reservation();

-- Reservations created before this migration keep their original deadline (no retroactive change).
