import { createClient } from '@/lib/supabase/server';
import { prepareRecipeStorage } from '@/lib/supabase/recipe-storage';
import { readLimitedBody, requireBrowserOrigin, HttpInputError } from '@/lib/payments/read-body';
import { trustedSiteOrigin } from '@/lib/security/urls';
export const runtime='nodejs';
export async function POST(request:Request) {
  const origin=trustedSiteOrigin(process.env.SITE_ORIGIN||process.env.DEPLOY_PRIME_URL||process.env.PAYMENT_SITE_URL);
  try {
    requireBrowserOrigin(request,origin);
    const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
    if(!user||!(await auth.rpc('is_manager')).data)return Response.json({error:'Accès responsable requis.'},{status:403});
    if((await readLimitedBody(request,256)).length)return Response.json({error:'Formulaire invalide.'},{status:400});
    await prepareRecipeStorage();
    return Response.redirect(new URL('/admin/medias?notice=storage_ready',origin),303);
  }catch(error){if(error instanceof HttpInputError)return Response.json({error:error.message},{status:error.status});
    console.error('recipe_storage_preparation_failed',{errorType:error instanceof Error?error.name:'unknown'});
    return Response.redirect(new URL('/admin/medias?notice=storage_unavailable',origin),303);
  }
}
