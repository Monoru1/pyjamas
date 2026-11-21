'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Factor = { id: string; friendly_name?: string | null; status: string; factor_type: string };
type Enrolment = { id: string; qr: string; secret: string };
type Step = 'loading' | 'verify' | 'enroll' | 'manage' | 'error';

const CODE = /^[0-9]{6}$/;

async function loadMfaState(): Promise<{ step: Step; factors: Factor[] }> {
  const supabase = createClient();
  const [{ data: list, error }, { data: levels }] = await Promise.all([
    supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (error || !list) return { step: 'error', factors: [] };
  const verified = (list.all as Factor[]).filter(f => f.factor_type === 'totp' && f.status === 'verified');
  return { factors: verified, step: levels?.currentLevel === 'aal2' ? 'manage' : verified.length ? 'verify' : 'enroll' };
}

/**
 * Terrain 16 · SEC-011. TOTP enrolment and verification for the two administrative accounts.
 * Recovery: each holder enrols a second authenticator (backup phone) while already at AAL2;
 * a lost device is removed by the other administrator from the Supabase dashboard.
 */
export function MfaPanel() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const apply = useCallback((state: { step: Step; factors: Factor[] }) => { setFactors(state.factors); setStep(state.step); }, []);
  const refresh = useCallback(async () => apply(await loadMfaState()), [apply]);

  useEffect(() => {
    let active = true;
    loadMfaState().then(state => { if (active) apply(state); });
    return () => { active = false; };
  }, [apply]);

  async function startEnrolment() {
    setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      // Abandoned, never-verified factors would block a new enrolment: remove only those.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const factor of (list?.all ?? []) as Factor[]) if (factor.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authentificateur ${new Date().toISOString().slice(0, 16)}` });
      if (error || !data) throw error ?? new Error('enroll_failed');
      setEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch {
      setMessage('Impossible de préparer l’authentificateur. Réessayez.');
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = enrolment?.id ?? factors[0]?.id;
    if (!factorId || !CODE.test(code)) { setMessage('Saisissez le code à 6 chiffres affiché par l’application.'); return; }
    setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) { setMessage('Code refusé ou expiré. Utilisez le code actuel.'); return; }
      setCode(''); setEnrolment(null);
      if (step === 'manage') { await refresh(); setMessage('Appareil de secours ajouté.'); return; }
      router.replace('/admin');
      router.refresh();
    } finally { setBusy(false); }
  }

  if (step === 'loading') return <p>Vérification…</p>;
  if (step === 'error') return <p role="alert" className="login-error">Double authentification indisponible. Reconnectez-vous.</p>;

  return (
    <div className="login-form">
      {step === 'verify' && !enrolment && <p>Saisissez le code de votre application d’authentification.</p>}
      {step === 'enroll' && !enrolment && (
        <>
          <p>Ce compte doit être protégé par une application d’authentification (Google Authenticator, Microsoft Authenticator, 2FAS…).</p>
          <button type="button" onClick={startEnrolment} disabled={busy}>Configurer l’application</button>
        </>
      )}
      {step === 'manage' && !enrolment && (
        <>
          <p>Double authentification active : {factors.length} appareil{factors.length > 1 ? 's' : ''} enregistré{factors.length > 1 ? 's' : ''}.</p>
          <p>Ajoutez un second appareil (téléphone de secours) pour ne pas perdre l’accès.</p>
          <button type="button" onClick={startEnrolment} disabled={busy}>Ajouter un appareil de secours</button>
          <a href="/admin">Retour au studio</a>
        </>
      )}
      {enrolment && (
        <>
          <p>Scannez ce code avec l’application, puis saisissez le code à 6 chiffres.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URL generated by Supabase Auth */}
          <img src={enrolment.qr} alt="QR code de configuration" width={180} height={180} />
          <p>Saisie manuelle : <code>{enrolment.secret}</code></p>
        </>
      )}
      {(step === 'verify' || enrolment) && (
        <form onSubmit={verify}>
          <label>
            Code à 6 chiffres
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.trim())} />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Vérification…' : 'Valider'}</button>
        </form>
      )}
      {message && <p role="alert" className="login-error">{message}</p>}
    </div>
  );
}
