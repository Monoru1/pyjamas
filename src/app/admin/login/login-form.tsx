'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminPasswordSignIn } from './auth-actions';

export function LoginForm({ pilot }: { pilot: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await adminPasswordSignIn(new FormData(event.currentTarget));
      if (!result.destination) {
        setError(result.error);
        return;
      }
      router.replace(result.destination);
      router.refresh();
    } catch {
      setError('Connexion indisponible. Réessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="login-form">
      {pilot && <input type="hidden" name="pilot" value="true" />}
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
