CREATE INDEX idx_product_variants_active_stock ON public.product_variants (is_active, stock_quantity);
