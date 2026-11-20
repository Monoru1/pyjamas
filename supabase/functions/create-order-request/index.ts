import { createClient } from 'npm:@supabase/supabase-js@2.110.2';
import { createOrderRequestHandler } from './handler.ts';

Deno.serve(createOrderRequestHandler({
  env: name => Deno.env.get(name),
  createAdmin: (url, key) => {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return { rpc: (name, args) => client.rpc(name, args) };
  },
}));
