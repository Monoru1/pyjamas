import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Anonymous, cookie-free client for read-only public content.
 * This preserves ISR/prerendering; NEVER use it for privileged admin writes.
 * RLS keeps hidden products/orders out of the public schema.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }) },
  });
}
