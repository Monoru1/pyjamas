import { createClient } from '@/lib/supabase/server';
import { paymentDatabase, resolvedTransaction, readProviderInitializationLogs } from '@/lib/payments/server';
import { paymentConfiguration, validateTransaction, TransactionMismatchError } from '@/lib/payments/fedapay';
import { UUID_PATTERN } from '@/lib/payments/read-body';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };

/** Staff-only, read-only diagnosis. Never creates a transaction or a token. */
export async function GET(request: Request) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !(await auth.rpc('is_admin')).data) return Response.json({ error: 'Accès réservé au personnel.' }, { status: 403, headers });
  const id = new URL(request.url).searchParams.get('payment') || '';
  if (!UUID_PATTERN.test(id)) return Response.json({ error: 'Référence invalide.' }, { status: 400, headers });
  try {
    const config = paymentConfiguration();
    const { data: payment, error } = await paymentDatabase().from('payment_attempts')
      .select('id,provider_id,amount_xof,purpose,order_id,environment,merchant_account_id,last_error')
      .eq('id', id).eq('environment', config.environment).maybeSingle();
    if (error || !payment?.provider_id || !payment.order_id) return Response.json({ error: 'Transaction associée introuvable.' }, { status: 404, headers });
    const transaction = await resolvedTransaction(payment.provider_id);
    let mismatch: string | null = null;
    try { validateTransaction(transaction, payment); }
    catch (error) { if (!(error instanceof TransactionMismatchError)) throw error; mismatch = error.field; }
    let providerLogs: Awaited<ReturnType<typeof readProviderInitializationLogs>> | undefined;
    if (new URL(request.url).searchParams.get('logs') === '1') {
      try { providerLogs = await readProviderInitializationLogs(payment.provider_id); }
      catch { providerLogs = { available: false, entries: [] }; }
    }
    return Response.json({
      paymentId: payment.id, providerId: transaction.id, status: transaction.status,
      amount: Number(transaction.amount), currency: transaction.currency?.iso,
      merchantAccountId: transaction.account_id, firstMismatch: mismatch,
      checks: {
        providerId: transaction.id === payment.provider_id,
        amount: Number(transaction.amount) === Number(payment.amount_xof),
        currency: transaction.currency?.iso === 'XOF',
        merchantAccountId: transaction.account_id === payment.merchant_account_id,
        paymentReference: transaction.custom_metadata?.payment_id === payment.id,
        purpose: transaction.custom_metadata?.purpose === payment.purpose,
        order: transaction.custom_metadata?.order_id === payment.order_id,
        merchantReference: transaction.merchant_reference === payment.id,
      },
      shape: {
        merchantReferencePresent: transaction.merchant_reference != null && transaction.merchant_reference !== '',
        merchantReferenceType: typeof transaction.merchant_reference,
        merchantReferenceLength: typeof transaction.merchant_reference === 'string' ? transaction.merchant_reference.length : null,
        metadataType: typeof transaction.custom_metadata,
        accountIdType: typeof transaction.account_id,
      },
      localError: payment.last_error,
      providerLogs,
      providerRequests: 'GET only', financialMutation: false,
    }, { headers });
  } catch {
    return Response.json({ error: 'Lecture fournisseur indisponible. Aucune modification effectuée.' }, { status: 503, headers });
  }
}
