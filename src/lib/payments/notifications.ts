import 'server-only';
import { z } from 'zod';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { paymentDeployment } from './fedapay';
import { operationsDatabase } from './operations';
import { emailEvent, isEmailKind, renderOrderEmail, demoEmailOrder } from './order-email';

const emailAddress = z.email();
type Mail = { from: string; to: string; subject: string; text: string; html?: string };

class EmailDeliveryError extends Error {
  constructor(readonly permanent: boolean, code: string) { super(code); }
}

export function allowedEmail(to: string, testOnly = false) {
  return emailAddress.safeParse(to).success && (
    (!testOnly && paymentDeployment().context === 'production') ||
    (process.env.ORDER_TEST_EMAILS || '').split(',').some(value => value.trim().toLowerCase() === to.toLowerCase())
  );
}

export async function sendOrderEmail(mail: Mail, id: string, fetcher: typeof fetch = fetch) {
  if (process.env.ORDER_NOTIFICATIONS_ENABLED !== 'true') throw new Error('notifications_disabled');
  if (!allowedEmail(mail.to)) throw new EmailDeliveryError(true, 'test_recipient_not_allowed');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-${id}` },
    redirect: 'error', body: JSON.stringify(mail), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const permanent = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status);
    throw new EmailDeliveryError(permanent, permanent ? 'email_rejected' : 'email_provider_failed');
  }
  const result = await response.json();
  if (typeof result.id !== 'string' || !result.id.trim()) throw new Error('email_provider_invalid');
  return result.id as string;
}

export async function processNotificationJobs(limit = 2, jobId?: string) {
  if (process.env.ORDER_NOTIFICATIONS_ENABLED !== 'true') return 0;
  const db = operationsDatabase();
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { data: job, error } = await db.rpc('claim_order_email', jobId ? { p_job_id: jobId } : {});
    if (error) throw new Error('notification_queue_unavailable');
    if (!job) break;
    const kind = job.kind;
    if (!isEmailKind(kind)) throw new Error('invalid_email_job');
    const update = (fields: Record<string, unknown>) => db.from('notification_jobs').update(fields)
      .eq('id', job.id).eq('lease_token', job.lease_token).eq('status', 'sending');
    const defer = (reason: string, seconds: number, blocked = false) => update({
      status: blocked ? 'blocked' : 'pending', lease_until: null, last_error: reason,
      next_attempt_at: new Date(Date.now() + seconds * 1000).toISOString(),
    });
    const { data: order } = await db.from('orders').select('order_number,total,subtotal,status,payment_state,delivery,source').eq('id', job.order_id).single();
    if (!order) {
      await defer('order_unavailable', 3600);
      continue;
    }
    const customer = kind.startsWith('customer_');
    const event = emailEvent(kind);
    let trackingUrl: string | undefined;
    if (customer) {
      const { data: payment, error: paymentError } = await db.from('payment_attempts').select('customer,public_token').eq('order_id', job.order_id).maybeSingle();
      const stateMatches = event === 'failed' ? order.payment_state === 'failed'
        : order.payment_state === 'paid' && (event === 'paid' || event === order.status);
      if (paymentError || !stateMatches || payment?.customer?.emailConfirmation !== true
        || (kind !== 'customer_email' && payment.customer.emailTracking !== true)) {
        await defer(paymentError ? 'order_unavailable' : 'email_consent_or_payment_missing', 3600, !paymentError);
        continue;
      }
      if (payment.public_token) trackingUrl = `${trustedSiteOrigin(process.env.SITE_ORIGIN)}/paiement?reference=${encodeURIComponent(payment.public_token)}`;
    }
    const from = process.env.ORDER_EMAIL_FROM;
    const to = customer ? order.delivery?.email : process.env.ORDER_ADMIN_EMAIL;
    const demo = order.source === 'notification_demo';
    if (!process.env.RESEND_API_KEY || !from || !to) {
      await defer('email_not_configured_or_order_unavailable', 3600);
      continue;
    }
    if ((demo && paymentDeployment().context === 'production') || !allowedEmail(to, demo)) {
      await defer('test_recipient_not_allowed', 3600, true);
      continue;
    }
    if (job.first_delivery_at && Date.now() - Date.parse(job.first_delivery_at) > 12 * 3600_000) {
      await defer('delivery_window_exceeded', 3600, true);
      continue;
    }
    const { data: items, error: itemsError } = demo ? { data: [], error: null } : await db.from('order_items')
      .select('product_id,product_name,size_label,quantity,line_total').eq('order_id', job.order_id).order('id');
    if (itemsError) { await defer('order_items_unavailable', 3600); continue; }
    const productIds = [...new Set(items?.map(item => item.product_id).filter(Boolean) ?? [])];
    const { data: images } = productIds.length ? await db.from('product_images').select('product_id,url')
      .in('product_id', productIds).order('is_primary', { ascending: false }).order('sort_order').order('id') : { data: [] };
    const origin = trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL);
    const contact = emailAddress.safeParse(process.env.ORDER_CONTACT_EMAIL);
    const message = renderOrderEmail(kind, demo ? demoEmailOrder : {
      reference: order.order_number, total: Number(order.total), subtotal: Number(order.subtotal),
      shipping: typeof order.delivery?.shipping_xof === 'number' ? order.delivery.shipping_xof : undefined,
      lines: (items ?? []).map(item => ({ name: item.product_name, size: item.size_label,
        quantity: Number(item.quantity), total: Number(item.line_total),
        photo: images?.find(image => image.product_id === item.product_id)?.url,
      })),
    }, origin, contact.data, trackingUrl);
    const { data: started, error: startError } = await update({ first_delivery_at: job.first_delivery_at || new Date().toISOString() }).select('id');
    if (startError || started?.length !== 1) continue;
    try {
      const providerId = await sendOrderEmail({ from, to, ...message }, job.id);
      const { data: completed, error: completeError } = await update({
        status: 'sent', provider_message_id: providerId, sent_at: new Date().toISOString(), last_error: null, lease_until: null,
      }).select('id');
      if (!completeError && completed?.length === 1) sent++;
    } catch (error) {
      const permanent = error instanceof EmailDeliveryError && error.permanent;
      const reason = error instanceof EmailDeliveryError ? error.message : 'email_delivery_failed';
      await defer(reason, Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6)), permanent || job.attempts >= 5);
      console.error('order_notification_failed', { jobId: job.id, code: reason });
    }
  }
  return sent;
}
