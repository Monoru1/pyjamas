import { readLimitedBody, requireJsonRequest, requireBrowserOrigin, HttpInputError } from '@/lib/payments/read-body';
import { createHash, createHmac } from 'node:crypto';
import { createQuoteToken, verifyQuoteToken, type ShopQuote } from '@/lib/payments/quotes';
import { checkoutSchema } from '@/lib/payments/checkout-input';
import { createClient } from '@/lib/supabase/server';
import { paymentDatabase, resolvedTransaction } from '@/lib/payments/server';
import { checkoutConfiguration, providerRequest, safeCheckoutUrl, transactionFromResponse, validateTransaction } from '@/lib/payments/fedapay';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let paymentId: string | undefined;
  let reference: string | undefined;
  try {
    requireJsonRequest(request);
    const config = checkoutConfiguration();
    requireBrowserOrigin(request, config.origin);
    const parsed = checkoutSchema.safeParse(JSON.parse(await readLimitedBody(request, 10000)));
    if (!parsed.success) return Response.json({ error: 'Vérifiez nom, téléphone (+229 01…), e-mail, ville et adresse.' }, { status: 400 });
    let staffId: string | undefined;
    if (config.staffOnly) {
      const auth = await createClient();
      const { data: { user } } = await auth.auth.getUser();
      const { data: allowed } = user ? await auth.rpc('is_admin') : { data: false };
      staffId = user?.id;
      if (!allowed) return Response.json({ error: 'Test réservé à l’équipe.' }, { status: 403 });
    }
    const input = parsed.data;
    const db = paymentDatabase();
    const subject = createHmac('sha256', config.webhookSecret).update(input.customer.phone).digest('hex');
    const { data: budget, error: budgetError } = await db.rpc('consume_order_request_budget', { p_subject: subject });
    if (budgetError || !budget) return Response.json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429 });
    input.lines.sort((a, b) => a.variantId.localeCompare(b.variantId));
    const hash = createHash('sha256').update(JSON.stringify({ customer: input.customer, lines: input.lines })).digest('hex');
    const {data:quoteData,error:quoteError}=await db.rpc('quote_shop_basket',{p_lines:input.lines,p_shipping:config.shipping});
    if(quoteError || !quoteData)return Response.json({error:'Article indisponible. Actualisez votre panier.'},{status:409});
    const quote=quoteData as ShopQuote;
    if(!verifyQuoteToken(input.quoteToken,quote))return Response.json({error:'Le prix ou le panier a changé. Vérifiez puis confirmez le nouveau total.',quote,quoteToken:createQuoteToken(quote)},{status:409});
    if(config.liveTest && quote.amount_xof>config.testCeiling!)return Response.json({error:'Montant supérieur au plafond de recette autorisé.'},{status:403});
    const args={p_key:input.idempotencyKey,p_hash:hash,p_customer:input.customer,p_lines:input.lines,p_account:config.accountId,p_shipping:config.shipping,p_expected_items:quote.items};
    const {data,error}=config.liveTest
      ? await db.rpc('create_authorized_live_test_payment',{...args,p_authorization:config.authorizationId,p_staff:staffId,p_ceiling:config.testCeiling})
      : await db.rpc('create_shop_payment',{...args,p_environment:config.environment});
    if (error || !data) return Response.json({ error: 'Article indisponible, stock insuffisant ou demande modifiée.' }, { status: 409 });
    const payment = data as { id: string; order_id: string; amount_xof: number; public_token: string; provider_id: number | null; checkout_url: string | null; status: string };
    paymentId = payment.id; reference = payment.public_token;
    if(Number(payment.amount_xof)!==Number(quote.amount_xof))return Response.json({error:'Une commande antérieure est déjà figée à un autre montant. Consultez son suivi avant de recommencer.',reference},{status:409});
    const referenceUrl = `/paiement?reference=${payment.public_token}`;
    if (payment.status === 'paid') return Response.json({ url: `${config.origin}${referenceUrl}`, reference: payment.public_token, internal: true });
    if (['expired', 'refunded', 'partially_refunded'].includes(payment.status)) return Response.json({ error: 'Cette demande est terminée. Consultez son suivi.', reference: payment.public_token }, { status: 409 });
    let providerId = payment.provider_id;
    if (!providerId) {
      // Durable compare-and-set: only ONE worker may ever POST /transactions for
      // this request, including refreshes, concurrent requests and timeouts.
      const { data: claimed, error: claimError } = await db.from('payment_attempts').update({ initialization_started_at: new Date().toISOString() }).eq('id', payment.id).is('initialization_started_at', null).select('id');
      if (claimError || claimed?.length !== 1) return Response.json({ error: 'Création en cours de vérification. Conservez cette référence.', reference: payment.public_token }, { status: 409 });
      const parts = input.customer.name.split(/\s+/);
      const transaction = transactionFromResponse(await providerRequest('/transactions', { method: 'POST', body: JSON.stringify({
        description: `${config.environment === 'sandbox' ? 'TEST · ' : ''}La Maison des Pyjamas · ${payment.id}`,
        amount: Number(payment.amount_xof), currency: { iso: 'XOF' },
        callback_url: `${config.origin}${referenceUrl}`,
        merchant_reference: payment.id,
        custom_metadata: { payment_id: payment.id, purpose: 'shop', order_id: payment.order_id },
        customer: { firstname: parts[0], lastname: parts.slice(1).join(' ') || parts[0], email: input.customer.email, phone_number: { number: `+${input.customer.phone}`, country: 'bj' } },
      }) }));
      providerId = transaction.id;
      const { data: attached, error: attachError } = await db.from('payment_attempts').update({ provider_id: providerId }).eq('id', payment.id).is('provider_id', null).select('id');
      if (attachError || attached?.length !== 1) throw new Error('Confirmation différée.');
    }
    // Verify the actual recipient and immutable amount BEFORE offering a payment
    // link. A mismatched API key must never redirect a tester to another merchant.
    validateTransaction(await resolvedTransaction(providerId), { id: payment.id, provider_id: providerId, amount_xof: payment.amount_xof, purpose: 'shop', order_id: payment.order_id, merchant_account_id: config.accountId });
    if (payment.checkout_url) return Response.json({ url: safeCheckoutUrl(payment.checkout_url, config.environment), reference: payment.public_token });
    // Token generation is safely retryable for an already persisted transaction.
    const token = await providerRequest(`/transactions/${providerId}/token`, { method: 'POST', body: '{}' });
    const url = safeCheckoutUrl(token.url, config.environment);
    const { error: urlError } = await db.from('payment_attempts').update({ checkout_url: url, last_error: null }).eq('id', payment.id);
    if (urlError) throw new Error('Confirmation différée.');
    return Response.json({ url, reference: payment.public_token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (paymentId) {
      console.error('payment_initialization_failed', { paymentId });
      await paymentDatabase().from('payment_attempts').update({ last_error: 'initialization_failed' }).eq('id', paymentId);
    }
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: 'JSON invalide.' }, { status: 400 });
    return Response.json({ error: 'Paiement indisponible ou confirmation différée. Réessayez avec la même demande.', reference }, { status: 503 });
  }
}
