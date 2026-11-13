import { createClient } from '@/lib/supabase/server';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { paymentDeployment } from '@/lib/payments/fedapay';
import { operationsDatabase } from '@/lib/payments/operations';
import { processNotificationJobs } from '@/lib/payments/notifications';
import { HttpInputError, requireBrowserOrigin } from '@/lib/payments/read-body';

export const runtime = 'nodejs';
const demoOrderNumber = 'MDP-DEMO-NOTIFICATIONS';

export async function POST(request: Request) {
  const origin = trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL);
  try {
    requireBrowserOrigin(request, origin);
    const deployment = paymentDeployment();
    if (deployment.context !== 'deploy-preview' || deployment.reviewId !== '14'
      || origin !== 'https://deploy-preview-14--pyjamas25.netlify.app'
      || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://oxhymanjibveayhcaqvj.supabase.co'
      || process.env.PAYMENT_DATABASE_ISOLATED !== 'true') return new Response(null, { status: 404 });

    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user || !(await auth.rpc('is_admin')).data) return new Response(null, { status: 403 });

    const db = operationsDatabase();
    const { data: order, error } = await db.from('orders').select('id')
      .eq('order_number', demoOrderNumber).eq('source', 'notification_demo').single();
    if (error || !order) throw new Error('demo_order_unavailable');
    const { data: jobs, error: jobsError } = await db.from('notification_jobs').select('id')
      .eq('order_id', order.id).in('kind', ['staff_email_new', 'staff_telegram_new']);
    if (jobsError || jobs?.length !== 2) throw new Error('demo_jobs_unavailable');
    await Promise.all(jobs.map(job => processNotificationJobs(1, job.id)));
    return Response.redirect(new URL('/admin/paiements?notice=notifications_processed', origin), 303);
  } catch (error) {
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Démonstration indisponible.' }, { status: 503 });
  }
}
