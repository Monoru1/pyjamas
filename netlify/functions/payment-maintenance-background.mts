// Runs only on published deploys. Preview acceptance invokes the protected API manually.
const handler = async (request: Request) => {
  const secret = process.env.PAYMENT_RECONCILE_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return;
  if (process.env.FEDAPAY_ENABLED !== 'true') return;
  const origin = process.env.PAYMENT_SITE_URL;
  if (!origin || !secret) throw new Error('Payment maintenance is not configured');
  const url = new URL('/api/payments/reconcile', origin);
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55_000) });
  if (!response.ok) throw new Error(`Payment maintenance failed: ${response.status}`);
  const result = await response.json();
  if (result.checked !== result.attempted) throw new Error('Some payments require intervention');
};
export default handler;
export const config = { background: true };
