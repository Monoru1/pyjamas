-- Terrain 16 · SEC-006 — no order may bypass the confirmed-payment checkout.
-- The legacy Edge Function `create-order-request` (verify_jwt = false) created unpaid orders
-- through this RPC. Revoking it closes that path in the database, whatever the function's
-- deployed version or ORDER_REQUESTS_ENABLED value. The function body and historical orders
-- are kept; deleting the deployed Edge Function is a separate, owner-approved step.
revoke all on function public.create_order_request_atomic(uuid, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
