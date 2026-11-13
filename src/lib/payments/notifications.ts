import 'server-only';
import { z } from 'zod';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { paymentDeployment } from './fedapay';
import { operationsDatabase } from './operations';
import { sendStaffTelegram, TelegramDeliveryError } from './telegram';

const staffEvents: Record<string, string> = {
  new: 'Nouvelle commande en attente',
  paid: 'Paiement confirmé',
  failed: 'Paiement refusé',
  ready: 'Commande prête',
  delivered: 'Commande livrée',
};

const emailAddress = z.email();
type Mail = { from: string; to: string; subject: string; text: string; html?: string };

class EmailDeliveryError extends Error {
  constructor(readonly permanent: boolean, code: string) { super(code); }
}

function allowedEmail(to: string, testOnly = false) {
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function orderMessage(order: { order_number: string; total: unknown; source?: string }, kind: string) {
  const customer = kind === 'customer_email';
  const event = kind === 'admin_email' || customer ? 'paid' : kind.replace(/^staff_(email|telegram)_/, '');
  const title = `${order.source === 'notification_demo' ? 'Démo · ' : ''}${staffEvents[event]}`;
  const amount = `${new Intl.NumberFormat('fr-FR').format(Number(order.total))} FCFA`;
  const reference = order.order_number;
  const adminUrl = `${trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL)}/admin/commandes`;
  const text = `La Maison des Pyjamas\n${title}\nCommande ${reference}\n${amount}${customer ? '' : `\n${adminUrl}`}`;
  const html = `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#faf5f2;color:#292322;font:16px/1.5 Arial,sans-serif"><div style="max-width:540px;margin:auto;padding:24px"><p style="font-size:14px;color:#7a2535">La Maison des Pyjamas</p><h1 style="font-size:24px">${escapeHtml(title)}</h1><p>Commande <strong>${escapeHtml(reference)}</strong><br>${escapeHtml(amount)}</p>${customer ? '' : `<p><a style="display:inline-block;padding:12px 16px;background:#7a2535;color:#fff;border-radius:6px" href="${adminUrl}">Voir les commandes</a></p>`}</div></body></html>`;
  return { text, html, subject: `${title} · ${reference}` };
}

export async function processNotificationJobs(limit = 2, jobId?: string) {
  const email = process.env.ORDER_NOTIFICATIONS_ENABLED === 'true';
  const telegram = process.env.ORDER_TELEGRAM_ENABLED === 'true';
  if (!email && !telegram) return 0;
  const db = operationsDatabase();
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { data: job, error } = await db.rpc('claim_staff_notification_job', {
      p_email: email, p_telegram: telegram, ...(jobId ? { p_job_id: jobId } : {}),
    });
    if (error) throw new Error('notification_queue_unavailable');
    if (!job) break;
    const isTelegram = job.kind.startsWith('staff_telegram_');
    const update = (fields: Record<string, unknown>) => db.from('notification_jobs').update(fields)
      .eq('id', job.id).eq('lease_token', job.lease_token).eq('status', 'sending');
    const defer = (reason: string, seconds: number, blocked = false, clearAttempt = false) => update({
      status: blocked ? 'blocked' : 'pending', lease_until: null, last_error: reason,
      next_attempt_at: new Date(Date.now() + seconds * 1000).toISOString(),
      ...(clearAttempt ? { first_delivery_at: null } : {}),
    });
    const { data: order } = await db.from('orders').select('order_number,total,payment_state,delivery,source').eq('id', job.order_id).single();
    if (!order) {
      await defer('order_unavailable', 3600);
      continue;
    }
    const customer = job.kind === 'customer_email';
    if (customer) {
      const { data: payment, error: paymentError } = await db.from('payment_attempts').select('customer').eq('order_id', job.order_id).maybeSingle();
      if (paymentError || order.payment_state !== 'paid' || payment?.customer?.emailConfirmation !== true) {
        await defer(paymentError ? 'order_unavailable' : 'email_consent_or_payment_missing', 3600, !paymentError);
        continue;
      }
    }
    const from = process.env.ORDER_EMAIL_FROM;
    const to = customer ? order.delivery?.email : process.env.ORDER_ADMIN_EMAIL;
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = process.env.TELEGRAM_STAFF_CHAT_ID || '';
    const demo = order.source === 'notification_demo';
    if (isTelegram ? !/^\d+:[\w-]+$/.test(token) || !/^-?[1-9]\d*$/.test(chatId) : !process.env.RESEND_API_KEY || !from || !to) {
      await defer(isTelegram ? 'telegram_not_configured' : 'email_not_configured_or_order_unavailable', 3600);
      continue;
    }
    if ((demo && paymentDeployment().context === 'production') || (!isTelegram && !allowedEmail(to, demo))) {
      await defer('test_recipient_not_allowed', 3600, true);
      continue;
    }
    if (isTelegram && job.first_delivery_at) {
      await defer('telegram_delivery_uncertain', 3600, true);
      continue;
    }
    if (job.first_delivery_at && Date.now() - Date.parse(job.first_delivery_at) > 12 * 3600_000) {
      await defer('delivery_window_exceeded', 3600, true);
      continue;
    }
    const { data: started, error: startError } = await update({ first_delivery_at: job.first_delivery_at || new Date().toISOString() }).select('id');
    if (startError || started?.length !== 1) continue;
    const message = orderMessage(order, job.kind);
    try {
      const providerId = isTelegram
        ? await sendStaffTelegram(token, chatId, message.text)
        : await sendOrderEmail({ from: from!, to, ...message }, job.id);
      const { data: completed, error: completeError } = await update({
        status: 'sent', provider_message_id: providerId, sent_at: new Date().toISOString(), last_error: null, lease_until: null,
      }).select('id');
      if (!completeError && completed?.length === 1) sent++;
    } catch (error) {
      const retryAfter = error instanceof TelegramDeliveryError ? error.retryAfter : undefined;
      const permanent = isTelegram ? retryAfter === undefined : error instanceof EmailDeliveryError && error.permanent;
      const reason = error instanceof TelegramDeliveryError || error instanceof EmailDeliveryError
        ? error.message : isTelegram ? 'telegram_delivery_uncertain' : 'email_delivery_failed';
      await defer(reason, Math.max(retryAfter || 0, Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6))), permanent || job.attempts >= 5, retryAfter !== undefined);
      console.error('order_notification_failed', { jobId: job.id, code: reason });
    }
  }
  return sent;
}
