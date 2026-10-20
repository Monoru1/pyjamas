import { paymentDatabase } from '@/lib/payments/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('reference') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) return Response.json({ error: 'Référence invalide.' }, { status: 400 });
  try {
    const db = paymentDatabase();
    const { data, error } = await db.from('payment_attempts').select('id,status,amount_xof,provider_id,updated_at').eq('public_token', token).maybeSingle();
    if (error || !data) return Response.json({ error: 'Paiement introuvable.' }, { status: 404 });
    // A polling client cannot trigger unbounded provider reads: scheduled reconciliation is authoritative.
    return Response.json({ status: data.status, amount: data.amount_xof, mode: 'sandbox' }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return Response.json({ error: 'Vérification momentanément indisponible.' }, { status: 503 }); }
}
