'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resendAdminCode, verifyAdminCode } from '@/app/admin/login/auth-actions';

export function MfaPanel({ pending }: { pending: boolean }) {
  const router = useRouter();
  const [started, setStarted] = useState(pending);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function resend() {
    setBusy(true);
    setMessage('');
    try {
      const result = await resendAdminCode();
      setMessage(result.message);
      setStarted(true);
    } catch {
      setMessage('Envoi indisponible. Réessayez dans quelques instants.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await verifyAdminCode(new FormData(event.currentTarget));
      if (result.verified) {
        router.replace('/admin');
        router.refresh();
      } else {
        setMessage(result.error);
      }
    } catch {
      setMessage('Vérification indisponible. Réessayez dans quelques instants.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-form">
      {started && (
        <form onSubmit={verify}>
          <p>Saisissez le code à 6 chiffres reçu par e-mail. Il expire après 5 minutes.</p>
          <label>
            Code à 6 chiffres
            <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
          </label>
          <button type="submit" disabled={busy}>Valider le code</button>
        </form>
      )}
      <button type="button" onClick={resend} disabled={busy}>{started ? 'Demander un nouveau code' : 'Envoyer un code par e-mail'}</button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
