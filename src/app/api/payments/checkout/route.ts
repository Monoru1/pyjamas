import { readLimitedBody, requireJsonRequest, requireBrowserOrigin, HttpInputError } from '@/lib/payments/read-body';
import { allowedBrowserOrigin } from '@/lib/security/site-domain';
import { createHash, createHmac } from 'node:crypto';
import { createQuoteToken, verifyQuoteToken, reservedPaymentQuote, type ShopQuote } from '@/lib/payments/quotes';
import { checkoutSchema, customerErrorMessage, customerFieldErrors } from '@/lib/payments/checkout-input';
import { createClient } from '@/lib/supabase/server';
import { paymentDatabase } from '@/lib/payments/server';
import { initializeStoredCheckout, CheckoutInitializationError } from '@/lib/payments/initialization';
import { checkoutConfiguration, providerRequest, transactionFromResponse, TransactionMismatchError } from '@/lib/payments/fedapay';
export const runtime = 'nodejs';

const clientReservationLimitMessage = 'Des articles sont déjà réservés en attente de paiement depuis votre connexion. Finalisez ce paiement ou réessayez plus tard.';

/** Units a single connection may hold in unpaid reservations (SEC-001). Default 20. */
function maxOpenUnitsPerClient(value = process.env.PAYMENT_MAX_OPEN_UNITS_PER_CLIENT) {
  const parsed = Number(value);
  return value && Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 200 ? parsed : 20;
}
function checkoutFingerprintKey(value = process.env.CHECKOUT_FINGERPRINT_SECRET) {
  return value && value.length >= 32 ? value : undefined;
}
/** Netlify overwrites x-nf-client-connection-ip at its edge. Without it, a shared restrictive bucket. */
function checkoutClientFingerprint(request: Request, key: string) {
  const address = (request.headers.get('x-nf-client-connection-ip') ?? '').trim().slice(0, 64) || 'unknown';
  return createHmac('sha256', key).update(`checkout-client:${address}`).digest('hex');
}

