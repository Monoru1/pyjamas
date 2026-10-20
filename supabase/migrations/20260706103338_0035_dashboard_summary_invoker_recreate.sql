CREATE OR REPLACE VIEW public.dashboard_summary
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM public.products) AS products_total,
  (SELECT COUNT(*) FROM public.product_variants WHERE stock_quantity = 0) AS variants_out_of_stock,
  (SELECT COUNT(*) FROM public.product_variants WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold) AS variants_low_stock,
  (SELECT COUNT(*) FROM public.orders) AS orders_total,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'pending') AS orders_pending;
