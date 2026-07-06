import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';
import type { Database } from './database.types';

export function createClient() {
  const { supabaseUrl, supabaseKey } = getPublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
