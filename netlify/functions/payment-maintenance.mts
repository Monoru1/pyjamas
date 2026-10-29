// Scheduled in UTC; every 5 minutes on the published deploy only.
const handler = async () => {
  if (process.env.FEDAPAY_ENABLED !== 'true') return;
  const origin = process.env.PAYMENT_SITE_URL;
  if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Maintenance origin missing');
  const response = await fetch(new URL('/.netlify/functions/payment-maintenance-background', origin), { method:'POST', headers:{authorization:`Bearer ${process.env.PAYMENT_RECONCILE_SECRET}`}, signal:AbortSignal.timeout(10_000) });
  if (response.status !== 202) throw new Error('Background maintenance did not start');
};
export default handler;
export const config = { schedule: '*/5 * * * *' };
