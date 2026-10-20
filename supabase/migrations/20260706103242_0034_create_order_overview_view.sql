CREATE VIEW public.admin_order_overview
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.source,
  o.currency_code,
  o.subtotal,
  o.discount_total,
  o.total,
  o.created_at,
  o.updated_at,
  c.full_name AS customer_name,
  c.phone AS customer_phone,
  c.whatsapp_phone AS customer_whatsapp_phone,
  COUNT(oi.id) AS items_count
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, c.full_name, c.phone, c.whatsapp_phone;
