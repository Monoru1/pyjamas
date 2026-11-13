import 'server-only';
import { operationsDatabase } from './operations';
import { isWhatsAppJob, prepareOrderWhatsApp, sendOrderWhatsApp, WhatsAppRateLimitError } from './whatsapp';

type Mail = { from: string; to: string; subject: string; text: string };
export async function sendOrderEmail(mail: Mail, id: string, fetcher: typeof fetch = fetch) {
  if(process.env.ORDER_NOTIFICATIONS_ENABLED!=='true')throw new Error('notifications_disabled');
  if((process.env.PAYMENT_BUILD_CONTEXT||process.env.CONTEXT)!=='production'&&!(process.env.ORDER_TEST_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).includes(mail.to.toLowerCase()))throw new Error('test_recipient_not_allowed');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-${id}` },
    redirect: 'error', body: JSON.stringify(mail), signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('email_provider_failed');
  const result = await response.json();
  if (typeof result.id !== 'string' || !result.id.trim()) throw new Error('email_provider_invalid');
  return result.id as string;
}

export async function processNotificationJobs(limit = 2) {
  if(process.env.ORDER_NOTIFICATIONS_ENABLED!=='true')return 0;
  const db = operationsDatabase();
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { data: job, error } = await db.rpc('claim_notification_job');
    if (error) throw new Error('notification_queue_unavailable');
    if (!job) break;
    const { data: order } = await db.from('orders').select('order_number,total,status,payment_state,delivery,needs_attention').eq('id', job.order_id).single();
    const kind: string = job.kind;
    const whatsapp = isWhatsAppJob(kind);
    const from = process.env.ORDER_EMAIL_FROM;
    const recipient = kind === 'admin_email' ? process.env.ORDER_ADMIN_EMAIL : order?.delivery?.email;
    let whatsappConfig: ReturnType<typeof prepareOrderWhatsApp> | undefined;
    let waitReason: string | undefined;
    const updateJob = (fields: Record<string, unknown>) => db.from('notification_jobs').update(fields)
      .eq('id', job.id).eq('lease_token', job.lease_token).eq('status', 'sending');

    if (whatsapp && order) {
      const expectedPayment = kind === 'customer_whatsapp_failed' ? 'failed' : 'paid';
      const obsolete = kind !== 'staff_whatsapp_new' && (
        order.payment_state !== expectedPayment || order.status === 'cancelled' ||
        (kind === 'customer_whatsapp_ready' && order.status !== 'ready')
      );
      if (obsolete) {
        await updateJob({ status: 'blocked', last_error: 'notification_superseded', lease_until: null });
        continue;
      }
      try {
        const phone = kind === 'staff_whatsapp_new' ? process.env.ORDER_STAFF_WHATSAPP_PHONE : order.delivery?.phone;
        whatsappConfig = prepareOrderWhatsApp(kind, phone || '');
      } catch (error) {
        waitReason = error instanceof Error ? error.message : 'whatsapp_not_configured';
      }
    }
    if (!order || (whatsapp ? !whatsappConfig : order.payment_state !== 'paid' || !process.env.RESEND_API_KEY || !from || !recipient)) {
      await updateJob({
        status: 'pending',
        next_attempt_at: new Date(Date.now() + 3600_000).toISOString(),
        last_error: waitReason || (whatsapp ? 'whatsapp_not_configured_or_order_unavailable' : 'email_not_configured_or_order_unavailable'),
        lease_until: null,
      });
      continue;
    }
    try {
      if(whatsapp&&job.first_delivery_at){await updateJob({status:'blocked',last_error:'whatsapp_delivery_ambiguous',lease_until:null});continue;}
      if (job.first_delivery_at && Date.now()-Date.parse(job.first_delivery_at)>12*3600_000) {
        await updateJob({status:'blocked',last_error:'delivery_window_exceeded',lease_until:null});
        continue;
      }
      // Verify ownership on EVERY attempt, including retries after an ambiguous send.
      const {data:started,error:startError} = await updateJob({first_delivery_at:job.first_delivery_at || new Date().toISOString()}).select('id');
      if(startError || started?.length!==1) throw new Error('notification_lease_lost');
      const admin = job.kind === 'admin_email';
      const providerMessageId=whatsappConfig ? await sendOrderWhatsApp(whatsappConfig, order.order_number, Number(order.total)) : await sendOrderEmail({ from: from!, to: recipient,
        subject: `${admin ? 'Commande payée' : 'Confirmation de commande'} ${order.order_number}`,
        text: `La Maison des Pyjamas\nCommande ${order.order_number}\nPaiement confirmé : ${order.total} FCFA.\n${admin ? 'Consultez les coordonnées et articles dans l’administration.' : 'Votre commande est enregistrée. La boutique vous contactera pour la livraison.'}${order.needs_attention ? '\nUne vérification par la boutique est nécessaire.' : ''}`,
      }, job.id);
      const { data: completed, error: updateError } = await updateJob({ status: 'sent', provider_message_id:providerMessageId, sent_at: new Date().toISOString(), last_error: null, lease_until: null }).select('id');
      if (updateError || completed?.length !== 1) throw new Error('notification_lease_lost');
      sent++;
    } catch (error) {
      // A Meta 429 explicitly rejects the request. Timeouts and missing acknowledgements can hide a send.
      const rejected = error instanceof WhatsAppRateLimitError;
      const blocked = whatsapp ? !rejected || job.attempts >= 5
        : Date.now() - Date.parse(job.first_delivery_at || new Date().toISOString()) > 12 * 3600_000;
      await updateJob({
        status: blocked ? 'blocked' : 'pending',
        lease_until: null,
        ...(rejected ? { first_delivery_at: null } : {}),
        next_attempt_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6)) * 1000).toISOString(),
        last_error: rejected ? 'whatsapp_rate_limited' : whatsapp ? 'whatsapp_delivery_ambiguous' : 'email_delivery_failed',
      });
      console.error('order_notification_failed', { jobId: job.id });
    }
  }
  return sent;
}
