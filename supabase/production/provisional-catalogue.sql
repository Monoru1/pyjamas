-- PRODUCTION — PROVISIONAL CATALOGUE. Run only AFTER the V1 migration and its postflight.
-- Decision of 16 November 2026: 30 units per marketed size, 30 000 FCFA per lot, both provisional.
--
-- What it does, in one transaction:
--   * price: every marketed size is set to the provisional price; the previous price is kept in
--     activity_logs (before_data / after_data), nothing historical is overwritten;
--   * stock: an ADJUSTMENT (never a receipt) through admin_record_stock, signed by a real staff
--     account and labelled provisional, visible under « Derniers mouvements du personnel ».
-- Order lines keep their own prices. Sizes that are archived, offline or withdrawn are not touched.
-- An administrator can correct every value afterwards from « Produits & stocks ».
--
-- Required before running (same session):
--   select set_config('app.provisional_staff_id', '<UUID of an active admin profile>', false);
--   select set_config('app.lots_confirmed', 'oui', false);   -- only once catalogue-review.sql was confirmed by the shop
-- Optional: app.provisional_price (default 30000), app.provisional_stock (default 30).
begin;
set local lock_timeout = '10s';
do $$
declare
  staff uuid := nullif(current_setting('app.provisional_staff_id', true), '')::uuid;
  price numeric := coalesce(nullif(current_setting('app.provisional_price', true), ''), '30000')::numeric;
  stock integer := coalesce(nullif(current_setting('app.provisional_stock', true), ''), '30')::integer;
  label constant text := 'PROVISOIRE V1 — stock initial à confirmer par inventaire';
  item record; prices integer := 0; stocks integer := 0;
begin
  if coalesce(current_setting('app.lots_confirmed', true), '') <> 'oui' then
    raise exception 'Sale units not confirmed as lots: run catalogue-review.sql and confirm with the shop first';
  end if;
  if staff is null or not exists (select 1 from public.profiles where id = staff and is_active and role in ('super_admin', 'admin')) then
    raise exception 'app.provisional_staff_id must be an active admin profile';
  end if;
  if to_regclass('public.staff_stock_movements') is null then raise exception 'V1 migration not applied'; end if;
  if price <= 0 or price <> trunc(price) or stock < 0 then raise exception 'Invalid provisional values'; end if;
  if exists (select 1 from public.staff_stock_movements where reason = label) then raise exception 'Provisional catalogue already applied'; end if;
  if exists (select 1 from public.payment_attempts where inventory_state = 'reserved') then
    raise exception 'A reservation is pending: reconcile it before adjusting stock';
  end if;

  for item in
    select v.id, v.price as old_price, v.compare_at_price as old_compare, v.stock_quantity as old_stock
    from public.product_variants v join public.products p on p.id = v.product_id
    where v.is_active and p.is_active and p.deleted_at is null
    order by v.id for update of v
  loop
    if item.old_price is distinct from price then
      update public.product_variants set price = price_value.v,
        compare_at_price = case when compare_at_price > price_value.v then compare_at_price end
      from (select price as v) price_value where id = item.id;
      insert into public.activity_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
      values (staff, 'provisional_price', 'product_variant', item.id,
        jsonb_build_object('price', item.old_price, 'compare_at_price', item.old_compare),
        jsonb_build_object('price', price, 'provisional', true, 'decision', '2026-11-16'));
      prices := prices + 1;
    end if;
    if item.old_stock is distinct from stock then
      -- Audited staff path: same rules as the back-office « Corriger une quantité ».
      perform set_config('request.jwt.claim.sub', staff::text, true);
      perform set_config('request.jwt.claims', jsonb_build_object('sub', staff, 'role', 'authenticated')::text, true);
      perform public.admin_record_stock(gen_random_uuid(), stock, label, item.id, item.old_stock);
      stocks := stocks + 1;
    end if;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  raise notice 'Provisional catalogue: % price(s) changed, % stock adjustment(s) recorded', prices, stocks;
end $$;
commit;

-- Result to keep with the release evidence.
select p.name_fr as produit, v.size_label as taille, v.price as prix_provisoire, v.stock_quantity as stock_provisoire,
  (select a.before_data->>'price' from public.activity_logs a where a.entity_id = v.id and a.action = 'provisional_price' order by a.created_at desc limit 1) as prix_precedent,
  (select m.stock_before from public.staff_stock_movements m where m.variant_id = v.id and m.reason like 'PROVISOIRE V1%' limit 1) as stock_precedent
from public.product_variants v join public.products p on p.id = v.product_id
where v.is_active and p.is_active and p.deleted_at is null order by 1, 2;
