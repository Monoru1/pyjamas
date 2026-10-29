import 'server-only';
import { paymentDatabase } from './server';

type Mail = { from: string; to: string; subject: string; text: string };
export async function sendOrderEmail(mail: Mail, id: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-${id}` },
    body: JSON.stringify(mail), signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('email_provider_failed');
  const result = await response.json();
  if (typeof result.id !== 'string') throw new Error('email_provider_invalid');
}

export async function processNotificationJobs(limit = 2) {
  const db = paymentDatabase();
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { data: job, error } = await db.rpc('claim_notification_job');
    if (error) throw new Error('notification_queue_unavailable');
    if (!job) break;
    const { data: order } = await db.from('orders').select('order_number,total,payment_state,delivery,needs_attention').eq('id', job.order_id).single();
    const from = process.env.ORDER_EMAIL_FROM;
    const recipient = job.kind === 'admin_email' ? process.env.ORDER_ADMIN_EMAIL : order?.delivery?.email;
    const configured = Boolean(process.env.RESEND_API_KEY && from && recipient && order?.payment_state === 'paid');
    if (!configured || !order) {
      // Durable, visible waiting state; no assertion that a message was sent.
      await db.from('notification_jobs').update({ status: 'pending', next_attempt_at: new Date(Date.now() + 3600_000).toISOString(), last_error: 'email_not_configured_or_order_unavailable', lease_until: null }).eq('id', job.id).eq('lease_token', job.lease_token);
      continue;
    }
    try {
      if (job.first_delivery_at && Date.now()-Date.parse(job.first_delivery_at)>12*3600_000) {
        await db.from('notification_jobs').update({status:'blocked',last_error:'delivery_window_exceeded',lease_until:null}).eq('id',job.id).eq('lease_token',job.lease_token);
        continue;
      }
      if (!job.first_delivery_at) {
        const {data:started,error:startError} = await db.from('notification_jobs').update({first_delivery_at:new Date().toISOString()}).eq('id',job.id).eq('lease_token',job.lease_token).select('id');
        if(startError || started?.length!==1) throw new Error('notification_lease_lost');
      }
      const admin = job.kind === 'admin_email';
      await sendOrderEmail({ from: from!, to: recipient,
        subject: `${admin ? 'Commande payée' : 'Confirmation de commande'} ${order.order_number}`,
        text: `La Maison des Pyjamas\nCommande ${order.order_number}\nPaiement confirmé : ${order.total} FCFA.\n${admin ? 'Consultez les coordonnées et articles dans l’administration.' : 'Votre commande est enregistrée. La boutique vous contactera pour la livraison.'}${order.needs_attention ? '\nUne vérification par la boutique est nécessaire.' : ''}`,
      }, job.id);
      const { error: updateError } = await db.from('notification_jobs').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null, lease_until: null }).eq('id', job.id).eq('lease_token', job.lease_token);
      if (updateError) throw updateError;
      sent++;
    } catch {
      // Resend retains idempotency keys for 24h. Stop automatic retries after
      // 12h so an ambiguous success is never resent beyond that window.
      const blocked = Date.now() - Date.parse(job.first_delivery_at || new Date().toISOString()) > 12 * 3600_000;
      await db.from('notification_jobs').update({ status: blocked ? 'blocked' : 'pending', lease_until: null,
        next_attempt_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6)) * 1000).toISOString(), last_error: 'email_delivery_failed' }).eq('id', job.id).eq('lease_token', job.lease_token);
      console.error('order_notification_failed', { jobId: job.id });
    }
  }
  return sent;
}
