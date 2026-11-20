/**
 * Custom domain readiness (Terrain 15). The owner will buy a domain later; its exact
 * hostname is set ONCE in Netlify as SITE_CUSTOM_DOMAIN (e.g. "www.example.bj"), then the
 * site is redeployed. While it is unset, every origin stays https://pyjamas25.netlify.app.
 * No hostname is invented here.
 */
export const PRODUCTION_NETLIFY_ORIGIN = 'https://pyjamas25.netlify.app';

const HOSTNAME = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** A bare, lowercase public hostname, or null. Never a URL, port, IP, or Netlify subdomain. */
export function customSiteHost(value: string | undefined | null) {
  const host = String(value ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!HOSTNAME.test(host) || host.endsWith('.netlify.app') || host === 'netlify.app') return null;
  return host;
}

export function customSiteOrigin(env: Record<string, string | undefined> = process.env) {
  const host = customSiteHost(env.SITE_CUSTOM_DOMAIN);
  return host ? `https://${host}` : null;
}

/**
 * Origins a customer's browser may legitimately post from. Without a custom domain this is
 * exactly `primary` (unchanged behaviour). With one, the old Netlify address keeps working
 * during the transition (shared links, open tabs), and nothing else is accepted.
 */
export function allowedBrowserOrigin(request: Request, primary: string, env: Record<string, string | undefined> = process.env) {
  const custom = customSiteOrigin(env);
  const origin = request.headers.get('origin') ?? '';
  const allowed = custom ? [primary, custom, PRODUCTION_NETLIFY_ORIGIN] : [primary];
  return allowed.includes(origin) ? origin : primary;
}
