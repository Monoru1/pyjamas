import {createClient} from '@/lib/supabase/server';
import {operationsDatabase} from '@/lib/payments/operations';
import {processNotificationJobs} from '@/lib/payments/notifications';
import {readLimitedBody,requireBrowserOrigin,HttpInputError,UUID_PATTERN} from '@/lib/payments/read-body';
import {trustedSiteOrigin} from '@/lib/security/urls';
export const runtime='nodejs';
export async function POST(request:Request) {
 const origin=trustedSiteOrigin(process.env.SITE_ORIGIN||process.env.DEPLOY_PRIME_URL);
 try {
  requireBrowserOrigin(request,origin);const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
  if(!user||!(await auth.rpc('is_admin')).data)return Response.json({error:'Accès réservé au personnel.'},{status:403});
  if(process.env.ORDER_NOTIFICATIONS_ENABLED!=='true'&&process.env.ORDER_TELEGRAM_ENABLED!=='true')return Response.redirect(new URL('/admin/paiements?notice=notifications_disabled',origin),303);
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return Response.json({error:'Formulaire requis.'},{status:415});
  const form=new URLSearchParams(await readLimitedBody(request,1000));const id=form.get('job_id')||'';
  if(form.size!==1||!UUID_PATTERN.test(id))return Response.json({error:'Référence invalide.'},{status:400});
  // Only advance a pending job. The worker claims the exact id under a lease.
  const {data,error}=await operationsDatabase().from('notification_jobs').update({next_attempt_at:new Date().toISOString()}).eq('id',id).eq('status','pending').is('lease_until',null).lte('next_attempt_at',new Date().toISOString()).select('id');
  if(error||data?.length!==1)return Response.json({error:'Notification indisponible ou délai de reprise en cours.'},{status:409});
  await processNotificationJobs(1,id);return Response.redirect(new URL('/admin/paiements?notice=notifications_processed',origin),303);
 }catch(error){if(error instanceof HttpInputError)return Response.json({error:error.message},{status:error.status});return Response.json({error:'Traitement momentanément indisponible.'},{status:503});}
}
