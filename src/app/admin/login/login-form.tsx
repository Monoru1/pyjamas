'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });

      if (signInError) {
        setError('Identifiants incorrects ou compte indisponible.');
        return;
      }

      // The existing server-side proxy + is_admin() RPC enforce the admin role.
      router.replace('/admin');
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
