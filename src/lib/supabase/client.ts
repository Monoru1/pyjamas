import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';
import type { Database } from './database.types';
import { supabaseCookieOptions } from '@/lib/security/admin-session';

export function createClient() {
  const { supabaseUrl, supabaseKey } = getPublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseKey, { cookieOptions: supabaseCookieOptions(typeof window === 'undefined' || window.location.protocol === 'https:') });
}
