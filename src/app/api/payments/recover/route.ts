import { createClient } from '@/lib/supabase/server';
import { recoverPrivateCheckout } from '@/lib/payments/initialization';
import { readLimitedBody, requireBrowserOrigin, HttpInputError, UUID_PATTERN } from '@/lib/payments/read-body';
import { trustedSiteOrigin } from '@/lib/security/urls';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const origin=trustedSiteOrigin(process.env.SITE_ORIGIN||process.env.DEPLOY_PRIME_URL||process.env.PAYMENT_SITE_URL);
  try {
    requireBrowserOrigin(request,origin);
    const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
    if(!user||!(await auth.rpc('is_admin')).data)return Response.json({error:'Accès réservé au personnel.'},{status:403});
    if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return Response.json({error:'Formulaire attendu.'},{status:415});
    const form=new URLSearchParams(await readLimitedBody(request,1000));const id=form.get('payment_id')||'';
    if(form.size!==1||!UUID_PATTERN.test(id))return Response.json({error:'Référence invalide.'},{status:400});
    const notice=await recoverPrivateCheckout(id,user.id);
    return Response.redirect(new URL(`/admin/paiements?notice=${notice}`,origin),303);
  }catch(error){if(error instanceof HttpInputError)return Response.json({error:error.message},{status:error.status});
    console.error('payment_recovery_request_failed',{errorType:error instanceof Error?error.name:'unknown'});
    return Response.redirect(new URL('/admin/paiements?notice=unavailable',origin),303);
  }
}
