import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { privateContentSecurityPolicy, privateResponseHeaders } from '@/lib/security/policy';
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', privateContentSecurityPolicy(nonce));
  const secured = new NextRequest(request, { headers });
  const response = request.nextUrl.pathname.startsWith('/admin')
    ? await updateSession(secured)
    : NextResponse.next({ request: { headers } });
  privateResponseHeaders(response.headers, nonce);
  return response;
}
export const config = { matcher: ['/admin', '/admin/:path*', '/paiement', '/auth/callback'] };
