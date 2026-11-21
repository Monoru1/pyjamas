import { z } from 'zod';
// Benin's current national format: +229 01 followed by eight digits.
export const checkoutSchema = z.object({
  idempotencyKey: z.uuid(),
  quoteToken: z.string().max(1000).optional(),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(25).transform(value => value.replace(/[ +()-]/g, '')).pipe(z.string().regex(/^22901[0-9]{8}$/)),
    email: z.email().max(254), address: z.string().trim().min(8).max(300),
    city: z.string().trim().min(2).max(80), whatsappUpdates: z.literal(true).optional(), whatsappTracking: z.literal(true).optional(), emailConfirmation: z.literal(true).optional(), emailTracking: z.literal(true).optional(), comment: z.string().trim().max(500).default(''),
  }).strict(),
  lines: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(20),
}).strict();

const fieldMessages: Record<string, string> = {
  name: 'nom (2 caractères minimum)',
  phone: 'téléphone béninois : +229 01 suivi de 8 chiffres',
  email: 'adresse e-mail valide',
  city: 'ville de livraison',
  address: 'adresse de livraison (8 caractères minimum)',
  comment: 'commentaire (500 caractères maximum)',
};

/**
 * Exactly which customer fields are invalid, with the same rules the server enforces.
 * Shared by the payment route (authoritative) and the cart (before any request).
 */
export function customerFieldErrors(customer: unknown) {
  const result = checkoutSchema.shape.customer.safeParse(customer);
  if (result.success) return [];
  const fields = new Set(result.error.issues.map(issue => String(issue.path[0] ?? '')).filter(field => field in fieldMessages));
  return Object.keys(fieldMessages).filter(field => fields.has(field));
}

export function customerErrorMessage(fields: string[]) {
  return fields.length ? `Vérifiez : ${fields.map(field => fieldMessages[field]).join(' ; ')}.` : 'Vérifiez vos coordonnées.';
}
