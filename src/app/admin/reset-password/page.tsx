'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type RecoveryStatus = 'checking' | 'ready' | 'invalid' | 'saved';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<RecoveryStatus>('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setStatus((current) => current === 'saved' ? current : 'ready');
      }
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      setStatus((current) => current === 'saved' ? current : sessionError || !data.session ? 'invalid' : 'ready');
    }).catch(() => { if (mounted) setStatus('invalid'); });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || status !== 'ready') return;
    setError('');

    if (password.length < 12) {
      setError('Utilise au moins 12 caractères pour ton nouveau mot de passe.');
      return;
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Le lien a peut-être expiré. Demande un nouveau lien et réessaie.');
        return;
      }
      setPassword('');
      setConfirmation('');
      setStatus('saved');
      // Require an explicit new sign-in after resetting credentials.
      await supabase.auth.signOut();
    } catch {
      setError('Impossible de modifier le mot de passe. Réessaie plus tard.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-page">
      <section>
        <p>LA MAISON DES PYJAMAS</p>
        <h1>Nouveau<br />mot de passe.</h1>
        <span>Crée un accès sécurisé pour ton compte.</span>
        {status === 'checking' && <div className="admin-auth-notice" role="status">Vérification de ton lien sécurisé…</div>}
        {status === 'invalid' && (
          <div className="admin-auth-notice" role="alert">
            Ce lien est invalide ou a expiré. <Link href="/admin/forgot-password">Demander un nouveau lien</Link>.
          </div>
        )}
        {status === 'saved' && (
          <div className="admin-auth-notice" role="status">
            Le mot de passe a été mis à jour. <Link href="/admin/login">Se reconnecter</Link>.
          </div>
        )}
        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Nouveau mot de passe (12 caractères minimum)
              <input required name="password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label>
              Confirmer le mot de passe
              <input required name="confirm-password" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            {error && <p role="alert" className="login-error">{error}</p>}
            <button type="submit" disabled={saving}>{saving ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}</button>
          </form>
        )}
        <p className="admin-auth-assistance"><Link href="/admin/login">Retour à la connexion</Link></p>
      </section>
    </main>
  );
}
