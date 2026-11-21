import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { revokeAdminSessions, signOutAdmin } from '@/app/admin/actions';
import { MfaPanel } from './mfa-panel';

export const metadata = { robots: { index: false, follow: false }, title: 'Vérification et sessions' };

export default async function AdminMfaPage() {
  const supabase = await createClient();
  const { data: status, error } = await supabase.rpc('admin_email_otp_status');
  if (error || !status || status === 'denied') redirect('/admin/login');

  const canManage = status === 'verified' || (status === 'legacy' && (await supabase.rpc('is_admin')).data === true);
  return (
    <main className="login-page">
      <section>
        <p>LA MAISON DES PYJAMAS</p>
        <h1>{canManage ? 'Vos sessions' : 'Vérification par e-mail'}</h1>
        {canManage ? (
          <div className="login-form">
            {status === 'verified' && <p>Ce compte a validé son code par e-mail pour cet appareil.</p>}
            <p>La session peut rester ouverte jusqu’à 30 jours après la saisie du mot de passe.</p>
            <form action={revokeAdminSessions}>
              <input type="hidden" name="scope" value="others" />
              <button type="submit">Déconnecter les autres appareils</button>
            </form>
            <form action={revokeAdminSessions}>
              <input type="hidden" name="scope" value="global" />
              <button type="submit">Déconnecter tous les appareils</button>
            </form>
            <Link href="/admin">Retour au studio</Link>
          </div>
        ) : <MfaPanel pending={status === 'required'} />}
        <form className="login-form" action={signOutAdmin}><button type="submit">Me déconnecter</button></form>
      </section>
    </main>
  );
}
