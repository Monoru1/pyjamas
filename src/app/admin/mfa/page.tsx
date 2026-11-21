import { MfaPanel } from './mfa-panel';

export const metadata = { robots: { index: false, follow: false }, title: 'Double authentification' };

export default function AdminMfaPage() {
  return <main className="login-page"><section><p>LA MAISON DES PYJAMAS</p><h1>Double<br />authentification.</h1><span>Accès réservé aux deux comptes administratifs.</span><MfaPanel /></section></main>;
}
