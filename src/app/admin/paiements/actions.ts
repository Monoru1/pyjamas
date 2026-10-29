'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { recoverPrivateCheckout } from '@/lib/payments/initialization';
import { UUID_PATTERN } from '@/lib/payments/read-body';

export async function recoverCheckout(form: FormData) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !(await auth.rpc('is_admin')).data) redirect('/admin/login');
  const id = String(form.get('payment_id') || '');
  if (!UUID_PATTERN.test(id)) redirect('/admin/paiements?notice=unavailable');
  const notice = await recoverPrivateCheckout(id, user.id);
  redirect(`/admin/paiements?notice=${notice}`);
}
