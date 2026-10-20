import { readLimitedBody } from '@/lib/payments/read-body';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { paymentDatabase } from '@/lib/payments/server';
import { paymentConfiguration, providerRequest, safeCheckoutUrl, transactionFromResponse } from '@/lib/payments/fedapay';

export const runtime = 'nodejs';
const schema = z.object({
  idempotencyKey: z.uuid(),
  customer: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().regex(/^\+?[0-9 ]{8,25}$/) }).strict(),
  lines: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(20),
}).strict();

export async function POST(request: Request) {
  try {
    const config = paymentConfiguration();
    if (request.headers.get('origin') !== config.origin) return Response.json({ error: 'Origine non autorisée.' }, { status: 403 });
    // During sandbox acceptance, only authenticated staff may create test transactions.
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    const { data: allowed } = user ? await auth.rpc('is_admin') : { data: false };
    if (!allowed) return Response.json({ error: 'Un compte de test autorisé est requis.' }, { status: 403 });
    const raw = await readLimitedBody(request, 10000);
    if (raw.length > 10_000) return Response.json({ error: 'Panier trop volumineux.' }, { status: 413 });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return Response.json({ error: 'Informations de commande invalides.' }, { status: 400 });
    const input = parsed.data;
    const hash = createHash('sha256').update(JSON.stringify({ customer: input.customer, lines: input.lines })).digest('hex');
    const db = paymentDatabase();
    const { data, error } = await db.rpc('create_sandbox_payment', { p_key: input.idempotencyKey, p_hash: hash, p_customer: input.customer, p_lines: input.lines });
    if (error || !data) return Response.json({ error: 'Stock insuffisant, demande modifiée ou paiement déjà en cours.' }, { status: 409 });
    const payment = data as { id: string; amount_xof: number; public_token: string; provider_id: number | null; checkout_url: string | null; creator: boolean };
    if (payment.checkout_url) return Response.json({ url: safeCheckoutUrl(payment.checkout_url) });
    // An ambiguous timeout must NEVER result in a second provider transaction.
    if (!payment.creator) return Response.json({ error: 'Paiement en cours de vérification. Réessayez avec la même demande.' }, { status: 409 });
    const transaction = transactionFromResponse(await providerRequest('/transactions', { method: 'POST', body: JSON.stringify({
      description: `TEST · La Maison des Pyjamas · ${payment.id}`,
      amount: Number(payment.amount_xof), currency: { iso: 'XOF' },
      callback_url: `${config.origin}/paiement?reference=${payment.public_token}`,
      custom_metadata: { payment_id: payment.id, purpose: 'shop' },
      customer: { firstname: input.customer.name, lastname: '', phone_number: { number: input.customer.phone.replace(/\D/g, ''), country: 'BJ' } },
    }) }));
    const { error: attachError } = await db.from('payment_attempts').update({ provider_id: transaction.id }).eq('id', payment.id).is('provider_id', null);
    if (attachError) throw new Error('Confirmation différée.');
    const token = await providerRequest(`/transactions/${transaction.id}/token`, { method: 'POST', body: '{}' });
    const url = safeCheckoutUrl(token.url);
    const { error: urlError } = await db.from('payment_attempts').update({ checkout_url: url }).eq('id', payment.id);
    if (urlError) throw new Error('Confirmation différée.');
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Le paiement de test est indisponible. Aucun paiement réel n’est activé.' }, { status: 503 });
  }
}
