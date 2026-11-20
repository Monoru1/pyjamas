// Supabase injects named modern keys as JSON. Never fall back to the Legacy JWT.
type Environment = (name: string) => string | undefined;
export function serverConfiguration(env: Environment, now: number) {
  const url = env('SUPABASE_URL');
  let keys: unknown;
  try { keys = JSON.parse(env('SUPABASE_SECRET_KEYS') ?? ''); } catch { throw new Error('ServerConfiguration'); }
  const keyName = env('ORDER_REQUEST_API_KEY_NAME') ?? 'default';
  const apiKey = keys && typeof keys === 'object' && !Array.isArray(keys) ? (keys as Record<string,unknown>)[keyName] : undefined;
  const hmacKey = env('ORDER_REQUEST_HMAC_SECRET');
  const readyAt = Date.parse(env('ORDER_REQUEST_HMAC_READY_AT') ?? '');
  // A dedicated random HMAC key and a provisioned activation time are mandatory.
  // No request is admitted during the transition. Keep production closed until a
  // complete five-minute quota window plus a one-minute in-flight margin has elapsed.
  if (!url || !/^https?:\/\//.test(url) || typeof apiKey !== 'string' || !/^sb_secret_[A-Za-z0-9_-]+$/.test(apiKey)
    || !hmacKey || !/^[a-f0-9]{64}$/.test(hmacKey) || hmacKey === apiKey || !Number.isFinite(readyAt)) throw new Error('ServerConfiguration');
  return { url, apiKey, hmacKey, enabled: env('ORDER_REQUESTS_ENABLED') === 'true' && now >= readyAt };
}
export async function requestBudgetSubject(secret: string, phone: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC',hash:'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('order-budget:'+phone));
  return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
}
