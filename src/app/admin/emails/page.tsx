import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { trustedSiteOrigin } from '@/lib/security/urls';
import {  emailLabel, isEmailKind, renderOrderEmail } from '@/lib/payments/order-email';
import { loadOrderRecord, orderEmailData } from '@/lib/orders/order-record';
import { UUID_PATTERN } from '@/lib/payments/read-body';

export default async function EmailPreview({ searchParams }: {
  searchParams: Promise<{ modele?: string; resultat?: string; commande?: string }>;
}) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  if (!(await db.rpc('is_admin')).data) notFound();
  const params = await searchParams;
  const kind = isEmailKind(params.modele) && ['customer_email', 'admin_email'].includes(params.modele) ? params.modele : 'customer_email';
  const origin = trustedSiteOrigin(process.env.SITE_ORIGIN || process.env.DEPLOY_PRIME_URL);
  // Real order: on-screen staff preview only, read through the staff session. Never sendable.
  const real = params.commande && UUID_PATTERN.test(params.commande) ? await loadOrderRecord(db, params.commande) : null;
  if (params.commande && !real) notFound();
  if (!real) return <div className="admin-page"><h1>E-mails de commande payée</h1><p>Une confirmation est envoyée au client ayant choisi l’e-mail et une notification au personnel après validation du paiement. Ouvrez une commande payée pour consulter ses messages.</p><Link href="/admin/commandes">Consulter les commandes</Link></div>;
  if (real.paymentState !== 'paid') return <div className="admin-page"><h1>E-mails de commande</h1><p>Aucun e-mail de confirmation ne sera envoyé tant que le paiement n’est pas confirmé.</p><Link href={`/admin/commandes/${real.id}`}>Retour à la commande</Link></div>;
  const message = renderOrderEmail(kind, orderEmailData(real), origin);
  return <div className="admin-page">
    <header className="admin-heading"><div><h1>Modèles d’e-mail</h1><p>{real ? `Prévisualisation staff de la commande ${real.reference}. Aucun envoi possible depuis cet écran.` : 'Les données affichées sont fictives.'}</p></div>
      {real ? <Link href={`/admin/commandes/${real.id}`}>Retour à la commande</Link> : <Link href="/admin/paiements">Historique des envois</Link>}
    </header>
    <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
      {real && <input type="hidden" name="commande" value={real.id} />}
      <label className="grid min-w-0 max-w-full gap-1">Modèle<select name="modele" defaultValue={kind} className="max-w-full rounded-lg border bg-white p-2">
        {(['customer_email', 'admin_email'] as const).map(value => <option key={value} value={value}>{emailLabel(value)}</option>)}
      </select></label>
      <button className="admin-action min-h-11 px-4">Afficher</button>
    </form>
    <section aria-label={emailLabel(kind)} className="w-full max-w-[620px] overflow-hidden rounded-xl border bg-[#fff6ec] text-[#1f1215]" style={{ font: '15px/1.5 Arial, sans-serif' }} dangerouslySetInnerHTML={{ __html: message.content }} />
    <details className="mt-4"><summary>Version texte</summary><pre className="whitespace-pre-wrap">{message.text}</pre></details>
  </div>;
}
