import 'server-only';
import { paymentDeployment } from './fedapay';

const templates = {
  customer_whatsapp: 'WHATSAPP_ORDER_TEMPLATE',
  staff_whatsapp_new: 'WHATSAPP_STAFF_NEW_TEMPLATE',
  customer_whatsapp_failed: 'WHATSAPP_PAYMENT_FAILED_TEMPLATE',
  customer_whatsapp_ready: 'WHATSAPP_ORDER_READY_TEMPLATE',
  customer_whatsapp_delivered: 'WHATSAPP_ORDER_DELIVERED_TEMPLATE',
} as const;

export type WhatsAppJob = keyof typeof templates;

export function isWhatsAppJob(kind: string): kind is WhatsAppJob {
  return Object.hasOwn(templates, kind);
}

export class WhatsAppRateLimitError extends Error {}

export function prepareOrderWhatsApp(kind: WhatsAppJob, phone: string) {
  const env = process.env;
  if (env.ORDER_NOTIFICATIONS_ENABLED !== 'true' || env.ORDER_WHATSAPP_ENABLED !== 'true') {
    throw new Error('whatsapp_disabled');
  }
  const version = env.WHATSAPP_GRAPH_VERSION;
  const sender = env.WHATSAPP_PHONE_NUMBER_ID;
  const token = env.WHATSAPP_ACCESS_TOKEN;
  const template = env[templates[kind]];
  const language = env.WHATSAPP_TEMPLATE_LANGUAGE;
  if (!/^v\d+\.\d+$/.test(version || '') || !/^\d+$/.test(sender || '') || !token || !template || !language) {
    throw new Error('whatsapp_not_configured');
  }
  const production = paymentDeployment().context === 'production';
  const testPhone = kind === 'staff_whatsapp_new' ? undefined : env.ORDER_TEST_CUSTOMER_PHONE;
  const recipient = (production ? phone : testPhone || phone).replace(/^\+/, '');
  if (!/^[1-9]\d{8,14}$/.test(recipient)) throw new Error('invalid_recipient');
  if (!production && !(env.ORDER_TEST_PHONES || '').split(',').map(value => value.trim().replace(/^\+/, '')).includes(recipient)) {
    throw new Error('test_recipient_not_allowed');
  }
  return { version, sender, token, template, language, recipient };
}

export async function sendOrderWhatsApp(
  config: ReturnType<typeof prepareOrderWhatsApp>, orderNumber: string, total: number, fetcher: typeof fetch = fetch,
) {
  const { version, sender, token, template, language, recipient } = config;
  const response = await fetcher(`https://graph.facebook.com/${version}/${sender}/messages`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: template,
        language: { code: language },
        components: [{ type: 'body', parameters: [
          { type: 'text', text: orderNumber },
          { type: 'text', text: `${total} XOF` },
        ] }],
      },
    }),
  });
  if (response.status === 429) throw new WhatsAppRateLimitError('whatsapp_rate_limited');
  if (!response.ok) throw new Error('whatsapp_delivery_failed');
  const result = await response.json();
  const id: unknown = result.messages?.[0]?.id;
  if (typeof id !== 'string' || !id.trim()) throw new Error('whatsapp_acknowledgement_invalid');
  return id;
}
