import { createHash } from 'node:crypto';
import { z } from 'zod';
import { readLimitedBody, requireJsonRequest, requireBrowserOrigin, HttpInputError, UUID_PATTERN } from '@/lib/payments/read-body';
import { operationsDatabase } from '@/lib/payments/operations';
import { sendShopContactEmail, staffRecipients } from '@/lib/payments/notifications';
import { trustedSiteOrigin } from '@/lib/security/urls';
export const runtime = 'nodejs';

// Same access control as order tracking: only the secret tracking reference
// (a random UUID, never the order number) opens this form, and only once paid.
const input = z.object({
  reference: z.string().regex(UUID_PATTERN),
  requestId: z.string().regex(UUID_PATTERN),
  message: z.string().trim().min(5).max(1500),
}).strict();

const clean = (value: unknown, max: number) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

export async function POST(request: Request) {
  try {
    requireJsonRequest(request);
    const origin = trustedSiteOrigin(process.env.SITE_ORIGIN);
    requireBrowserOrigin(request, origin);
    const parsed = input.safeParse(JSON.parse(await readLimitedBody(request, 4000)));
    if (!parsed.success) return Response.json({ error: 'Votre message doit contenir entre 5 et 1 500 caractères.' }, { status: 400 });
    const { reference, requestId, message } = parsed.data;
    const db = operationsDatabase();
    const { data: budget, error: budgetError } = await db.rpc('consume_order_request_budget', { p_subject: createHash('sha256').update(`contact:${reference}`).digest('hex') });
    if (budgetError || !budget) return Response.json({ error: 'Trop de messages. Réessayez dans quelques minutes.' }, { status: 429 });
    const { data: payment, error } = await db.from('payment_attempts').select('status,customer,orders(order_number)')
      .eq('public_token', reference).maybeSingle();
    const order = (Array.isArray(payment?.orders) ? payment?.orders[0] : payment?.orders) as { order_number?: string } | null | undefined;
    if (error || !payment || payment.status !== 'paid' || !order?.order_number) return Response.json({ error: 'Commande introuvable ou paiement non confirmé.' }, { status: 404 });
    const staff = staffRecipients();
    const from = process.env.ORDER_EMAIL_FROM;
    if (!staff.length || !from) return Response.json({ error: 'Le contact par message est momentanément indisponible. Utilisez la page Contact.' }, { status: 503 });
    const customer = (payment.customer ?? {}) as { name?: unknown; email?: unknown };
    const name = clean(customer.name, 80);
    const email = z.email().safeParse(clean(customer.email, 254)).data;
    const subject = `Question concernant la commande ${order.order_number}`;
    const text = [subject, '', `Référence : ${order.order_number}`, `Client : ${name || 'non renseigné'}`,
      `E-mail de réponse : ${email || 'non renseigné'}`, '', 'Message :', message,
      '', `Suivi interne : ${origin}/admin/commandes?q=${encodeURIComponent(order.order_number)}`].join('\n');
    await sendShopContactEmail({ from, to: staff, subject, text, ...(email ? { reply_to: email } : {}) }, requestId);
    // Never echo staff addresses or customer data back to the browser.
    return Response.json({ sent: true, order: order.order_number }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: 'Requête invalide.' }, { status: 400 });
    console.error('order_contact_failed', { code: error instanceof Error ? error.message : 'unknown' });
    return Response.json({ error: 'Votre message n’a pas pu être envoyé. Réessayez ou utilisez la page Contact.' }, { status: 503 });
  }
}
