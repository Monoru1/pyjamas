import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Regression: production admin server actions failed with "Unexpected end of form"
// because the proxy rebuilt the Request and consumed its body on Netlify Edge.
const auth = vi.hoisted(() => ({ admin: true, setCookie: false }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (c: { name: string; value: string; options: object }[]) => void } }) => ({
    auth: { getClaims: async () => {
      if (auth.setCookie) options.cookies.setAll([{ name: 'sb-session', value: 'refreshed', options: { path: '/' } }]);
      return { data: { claims: { sub: 'staff' } }, error: null };
    } },
    rpc: async () => ({ data: auth.admin, error: null }),
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
afterEach(() => { auth.admin = true; auth.setCookie = false; });

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
  auth.admin = false;
  const response = await proxy(new NextRequest('https://pyjamas25.netlify.app/admin/commandes'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toContain('/admin/login');
});

it('does not rebuild the request in the proxy', () => {
  for (const file of ['src/proxy.ts', 'src/lib/supabase/proxy.ts'])
    expect(readFileSync(file, 'utf8')).not.toMatch(/new NextRequest\(|NextResponse\.next\(\{\s*request\s*\}\)/);
});
