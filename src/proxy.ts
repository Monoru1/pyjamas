import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Restrict authentication checks to the private admin area, never public pages.
export const config = { matcher: ['/admin', '/admin/:path*'] };
