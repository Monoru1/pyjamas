-- RETIRED on 16 November 2026: no uniform price or quantity is authorized.
-- Kept at the historical path so an old runbook cannot silently rewrite the catalogue.
-- Confirm each variant with the shop, then use the authenticated back-office.
do $$
begin
  raise exception 'Provisional catalogue disabled: confirm actual prices and physical quantities in the back-office';
end $$;
