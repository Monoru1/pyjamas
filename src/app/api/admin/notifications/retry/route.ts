import { createClient } from '@/lib/supabase/server';
import { operationsDatabase } from '@/lib/payments/operations';
import { processNotificationJobs } from '@/lib/payments/notifications';
import { readLimitedBody, requireBrowserOrigin, HttpInputError, UUID_PATTERN } from '@/lib/payments/read-body';
import { trustedSiteOrigin } from '@/lib/security/urls';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL);
  try {
    requireBrowserOrigin(request, origin);
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user || !(await auth.rpc('is_admin')).data) return Response.json({ error: 'Accès réservé au personnel.' }, { status: 403 });
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return Response.json({ error: 'Formulaire requis.' }, { status: 415 });
    const form = new URLSearchParams(await readLimitedBody(request, 1000));
    const id = form.get('job_id') || '';
    const orderId = form.get('order_id');
    if (form.size !== (orderId === null ? 1 : 2) || !UUID_PATTERN.test(id) || (orderId !== null && !UUID_PATTERN.test(orderId))) {
      return Response.json({ error: 'Référence invalide.' }, { status: 400 });
    }
    // The identifier is validated above: the return path can only be this order page.
    const back = (notice: string) => Response.redirect(new URL(orderId
      ? `/admin/commandes/${orderId.toLowerCase()}?notice=${notice}` : `/admin/paiements?notice=${notice}`, origin), 303);
    if (process.env.ORDER_NOTIFICATIONS_ENABLED !== 'true') return back('notifications_disabled');
    // Atomic: re-arms the job and journals the staff action, or refuses when a resend is unsafe.
    const { data, error } = await operationsDatabase().rpc('staff_retry_notification', { p_job_id: id, p_staff: user.id });
    if (error || data !== true) {
      return orderId ? back('retry_refused') : Response.json({ error: 'Notification indisponible ou reprise non sûre.' }, { status: 409 });
    }
    await processNotificationJobs(1, id);
    return back('notifications_processed');
  } catch (error) {
    if (error instanceof HttpInputError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Traitement momentanément indisponible.' }, { status: 503 });
  }
}
