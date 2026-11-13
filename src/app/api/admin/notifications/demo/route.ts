import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { paymentDeployment } from '@/lib/payments/fedapay';
import { allowedEmail, sendOrderEmail } from '@/lib/payments/notifications';
import { operationsDatabase } from '@/lib/payments/operations';
import { demoEmailOrder, isEmailKind, renderOrderEmail } from '@/lib/payments/order-email';
import { HttpInputError, readLimitedBody, requireBrowserOrigin } from '@/lib/payments/read-body';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL);
  try {
    requireBrowserOrigin(request, origin);
    const deployment = paymentDeployment();
    if (deployment.context !== 'deploy-preview' || deployment.reviewId !== '14'
      || origin !== 'https://deploy-preview-14--pyjamas25.netlify.app'
      || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://oxhymanjibveayhcaqvj.supabase.co'
      || process.env.PAYMENT_DATABASE_ISOLATED !== 'true') return new Response(null, { status: 404 });
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user || !(await auth.rpc('is_admin')).data) return new Response(null, { status: 403 });
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) {
      return new Response(null, { status: 415 });
    }
    const fields = new URLSearchParams(await readLimitedBody(request, 500));
    const kind = fields.get('modele');
    if (fields.size !== 1 || !isEmailKind(kind)) return new Response(null, { status: 400 });
    const next = new URL('/admin/emails', origin);
    next.searchParams.set('modele', kind);
    const from = process.env.ORDER_EMAIL_FROM;
    const to = process.env.ORDER_ADMIN_EMAIL;
    try {
      if (!from || !to || !allowedEmail(to, true) || !process.env.RESEND_API_KEY) throw new Error('demo_disabled');
      const { subject, html, text } = renderOrderEmail(kind, demoEmailOrder, origin);
      const mail = { from, to, subject, html, text };
      const key = createHash('sha256').update(JSON.stringify(mail)).digest('hex');
      // Demonstration history is separate from operational notifications and bounded per hour.
      const history = operationsDatabase();
      const { count, error: limitError } = await history.from('notification_demo_sends')
        .select('id', { count: 'exact', head: true })
        .gte('last_requested_at', new Date(Date.now() - 3600_000).toISOString());
      if (limitError || (count ?? 0) >= 20) throw new Error('demo_rate_limited');
      // Same model within the provider window reuses the key: a second click sends nothing new.
      const providerId = await sendOrderEmail(mail, `demo-${key}`);
      const { error: historyError } = await history.from('notification_demo_sends').upsert({
        idempotency_key: key, kind, recipient: to, staff_user_id: user.id,
        provider_message_id: providerId, last_requested_at: new Date().toISOString(),
      }, { onConflict: 'idempotency_key' });
      if (historyError) {
        console.error('demo_history_failed');
        next.searchParams.set('resultat', 'historique-incomplet');
        return Response.redirect(next, 303);
      }
      const { error: deliveryError } = await history.rpc('refresh_email_delivery', { p_message_id: providerId });
      if (deliveryError) console.error('demo_delivery_refresh_failed');
      next.searchParams.set('resultat', 'accepte');
    } catch {
      next.searchParams.set('resultat', 'indisponible');
    }
    return Response.redirect(next, 303);
  } catch (error) {
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Démonstration indisponible.' }, { status: 503 });
  }
}
