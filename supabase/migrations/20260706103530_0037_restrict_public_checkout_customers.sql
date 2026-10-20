DROP POLICY IF EXISTS "public create customers" ON public.customers;
CREATE POLICY "public create customers" ON public.customers
FOR INSERT TO anon
WITH CHECK (
  full_name IS NOT NULL OR phone IS NOT NULL OR whatsapp_phone IS NOT NULL OR email IS NOT NULL
);
