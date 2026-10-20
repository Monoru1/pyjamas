'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || sent) return;
    setSending(true);
    setError('');

    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/admin/reset-password` },
      );

      if (resetError) {
        // Don't disclose whether an account exists. Provider-level errors can
        // also occur when the project is paused or email delivery is disabled.
        setError('La demande est momentanément indisponible. Réessaie plus tard ou contacte la propriétaire.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Impossible de contacter le service. Réessaie dans quelques instants.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="login-page">
      <section>
        <p>LA MAISON DES PYJAMAS</p>
        <h1>Retrouver<br />votre accès.</h1>
        <span>Réservé aux comptes autorisés de la boutique.</span>
        {sent ? (
          <div role="status" className="admin-auth-notice">
            Si cette adresse possède un compte, un lien de réinitialisation sera envoyé.
            Vérifiez également les courriers indésirables.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Adresse e-mail du compte admin
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="votre@email.com"
              />
            </label>
            {error && <p role="alert" className="login-error">{error}</p>}
            <button type="submit" disabled={sending}>
              {sending ? 'Envoi…' : 'Recevoir un lien sécurisé'}
            </button>
          </form>
        )}
        <p className="admin-auth-assistance">
          <Link href="/admin/login">Retour à la connexion</Link>
        </p>
      </section>
    </main>
  );
}
