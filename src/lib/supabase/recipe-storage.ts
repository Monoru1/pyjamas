import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { paymentDeployment } from '@/lib/payments/fedapay';

/** Staff role and browser origin are checked by the calling route. */
export async function prepareRecipeStorage() {
  const deployment=paymentDeployment();const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(url!=='https://oxhymanjibveayhcaqvj.supabase.co'||!key||deployment.context!=='deploy-preview'||deployment.reviewId!=='11'||deployment.previewOrigin!=='https://deploy-preview-11--pyjamas25.netlify.app')throw new Error('Isolated recipe required');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:buckets,error}=await db.storage.listBuckets();if(error)throw new Error('Storage unavailable');
  for(const name of ['site-assets','product-images','christmas-videos']) {
    const existing=buckets.find(b=>b.id===name);
    if(existing){if(!existing.public)throw new Error('Existing bucket settings require review');continue;}
    const {error}=await db.storage.createBucket(name,{public:true,fileSizeLimit:52428800,allowedMimeTypes:name==='christmas-videos'?['video/mp4','video/webm']:['image/jpeg','image/png','image/webp']});
    if(error)throw new Error('Bucket preparation failed');
  }
}
