CREATE VIEW public.admin_product_overview
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.slug,
  p.name_fr,
  p.is_active,
  p.is_featured,
  p.is_new,
  p.base_price,
  p.currency_code,
  c.name_fr AS category_name_fr,
  COUNT(v.id) AS variants_count,
  COALESCE(SUM(v.stock_quantity), 0) AS total_stock,
  MIN(v.price) AS min_variant_price,
  MAX(v.price) AS max_variant_price,
  p.created_at,
  p.updated_at
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.product_variants v ON v.product_id = p.id
GROUP BY p.id, c.name_fr;
