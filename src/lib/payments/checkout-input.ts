import { z } from 'zod';
// Benin's current national format: +229 01 followed by eight digits.
export const checkoutSchema = z.object({
  idempotencyKey: z.uuid(),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(25).transform(value => value.replace(/[ +()-]/g, '')).pipe(z.string().regex(/^22901[0-9]{8}$/)),
    email: z.email().max(254), address: z.string().trim().min(8).max(300),
    city: z.string().trim().min(2).max(80), comment: z.string().trim().max(500).default(''),
  }).strict(),
  lines: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(20),
}).strict();
