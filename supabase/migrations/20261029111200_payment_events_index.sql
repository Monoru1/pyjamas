-- Additive fix for the payment-events FK advisor; no historical data changes.
create index if not exists payment_events_payment_idx on public.payment_events(payment_id);
