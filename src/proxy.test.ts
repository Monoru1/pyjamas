import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Regression: production admin server actions failed with "Unexpected end of form"
// because the proxy rebuilt the Request and consumed its body on Netlify Edge.
const auth = vi.hoisted(() => ({ admin: true, setCookie: false, otp: 'verified' as 'denied' | 'legacy' | 'required' | 'verified' | 'error', calls: [] as string[], authAge: 60, signOuts: [] as string[], claimsMode: 'ok' as 'ok' | 'none' | 'error' | 'network' }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (c: { name: string; value: string; options: object }[]) => void } }) => ({
    auth: { getClaims: async () => {
      if (auth.claimsMode === 'network') throw new TypeError('fetch failed');
      if (auth.claimsMode === 'none') return { data: null, error: null };
      if (auth.claimsMode === 'error') return { data: null, error: { name: 'AuthApiError', message: 'Invalid Refresh Token: Refresh Token Not Found' } };
      if (auth.setCookie) options.cookies.setAll([{ name: 'sb-session', value: 'refreshed', options: { path: '/' } }]);
      return { data: { claims: { sub: 'staff', amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) - auth.authAge }] } }, error: null };
    }, signOut: async ({ scope }: { scope: string }) => { auth.signOuts.push(scope); return { error: null }; } },
    rpc: async (name: string) => { auth.calls.push(name); if (name === 'admin_email_otp_status') return auth.otp === 'error' ? { data: null, error: { code: 'PGRST202' } } : { data: auth.otp }; return { data: auth.admin }; },
  }),
}));
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'fixture' }) }));
import { proxy } from './proxy';

const form = () => {
  const body = new FormData();
  body.set('$ACTION_ID_fixture', '');
  body.set('id', '6d403666-8612-4726-89a1-58d29b74c8a0');
  body.set('status', 'confirmed');
  return body;
};
afterEach(() => { auth.admin = true; auth.setCookie = false; auth.otp = 'verified'; auth.calls = []; auth.authAge = 60; auth.signOuts = []; auth.claimsMode = 'ok'; vi.unstubAllEnvs(); });

it('never consumes the body of an admin server action', async () => {
  const request = new NextRequest('https://pyjamas25.netlify.app/admin/commandes/x', { method: 'POST', body: form(), headers: { cookie: 'sb-session=old' } });
  const response = await proxy(request);
  expect(response.headers.get('x-middleware-next')).toBe('1');
  expect(request.bodyUsed).toBe(false);
  const received = await request.formData();
  expect(received.get('status')).toBe('confirmed');
  expect(received.get('id')).toBe('6d403666-8612-4726-89a1-58d29b74c8a0');
});

it('forwards the nonce and refreshed session cookie as headers only', async () => {
  auth.setCookie = true;
  const request = new NextRequest('https://pyjamas25.netlify.app/admin/commandes', { method: 'POST', body: form(), headers: { cookie: 'sb-session=old' } });
  const response = await proxy(request);
  expect(response.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
  expect(response.headers.get('x-middleware-request-cookie')).toContain('sb-session=refreshed');
  expect(response.headers.get('set-cookie')).toContain('sb-session=refreshed');
  expect(request.bodyUsed).toBe(false);
});

it('keeps non-admin requests and their body untouched', async () => {
  const request = new NextRequest('https://pyjamas25.netlify.app/paiement', { method: 'POST', body: form() });
  await proxy(request);
  expect(request.bodyUsed).toBe(false);
  expect((await request.formData()).get('status')).toBe('confirmed');
});

it('still redirects non-admin sessions away from the back-office', async () => {
  auth.otp = 'denied';
  const response = await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/commandes'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toContain('/admin/login');
});

it('does not rebuild the request in the proxy', () => {
  for (const file of ['src/proxy.ts', 'src/lib/supabase/proxy.ts'])
    expect(readFileSync(file, 'utf8')).not.toMatch(/new NextRequest\(|NextResponse\.next\(\{\s*request\s*\}\)/);
});

it('requires the email code before pages or protected server actions and retains refreshed cookies', async () => {
  auth.otp = 'required';
  auth.setCookie = true;
  for (const path of ['/admin/commandes', '/admin/mfa-extra']) {
    const request = new NextRequest(`https://pyjamas25.netlify.app${path}`, { method: 'POST', body: form() });
    const response = await proxy(request);
    expect(response.headers.get('location')).toBe('https://pyjamas25.netlify.app/admin/mfa');
    expect(response.headers.get('set-cookie')).toContain('sb-session=refreshed');
    expect(request.bodyUsed).toBe(false);
  }
  expect((await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/mfa'))).headers.get('x-middleware-next')).toBe('1');
  auth.otp = 'verified';
  expect((await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/commandes'))).headers.get('x-middleware-next')).toBe('1');
});

it('honours the previous server-side restriction during the owner pilot', async () => {
  auth.otp = 'legacy';
  auth.admin = false;
  const response = await proxy(new NextRequest('https://pyjamas25.netlify.app/admin'));
  expect(response.headers.get('location')).toBe('https://pyjamas25.netlify.app/admin/mfa');
  auth.admin = true;
  expect((await proxy(new NextRequest('https://pyjamas25.netlify.app/admin'))).headers.get('x-middleware-next')).toBe('1');
});

it('fails closed when verification status is unavailable or the session is ineligible', async () => {
  for (const status of ['denied', 'error'] as const) {
    auth.otp = status;
    const response = await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/mfa'));
    expect(response.headers.get('location')).toBe('https://pyjamas25.netlify.app/admin/login');
  }
});

// Terrain 16 — persistent session: 30 days after the password, a new sign-in (and MFA) is required.
it('keeps a 29-day-old session open without asking anything again', async () => {
  auth.authAge = 29 * 24 * 3600;
  expect((await proxy(new NextRequest('https://pyjamas25.netlify.app/admin'))).headers.get('x-middleware-next')).toBe('1');
  expect(auth.signOuts).toEqual([]);
});
it('ends a session 30 days after the password: server sign-out, cookies erased, back to login', async () => {
  auth.authAge = 30 * 24 * 3600 + 5;
  const response = await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/commandes', { headers: { cookie: 'sb-ref-auth-token=old; theme=x' } }));
  expect(response.headers.get('location')).toBe('https://pyjamas25.netlify.app/admin/login');
  expect(auth.signOuts).toEqual(['local']);
  const cleared = response.headers.get('set-cookie') ?? '';
  expect(cleared).toMatch(/sb-ref-auth-token=;/);
  expect(cleared).toMatch(/Max-Age=0/i);
  expect(cleared).not.toContain('theme=');
});

it('fails closed to the login page: deleted cookies, invalid refresh token, network outage', async () => {
  for (const mode of ['none', 'error', 'network'] as const) {
    auth.claimsMode = mode;
    const response = await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/commandes'));
    expect(response.headers.get('location'), mode).toBe('https://pyjamas25.netlify.app/admin/login');
  }
});
