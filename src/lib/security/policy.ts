export function privateContentSecurityPolicy(nonce: string) {
  if (!/^[a-zA-Z0-9+/=_-]{20,128}$/.test(nonce)) throw new Error('Invalid CSP nonce');
  return `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://pukvrerdloudfiphomsj.supabase.co https://oxhymanjibveayhcaqvj.supabase.co; media-src 'self' blob: https://pukvrerdloudfiphomsj.supabase.co https://oxhymanjibveayhcaqvj.supabase.co; font-src 'self' data:; connect-src 'self' https://pukvrerdloudfiphomsj.supabase.co https://oxhymanjibveayhcaqvj.supabase.co; frame-src 'none'; upgrade-insecure-requests`;
}
export function privateResponseHeaders(headers: Headers, nonce: string) {
  headers.set('Content-Security-Policy', privateContentSecurityPolicy(nonce));
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Netlify-CDN-Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
}
