import { UUID_PATTERN } from '@/lib/payments/read-body';
import { createClient } from '@/lib/supabase/server';
import { paymentConfiguration } from '@/lib/payments/fedapay';
import { paymentDatabase } from '@/lib/payments/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('reference') ?? '';
  if (!UUID_PATTERN.test(token)) return Response.json({ error: 'Référence invalide.' }, { status: 400 });
  try {
    const config=paymentConfiguration();
    if(config.liveTest){const auth=await createClient();const {data:{user}}=await auth.auth.getUser();if(!user||!(await auth.rpc('is_admin')).data)return Response.json({error:'Accès réservé au personnel.'},{status:403});}
    const db = paymentDatabase();
    const { data, error } = await db.from('payment_attempts').select('status,amount_xof,environment,order_id,orders(order_number,needs_attention)').eq('public_token', token).eq('environment', paymentConfiguration().environment).maybeSingle();
    if (error || !data) return Response.json({ error: 'Paiement introuvable.' }, { status: 404 });
    // A polling client cannot trigger unbounded provider reads: scheduled reconciliation is authoritative.
    return Response.json({ status: data.status, amount: data.amount_xof, mode: data.environment, liveTest: config.liveTest, order: data.orders }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return Response.json({ error: 'Vérification momentanément indisponible.' }, { status: 503 }); }
}