export async function POST(request: Request) {
  let paymentId: string | undefined;
  let reference: string | undefined;
  let initializationStage = 'request';
  try {
    requireJsonRequest(request);
    const config = checkoutConfiguration();
    // The validated storefront the customer is on: FedaPay returns them THERE, where their
    // cart and resume key live (origin-scoped storage), even during a domain transition.
    const storefront = allowedBrowserOrigin(request, config.origin);
    requireBrowserOrigin(request, storefront);
    const json: unknown = JSON.parse(await readLimitedBody(request, 10000));
    const parsed = checkoutSchema.safeParse(json);
    if (!parsed.success) {
      // Field names only: never echo customer values back.
      const fields = customerFieldErrors((json as { customer?: unknown } | null)?.customer);
      return Response.json({ error: fields.length ? customerErrorMessage(fields) : 'Demande de paiement invalide.', fields }, { status: 400 });
    }
    let staffId: string | undefined;
    if (config.staffOnly) {
      const auth = await createClient();
      const { data: { user } } = await auth.auth.getUser();
      const { data: allowed } = user ? await auth.rpc('is_admin') : { data: false };
      staffId = user?.id;
      if (!allowed) return Response.json({ error: 'Test réservé à l’équipe.' }, { status: 403 });
    }
    const input = parsed.data;
    // Server-side key: all attempts of one authorization share one payment row.
    if (config.adminTest) input.idempotencyKey = config.adminTestKey!;
    const db = paymentDatabase();
    // SEC-008: dedicated fingerprint key; falls back to the webhook secret until it is set.
    const fingerprintKey = checkoutFingerprintKey() ?? config.webhookSecret;
    const subject = createHmac('sha256', fingerprintKey).update(input.customer.phone).digest('hex');
    // SEC-001: keyed fingerprint of the connection (Netlify sets this header); never stored raw.
    const client = checkoutClientFingerprint(request, fingerprintKey);
    const maxOpenUnits = maxOpenUnitsPerClient();
    input.lines.sort((a, b) => a.variantId.localeCompare(b.variantId));
    const hash = createHash('sha256').update(JSON.stringify({ customer: input.customer, lines: input.lines })).digest('hex');
    const {data:existing,error:lookupError}=await db.from('payment_attempts').select('id,request_hash,environment,merchant_account_id,amount_xof,items,provider_id,status,public_token').eq('idempotency_key',input.idempotencyKey).maybeSingle();
    if(lookupError)throw new Error('Recherche de commande indisponible.');
    // Resuming an existing order never reserves more units, so only NEW baskets count against the cap.
    const units = existing ? 0 : input.lines.reduce((sum, line) => sum + line.quantity, 0);
    const { data: verdict, error: budgetError } = await db.rpc('consume_checkout_budget', { p_client: client, p_subject: subject, p_units: units, p_max_open_units: maxOpenUnits });
    if (budgetError || verdict !== 'ok') return Response.json({ error: verdict === 'client_units'
      ? clientReservationLimitMessage
      : 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429 });
    if (config.liveTest && (!existing || !existing.provider_id)) {
      const { data: previous, error: previousError } = await db.from('payment_attempts')
        .select('status,inventory_state').eq('environment', 'live').eq('provider_id', 113943841).maybeSingle();
      const settled = previous && (['paid', 'refunded', 'partially_refunded'].includes(previous.status)
        ? previous.inventory_state === 'committed'
        : previous.status === 'expired' && previous.inventory_state === 'released');
      if (previousError || !settled) {
        return Response.json({ error: 'Le précédent test Live doit être rapproché avant un nouveau paiement.' }, { status: 409 });
      }
    }
    if (config.adminTest && !existing) {
      // A previous authorization's payment blocks a new one unless it is
      // definitively expired: failed/cancelled transactions stay payable.
      const { data: open, error: openError } = await db.from('payment_attempts').select('id')
        .eq('environment', 'live').in('status', ['pending', 'failed', 'cancelled', 'paid', 'refunded', 'partially_refunded']).limit(1);
      if (openError || (open?.length ?? 0) > 0) return Response.json({ error: 'Un paiement de test existe déjà. Consultez son suivi avant toute nouvelle tentative.' }, { status: 409 });
    }
    let quote:ShopQuote;
    if(existing && !Array.isArray(existing)) {
      if(existing.request_hash!==hash || existing.environment!==config.environment || existing.merchant_account_id!==config.accountId)return Response.json({error:'Cette demande est déjà liée à une autre commande.'},{status:409});
      // Never offer to resume an attempt that is already closed (e.g. reservation expired).
      if(['expired','refunded','partially_refunded'].includes(existing.status))return Response.json({error:existing.status==='expired'?'Ce paiement a expiré sans débit confirmé. Cliquez à nouveau pour créer une nouvelle commande.':'Cette demande est terminée. Consultez son suivi.',reference:existing.public_token,terminal:true},{status:409});
      // Its final unit may already be reserved by THIS order. Do not check the
      // remaining public stock or reprice an immutable order when resuming it.
      quote=reservedPaymentQuote(existing);
    } else {
      const {data:quoteData,error:quoteError}=await db.rpc('quote_shop_basket',{p_lines:input.lines,p_shipping:config.shipping});
      if(quoteError || !quoteData)return Response.json({error:'Article indisponible. Actualisez votre panier.'},{status:409});
      quote=quoteData as ShopQuote;
    }
    if(!verifyQuoteToken(input.quoteToken,quote))return Response.json({error:quote.reserved?'Vérifiez puis confirmez le montant figé de votre commande réservée.':'Le prix ou le panier a changé. Vérifiez puis confirmez le nouveau total.',quote,quoteToken:createQuoteToken(quote)},{status:409});
    if(config.liveTest && quote.amount_xof>config.testCeiling!)return Response.json({error:'Montant supérieur au plafond de recette autorisé.'},{status:403});
    if(config.adminTest && Number(quote.amount_xof)!==config.adminTestAmount)return Response.json({error:'Ce total ne correspond pas au montant de test autorisé par le propriétaire.'},{status:403});
    const { data, error } = await db.rpc('reserve_checkout_payment', {
      p_client: client, p_max_open_units: maxOpenUnits, p_key: input.idempotencyKey, p_hash: hash,
      p_customer: input.customer, p_lines: input.lines, p_environment: config.environment,
      p_account: config.accountId, p_shipping: config.shipping, p_expected_items: quote.items,
      ...(config.liveTest ? { p_authorization: config.authorizationId, p_staff: staffId, p_ceiling: config.testCeiling } : {}),
    });
    if (error?.code === 'P7429') return Response.json({ error: clientReservationLimitMessage }, { status: 429 });
    if (error || !data) return Response.json({ error: 'Article indisponible, stock insuffisant ou demande modifiée.' }, { status: 409 });
    const payment = data as { id: string; order_id: string; amount_xof: number; public_token: string; provider_id: number | null; checkout_url: string | null; status: string };
    paymentId = payment.id; reference = payment.public_token;
    if(Number(payment.amount_xof)!==Number(quote.amount_xof))return Response.json({error:'Une commande antérieure est déjà figée à un autre montant. Consultez son suivi avant de recommencer.',reference},{status:409});
    const referenceUrl = `/paiement?reference=${payment.public_token}`;
    if (payment.status === 'paid') return Response.json({ url: `${storefront}${referenceUrl}`, reference: payment.public_token, internal: true });
    // Terminal attempt: the browser must drop its idempotency key so that a NEW order can be made.
    if (['expired', 'refunded', 'partially_refunded'].includes(payment.status)) return Response.json({ error: payment.status === 'expired' ? 'Ce paiement a expiré sans débit confirmé. Cliquez à nouveau pour créer une nouvelle commande.' : 'Cette demande est terminée. Consultez son suivi.', reference: payment.public_token, terminal: true }, { status: 409 });
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
        callback_url: `${storefront}${referenceUrl}`,
        merchant_reference: payment.id,
        custom_metadata: { payment_id: payment.id, purpose: 'shop', order_id: payment.order_id },
        customer: { firstname: parts[0], lastname: parts.slice(1).join(' ') || parts[0], email: input.customer.email, phone_number: { number: `+${input.customer.phone}`, country: 'bj' } },
      }) }));
      providerId = transaction.id;
      const { data: attached, error: attachError } = await db.from('payment_attempts').update({ provider_id: providerId }).eq('id', payment.id).is('provider_id', null).select('id');
      if (attachError || attached?.length !== 1) throw new Error('Confirmation différée.');
    }
    initializationStage = 'resume_existing_transaction';
    const initialized = await initializeStoredCheckout({ ...payment, provider_id: providerId }, config);
    return Response.json({ url: initialized.url, reference: payment.public_token, internal: initialized.internal }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (paymentId) {
      const code = error instanceof CheckoutInitializationError ? error.code : `initialization_failed:${initializationStage}`;
      console.error('payment_initialization_failed', { paymentId, stage: initializationStage, code, errorType: error instanceof Error ? error.name : 'unknown', mismatchField: error instanceof TransactionMismatchError ? error.field : undefined });
      await paymentDatabase().from('payment_attempts').update({ last_error: code }).eq('id', paymentId);
    }
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: 'JSON invalide.' }, { status: 400 });
    return Response.json({ error: 'Paiement indisponible ou confirmation différée. Réessayez avec la même demande.', reference }, { status: 503 });
  }
}
