import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';
import type { Database } from './database.types';
import { trustedSiteOrigin } from '@/lib/security/urls';

const publicAdminPages = /^\/admin\/(login|forgot-password|reset-password)(?:\/|$)/;

function loginRedirect() {
  const url = new URL('/admin/login', trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL || process.env.PAYMENT_SITE_URL));
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Critical: never call Supabase Auth on catalogue/home/media pages.
  if (!pathname.startsWith('/admin') || publicAdminPages.test(pathname)) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request });

  try {
    const { supabaseUrl, supabaseKey } = getPublicEnv();
    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // A network or expired-session error must never crash the edge function.
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) return loginRedirect();

    const { data: allowed, error: roleError } = await supabase.rpc('is_admin');
    if (roleError || !allowed) return loginRedirect();

    return response;
  } catch (error) {
    // Fail closed: preserve a functioning storefront when Auth is unavailable.
    console.error('Admin session check failed', error instanceof Error ? error.name : 'unknown');
    return loginRedirect();
  }
}
