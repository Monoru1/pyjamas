import 'server-only';
import {createClient} from '@supabase/supabase-js';
/** Operational outbox is independent from payment admission; no provider call here. */
export function operationsDatabase() {
 const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'invalid:');
 if(url.protocol!=='https:'||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('operations_not_configured');
 if((process.env.PAYMENT_BUILD_CONTEXT||process.env.CONTEXT)!=='production'&&(process.env.PAYMENT_DATABASE_ISOLATED!=='true'||url.hostname==='pukvrerdloudfiphomsj.supabase.co'))throw new Error('isolated_database_required');
 return createClient(url.origin,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
