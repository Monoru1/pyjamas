import { createClient } from '@/lib/supabase/server';
import { isEmailKind } from '@/lib/payments/order-email';
import { UUID_PATTERN } from '@/lib/payments/read-body';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user || !(await db.rpc('is_admin')).data) return new Response(null, { status: 403, headers });
  const id = new URL(request.url).searchParams.get('job') || '';
  if (!UUID_PATTERN.test(id)) return new Response(null, { status: 400, headers });
  const { data: job } = await db.from('notification_jobs').select('kind,status,provider_message_id').eq('id', id).maybeSingle();
  if (!job || !isEmailKind(job.kind) || job.status !== 'sent' || !UUID_PATTERN.test(job.provider_message_id || '')) {
    return new Response(null, { status: 404, headers });
  }
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('resend_unavailable');
    const response = await fetch(`https://api.resend.com/emails/${job.provider_message_id}`, {
      headers: { Authorization: `Bearer ${key}` }, redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('resend_unavailable');
    const email = await response.json();
    if (email.id !== job.provider_message_id || typeof email.last_event !== 'string'
      || !/^[a-z_]{1,40}$/.test(email.last_event)) throw new Error('resend_unavailable');
    return Response.json({ etat: email.last_event, identifiant: job.provider_message_id }, { headers });
  } catch {
    return Response.json({ error: 'Statut Resend indisponible avec les accès configurés.' }, { status: 503, headers });
  }
}
