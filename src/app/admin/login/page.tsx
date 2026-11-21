import { LoginForm } from './login-form';

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ otp?: string }> }) {
  const pilot = (await searchParams).otp === '1';
  return (
    <main className="login-page">
      <section>
        <p>LA MAISON DES PYJAMAS</p>
        <h1>Le studio<br />de la maison.</h1>
        <span>{pilot ? 'Un code e-mail sera demandé pour cette connexion.' : 'Accès réservé aux administrateurs.'}</span>
        <LoginForm pilot={pilot} />
      </section>
    </main>
  );
}
