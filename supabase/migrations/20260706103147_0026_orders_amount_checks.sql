ALTER TABLE public.orders ADD CONSTRAINT orders_amounts_positive CHECK (subtotal >= 0 AND discount_total >= 0 AND total >= 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_amounts_positive CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0);
