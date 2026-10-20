ALTER TABLE public.products ADD CONSTRAINT products_base_price_positive CHECK (base_price >= 0);
ALTER TABLE public.product_variants ADD CONSTRAINT variants_price_positive CHECK (price >= 0);
ALTER TABLE public.product_variants ADD CONSTRAINT variants_stock_positive CHECK (stock_quantity >= 0);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5);
