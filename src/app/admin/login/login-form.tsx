'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_MFA_PATH, adminMfaGate } from '@/lib/security/admin-mfa';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const form = new FormData(event.currentTarget);
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });

      if (signInError) {
        setError('Identifiants incorrects ou compte indisponible.');
        return;
      }

      // Fail clearly if an authenticated account has no active admin profile.
      // The server-side proxy still enforces the admin role on every request.
      let { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_account');
      if (adminError) ({ data: isAdmin, error: adminError } = await supabase.rpc('is_admin'));
      if (adminError || !isAdmin) {
        await supabase.auth.signOut();
        setError('Ce compte ne dispose pas d’un accès administrateur actif.');
        return;
      }
      // Terrain 16: a verified second factor (or the MFA obligation) is required before the back-office.
      const { data: levels } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      router.replace(adminMfaGate(levels) === 'ok' ? '/admin' : ADMIN_MFA_PATH);
      router.refresh();
    } catch {
      setError('Connexion indisponible. Réessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="login-form">
      <label>
        Adresse e-mail
        <input required name="email" type="email" autoComplete="username" placeholder="votre@email.com" />
      </label>
      <label>
        Mot de passe
        <input required name="password" type="password" autoComplete="current-password" />
      </label>
      {error && <p role="alert" className="login-error">{error}</p>}
      <button disabled={loading} type="submit">{loading ? 'Connexion…' : 'Ouvrir le studio'}</button>
      <p className="admin-auth-assistance">
        <Link href="/admin/forgot-password">Mot de passe oublié ?</Link>
      </p>
    </form>
  );
}
