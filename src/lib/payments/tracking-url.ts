/**
 * Server-returned internal tracking link, re-anchored on the storefront the customer is using.
 * With a custom domain, the server's canonical URL may differ from the current origin (old Netlify
 * link): only the /paiement path and its query are kept, never another host.
 */
export function internalTrackingUrl(value: string, currentOrigin: string) {
  const url = new URL(value);
  // Same-origin links pass as before; another origin is only re-anchored if it is HTTPS.
  if (url.pathname !== '/paiement' || (url.protocol !== 'https:' && url.origin !== currentOrigin)) return null;
  return new URL(`${url.pathname}${url.search}`, currentOrigin).href;
}
