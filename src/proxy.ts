import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { privateContentSecurityPolicy, privateResponseHeaders } from '@/lib/security/policy';
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  // Only headers are forwarded. Never rebuild the Request object from the incoming one:
  // on Netlify Edge that consumes the original body stream and every admin server
  // action then fails with "Unexpected end of form".
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', privateContentSecurityPolicy(nonce));
  const response = request.nextUrl.pathname.startsWith('/admin')
    ? await updateSession(request, headers)
    : NextResponse.next({ request: { headers } });
  privateResponseHeaders(response.headers, nonce);
  return response;
}
export const config = { matcher: ['/admin', '/admin/:path*', '/paiement', '/auth/callback'] };
