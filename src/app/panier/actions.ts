'use server';

import { revalidatePath } from 'next/cache';

export type OrderRequestInput = {
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
    body: JSON.stringify(input),
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
