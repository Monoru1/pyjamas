import { createClient } from '@supabase/supabase-js';
import { paymentConfiguration, providerRequest, transactionFromResponse, validateTransaction } from './fedapay';

export function paymentDatabase() {
  paymentConfiguration();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Service indisponible.');
  // Deliberately server-only: this module is imported exclusively by route handlers.
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function reconcilePayment(id: string, eventId: string) {
  const db = paymentDatabase();
  const { data: payment, error } = await db.from('payment_attempts').select('id,provider_id,amount_xof,purpose').eq('id', id).single();
  if (error || !payment?.provider_id) throw new Error('Paiement introuvable.');
  const transaction = transactionFromResponse(await providerRequest(`/transactions/${payment.provider_id}`));
  const state = validateTransaction(transaction, payment);
  const { error: applyError } = await db.rpc('apply_sandbox_payment', {
    p_id: id, p_provider_id: transaction.id, p_amount: Number(transaction.amount),
    p_status: state, p_event: eventId,
  });
  if (applyError) throw new Error('La confirmation du paiement est momentanément indisponible.');
  return state;
}
