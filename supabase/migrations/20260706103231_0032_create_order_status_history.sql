CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read order status history" ON public.order_status_history
FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "admin create order status history" ON public.order_status_history
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history (order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history (created_at);
