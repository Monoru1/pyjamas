import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';
import type { Database } from './database.types';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { adminSessionExpired, capAdminCookieAge, supabaseCookieOptions } from '@/lib/security/admin-session';

const publicAdminPages = /^\/admin\/(login|forgot-password|reset-password)(?:\/|$)/;

function loginRedirect() {
  const url = new URL('/admin/login', trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL || process.env.PAYMENT_SITE_URL));
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

/** Session past its 30-day limit: Supabase cookies are removed so the browser cannot replay them. */
function expiredRedirect(request: NextRequest) {
  const response = loginRedirect();
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith('sb-')) response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return response;
}

function mfaRedirect() {
  const url = new URL('/admin/mfa', trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL || process.env.PAYMENT_SITE_URL));
  url.search = '';
  return NextResponse.redirect(url);
}

/** Forwards headers only: the request body must stay untouched for server actions. */
export async function updateSession(request: NextRequest, headers: Headers = new Headers(request.headers)) {
  const pathname = request.nextUrl.pathname;
  // Critical: never call Supabase Auth on catalogue/home/media pages.
  if (!pathname.startsWith('/admin') || publicAdminPages.test(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const forward = () => {
    // request.cookies.set() keeps the Cookie header current; copy it, nothing else.
    const cookie = request.headers.get('cookie');
    if (cookie === null) headers.delete('cookie'); else headers.set('cookie', cookie);
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();

  try {
    const { supabaseUrl, supabaseKey } = getPublicEnv();
    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookieOptions: supabaseCookieOptions(),
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, capAdminCookieAge(options)));
        },
      },
    });

    // A network or expired-session error must never crash the edge function.
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) return loginRedirect();

    // 30 days after the last password/e-mail authentication, a new sign-in (and MFA) is required,
    // however often the access token was refreshed. The current session is ended server-side.
    if (adminSessionExpired(claims.claims)) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      return expiredRedirect(request);
    }

    const status = await supabase.rpc('admin_email_otp_status');
    if (status.error || !status.data || status.data === 'denied') return loginRedirect();

    if (pathname !== '/admin/mfa') {
      const allowed = status.data === 'verified' ||
        (status.data === 'legacy' && (await supabase.rpc('is_admin')).data === true);
      if (!allowed) {
        const redirect = mfaRedirect();
        for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
        return redirect;
      }
    }

    return response;
  } catch (error) {
    // Fail closed: preserve a functioning storefront when Auth is unavailable.
    console.error('Admin session check failed', error instanceof Error ? error.name : 'unknown');
    return loginRedirect();
  }
}
