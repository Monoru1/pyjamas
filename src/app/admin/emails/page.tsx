import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { trustedSiteOrigin } from '@/lib/security/urls';
import { demoEmailOrder, emailKinds, emailLabel, isEmailKind, renderOrderEmail } from '@/lib/payments/order-email';
import { paymentDeployment } from '@/lib/payments/fedapay';

export default async function EmailPreview({ searchParams }: {
  searchParams: Promise<{ modele?: string; resultat?: string }>;
}) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  if (!(await db.rpc('is_admin')).data) notFound();
  const params = await searchParams;
  const kind = isEmailKind(params.modele) ? params.modele : 'customer_email';
  const deployment = paymentDeployment();
  const canSend = deployment.context === 'deploy-preview' && deployment.reviewId === '14'
    && process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://oxhymanjibveayhcaqvj.supabase.co'
    && process.env.PAYMENT_DATABASE_ISOLATED === 'true';
  const message = renderOrderEmail(kind, demoEmailOrder, trustedSiteOrigin(process.env.SITE_ORIGIN));
  return <div className="admin-page">
    <header className="admin-heading"><div><h1>Modèles d’e-mail</h1><p>Les données affichées sont fictives.</p></div>
      <Link href="/admin/paiements">Historique des envois</Link>
    </header>
    <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
      <label className="grid min-w-0 max-w-full gap-1">Modèle<select name="modele" defaultValue={kind} className="max-w-full rounded-lg border bg-white p-2">
        {emailKinds.map(value => <option key={value} value={value}>{emailLabel(value)}</option>)}
      </select></label>
      <button className="admin-action min-h-11 px-4">Afficher</button>
    </form>
    {canSend && <form className="mb-4" method="post" action="/api/admin/notifications/demo">
      <input type="hidden" name="modele" value={kind} />
      <button className="admin-action min-h-11 px-4">Envoyer ce modèle à l’adresse de test</button>
    </form>}
    {params.resultat === 'accepte' && <p role="status">E-mail accepté par Resend. Vérifie la boîte de test.</p>}
    {params.resultat === 'indisponible' && <p role="status">Envoi indisponible. Vérifie la configuration Resend de recette.</p>}
    <section aria-label={emailLabel(kind)} className="w-full max-w-[620px] overflow-hidden rounded-xl border bg-[#fff6ec] text-[#1f1215]" style={{ font: '15px/1.5 Arial, sans-serif' }} dangerouslySetInnerHTML={{ __html: message.content }} />
    <details className="mt-4"><summary>Version texte</summary><pre className="whitespace-pre-wrap">{message.text}</pre></details>
  </div>;
}
