'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
const requestSchema = z.object({ idempotencyKey: z.uuid(), customer: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().regex(/^\+?[0-9 ]{8,25}$/), comment: z.string().max(500).nullable().optional() }).strict(), lines: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(20) }).strict();

export type OrderRequestInput = {
  idempotencyKey: string;
  customer: {
    name: string;
    phone: string;
    comment?: string | null;
  };
  lines: Array<{
    variantId: string;
    quantity: number;
  }>;
};

export type OrderRequestResult = {
  orderNumber: string;
};

export async function createOrderRequest(input: OrderRequestInput): Promise<OrderRequestResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new Error('Informations de commande invalides.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('La prise de commande est temporairement indisponible.');
  }

  const response = await fetch(`${url}/functions/v1/create-order-request`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: key,
    },
    body: JSON.stringify(parsed.data),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as { error?: string; orderNumber?: string } | null;

  if (!response.ok || !payload?.orderNumber) {
    throw new Error(payload?.error || 'La commande n’a pas pu être enregistrée. Réessaie dans un instant.');
  }

  revalidatePath('/admin');
  revalidatePath('/admin/commandes');

  return { orderNumber: payload.orderNumber };
}
