import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// The path is deliberately fixed: never redirect to an arbitrary "next" URL.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const destination = request.nextUrl.clone();
  destination.search = '';
  destination.hash = '';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        destination.pathname = '/admin/reset-password';
        return NextResponse.redirect(destination);
      }
    } catch {
      // Expired or invalid links should not expose token or server details.
    }
  }

  destination.pathname = '/admin/forgot-password';
  return NextResponse.redirect(destination);
}
