// Bounded, non-destructive checks: no login attempts, customer writes or provider calls.
// Usage: node scripts/security-smoke.mjs https://<authorized-site>
import assert from 'node:assert/strict';
const base = new URL(process.argv[2] || 'https://pyjamas25.netlify.app').origin;
const results = [];
async function request(path, expected, options = {}) {
  const response = await fetch(base + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const html = await response.text();
  assert.equal(response.status, expected, `${path}: expected ${expected}, received ${response.status}`);
  results.push({ path, method: options.method || 'GET', status: response.status });
  return { response, html };
}
let previousCsp;
for (const path of ['/admin/login', '/admin/login', '/admin/forgot-password', '/admin/reset-password', '/paiement']) {
  const { response, html } = await request(path, 200);
  const csp = response.headers.get('content-security-policy') || '';
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, `${path}: nonce missing`);
  assert.ok(csp.includes("'strict-dynamic'") && !csp.split('script-src ')[1].split(';')[0].includes('unsafe-inline'));
  // Netlify injects its collaboration drawer only in deploy previews. It has no nonce
  // and is deliberately blocked on private pages; never relax CSP for that drawer.
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].filter(script =>
    !(new URL(base).hostname.startsWith('deploy-preview-') && /^ async src="\/\.netlify\/scripts\/cdp"$/.test(script[1])));
  assert.ok(scripts.length > 0 && scripts.every(script => script[1].includes(`nonce="${nonce}"`)), `${path}: script nonce mismatch`);
  assert.ok(response.headers.get('cache-control')?.includes('no-store'));
  if (previousCsp) assert.notEqual(csp, previousCsp, 'Nonce reused between requests');
  previousCsp = csp;
}
for (const headers of [{}, { 'x-middleware-subrequest': 'src/proxy:src/proxy:src/proxy:src/proxy:src/proxy' }, { cookie: 'sb-pukvrerdloudfiphomsj-auth-token=invalid' }]) {
  const { response } = await request('/admin', 307, { headers });
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/admin/login');
  assert.equal(new URL(response.headers.get('location'), base).origin, base);
}
const callback = await request('/auth/callback?next=https%3A%2F%2Fexample.invalid', 307);
assert.equal(new URL(callback.response.headers.get('location'), base).origin, base);
assert.equal(new URL(callback.response.headers.get('location'), base).pathname, '/admin/forgot-password');
for (const path of ['/.env', '/.git/config', '/package.json']) await request(path, 404);
for (const path of ['/', '/collections', '/catalogue', '/contact', '/politique-de-confidentialite', '/cookies']) {
  const { response, html } = await request(path, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('strict-transport-security'));
  if (path === '/collections') assert.ok(html.includes('Lire : Un Noël en famille') && html.includes('films :'));
  if (path === '/contact') assert.ok(html.includes('https://www.google.com/maps?q=') && html.includes('<iframe'), 'Google Maps embed missing');
}
await request('/api/payments/status?reference=' + '-'.repeat(36), 400);
await request('/api/payments/reconcile', 401, { method: 'POST' });
const post = (body, headers = {}) => ({ method: 'POST', body, headers: { 'content-type': 'application/json', origin: base, ...headers } });
await request('/api/payments/checkout', 415, post('{}', { 'content-type': 'text/plain' }));
await request('/api/payments/checkout', 403, post('{}', { origin: 'https://example.invalid' }));
await request('/api/payments/checkout', 400, post('{'));
await request('/api/payments/checkout', 413, post(' '.repeat(11000)));
await request('/api/payments/webhook', 415, post('{}', { 'content-type': 'text/plain' }));
await request('/api/payments/webhook', 413, post(' '.repeat(65000)));
console.log(JSON.stringify({ base, checkedAt: new Date().toISOString(), checks: results.length, results }, null, 2));
