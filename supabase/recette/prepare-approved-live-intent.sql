-- DO NOT RUN before explicit owner approval of the amount, merchant and test operator.
-- Set app.recette_staff_user_id, app.recette_merchant_account_id,
-- app.recette_approved_amount_xof in a secure SQL session. No defaults or credentials.
-- This authorizes one local intent; it does NOT contact FedaPay or charge anything.
insert into public.live_test_authorizations(staff_user_id,merchant_account_id,amount_xof,expires_at)
select nullif(current_setting('app.recette_staff_user_id',true),'')::uuid,
 nullif(current_setting('app.recette_merchant_account_id',true),'')::bigint,
 nullif(current_setting('app.recette_approved_amount_xof',true),'')::bigint,
 now()+interval '15 minutes'
returning id;
