import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateOrderStatus } from '@/app/admin/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { canFulfill, dateTime, nextOrderStatuses, orderStatusLabels, paymentStateLabels, transitionLabels } from '@/lib/orders/labels';
import { notificationState, toneClass } from '@/lib/orders/notification-status';
import { loadOrderRecord } from '@/lib/orders/order-record';
import { emailLabel, isEmailKind } from '@/lib/payments/order-email';
import { UUID_PATTERN } from '@/lib/payments/read-body';
import { safeMediaUrl } from '@/lib/security/urls';
import { formatPrice } from '@/lib/utils/money';

type Payment = { id: string; provider_id: number | null; amount_xof: number; status: string; environment: string; merchant_account_id: number | null; inventory_state: string; last_error: string | null; created_at: string };
type PaymentEvent = { id: number; new_status: string; external_event: string; created_at: string };
type Job = { id: string; kind: string; status: string; attempts: number; recipient: string | null; provider_message_id: string | null; delivery_status: string | null; sent_at: string | null; delivered_at: string | null; last_error: string | null; created_at: string };
type History = { id: string; old_status: string | null; new_status: string; changed_by: string | null; note: string | null; created_at: string };

const notices: Record<string, string> = {
  notifications_disabled: 'Les notifications automatiques sont désactivées sur ce déploiement. Aucun e-mail envoyé.',
  notifications_processed: 'Relance prise en charge. Son état réel figure dans le tableau des notifications.',
  retry_refused: 'Relance refusée : notification déjà acceptée, en cours, relancée il y a moins d’une minute ou hors fenêtre sûre.',
};
const issues: Record<string, string> = {
  montants_illisibles: 'montants illisibles', ligne_incoherente: 'une ligne ne vaut pas prix unitaire × quantité',
  sous_total_incoherent: 'le sous-total ne vaut pas la somme des lignes', total_incoherent: 'le total ne vaut pas sous-total − remise + livraison',
};
const eventSource = (event: string) => event.startsWith('fedapay:') ? 'Webhook FedaPay signé' : event.startsWith('reconcile:') ? 'Réconciliation serveur' : 'Vérification serveur';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  // Staff session + RLS: the service role is never used to read an order here.
  const db = await createAdminClient();
  const order = await loadOrderRecord(db, id);
  if (!order) notFound();
  const [{ data: paymentRows }, { data: jobRows }, { data: historyRows }] = await Promise.all([
    db.from('payment_attempts' as never).select('id,provider_id,amount_xof,status,environment,merchant_account_id,inventory_state,last_error,created_at').eq('order_id', id),
    db.from('notification_jobs' as never).select('id,kind,status,attempts,recipient,provider_message_id,delivery_status,sent_at,delivered_at,last_error,created_at').eq('order_id', id).order('created_at'),
    db.from('order_status_history' as never).select('id,old_status,new_status,changed_by,note,created_at').eq('order_id', id).order('created_at'),
  ]);
  const payment = ((paymentRows ?? []) as unknown as Payment[])[0];
  const jobs = (jobRows ?? []) as unknown as Job[];
  const history = (historyRows ?? []) as unknown as History[];
  const { data: eventRows } = payment
    ? await db.from('payment_events' as never).select('id,new_status,external_event,created_at').eq('payment_id', payment.id).order('created_at')
    : { data: [] };
  const events = (eventRows ?? []) as unknown as PaymentEvent[];
  const confirmedAt = events.find(event => event.new_status === 'paid')?.created_at;
  const amountMismatch = payment && Number(payment.amount_xof) !== order.total;
  const fulfillable = canFulfill({ source: order.source, payment_state: order.paymentState, needs_attention: order.needsAttention });
  const transitions = fulfillable ? nextOrderStatuses[order.status] ?? [] : [];
  const { notice } = await searchParams;
  const money = (value: number) => formatPrice(value, order.currency);
  const cell = 'border-b border-black/10 p-3 align-top';
  const head = 'whitespace-nowrap border-b border-black/10 bg-black/[0.03] p-3 text-left font-semibold';

  return (
    <div className="admin-page">
      <header className="admin-heading">
        <div>
          <p><Link href="/admin/commandes">← COMMANDES</Link></p>
          <h1 className="break-all">{order.reference}</h1>
          <span>Créée le {dateTime(order.createdAt)} · {orderStatusLabels[order.status] ?? order.status} · {paymentStateLabels[order.paymentState] ?? order.paymentState}</span>
        </div>
      </header>
      {notice && notices[notice] && <p role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{notices[notice]}</p>}
      {(order.issues.length > 0 || amountMismatch) && <p role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm">
        Données incohérentes : {[...order.issues.map(issue => issues[issue] ?? issue), ...(amountMismatch ? ['le montant du paiement diffère du total de la commande'] : [])].join(' ; ')}. Les e-mails de cette commande sont bloqués tant que l’écart n’est pas corrigé.
      </p>}
      {order.source === 'notification_demo' && <p role="status" className="mb-5 rounded-xl border bg-white p-4 text-sm">Commande de démonstration des notifications : données fictives, aucun paiement ni stock.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="admin-panel p-5">
          <h2 className="mb-4 text-2xl">Informations générales</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-black/55">Référence</dt><dd className="break-all">{order.reference}</dd>
            <dt className="text-black/55">Identifiant interne</dt><dd className="break-all font-mono text-xs">{order.id}</dd>
            <dt className="text-black/55">Date</dt><dd>{dateTime(order.createdAt)} (heure du Bénin)</dd>
            <dt className="text-black/55">Client</dt><dd>{order.client.name ?? 'Non renseigné'}</dd>
            <dt className="text-black/55">Téléphone</dt><dd>{order.client.phone ?? '—'}</dd>
            <dt className="text-black/55">E-mail</dt><dd className="break-all">{order.client.email ?? '—'}</dd>
            <dt className="text-black/55">Livraison</dt><dd>{[order.client.address, order.client.city].filter(Boolean).join(', ') || '—'}</dd>
            <dt className="text-black/55">Instructions</dt><dd>{order.client.note ?? '—'}</dd>
            <dt className="text-black/55">Commande</dt><dd>{orderStatusLabels[order.status] ?? order.status}{order.needsAttention ? ' · INTERVENTION REQUISE' : ''}</dd>
            <dt className="text-black/55">Paiement</dt><dd>{paymentStateLabels[order.paymentState] ?? order.paymentState}</dd>
          </dl>
        </section>

        <section className="admin-panel p-5">
          <h2 className="mb-4 text-2xl">Actions</h2>
          {order.source === 'notification_demo' ? <p className="text-sm">Aucune action sur une démonstration.</p>
            : !fulfillable ? <p className="text-sm">Traitement bloqué : seul un paiement confirmé par FedaPay (webhook signé ou réconciliation serveur) ouvre la préparation. Aucun bouton ne peut marquer cette commande comme payée.</p>
            : transitions.length ? <div className="flex flex-wrap gap-3">{transitions.map(target => <form key={target} action={updateOrderStatus}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="expected_status" value={order.status} />
              <input type="hidden" name="status" value={target} />
              <button className={`admin-action min-h-11 rounded-lg px-4 text-sm ${target === 'cancelled' ? 'secondary' : ''}`}>{transitionLabels[target]}</button>
            </form>)}</div>
            : <p className="text-sm">Décision finale enregistrée.</p>}
          <h3 className="mb-2 mt-6 font-semibold">Journal de la commande</h3>
          <ol className="grid gap-2 text-sm">{history.map(entry => <li key={entry.id}>
            <strong>{dateTime(entry.created_at)}</strong> · {entry.old_status && entry.old_status !== entry.new_status ? `${orderStatusLabels[entry.old_status] ?? entry.old_status} → ` : ''}{orderStatusLabels[entry.new_status] ?? entry.new_status}
            {' · '}{entry.changed_by ? `staff ${entry.changed_by.slice(0, 8)}` : 'système'}{entry.note ? ` · ${entry.note}` : ''}
          </li>)}{!history.length && <li>Aucun événement enregistré.</li>}</ol>
        </section>
      </div>

      <section className="admin-panel mt-5 p-5">
        <h2 className="mb-4 text-2xl">Articles</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead><tr>{['Article', 'Variante', 'Taille', 'Qté', 'Prix unitaire', 'Total'].map(label => <th key={label} className={head}>{label}</th>)}</tr></thead>
          <tbody>{order.lines.map(line => {
            const photo = safeMediaUrl(line.photo);
            return <tr key={line.id}>
              <td className={cell}><div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- snapshot URL, already restricted to approved storage */}
                {photo ? <img src={photo} alt="" width={56} height={56} className="h-14 w-14 rounded-md object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-md bg-black/5 text-[10px]">Sans photo</span>}
                <span><strong>{line.name}</strong><br /><span className="text-xs text-black/55">Réf. {line.sku}</span></span>
              </div></td>
              <td className={cell}>{line.variant ?? '—'}</td>
              <td className={cell}>{line.size ?? '—'}</td>
              <td className={cell}>{line.quantity}</td>
              <td className={cell}>{money(line.unitPrice)}</td>
              <td className={cell}><strong>{money(line.total)}</strong></td>
            </tr>;
          })}{!order.lines.length && <tr><td colSpan={6} className={cell}>Aucune ligne enregistrée.</td></tr>}</tbody>
        </table></div>
        <dl className="ml-auto mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt>Sous-total</dt><dd className="text-right">{money(order.subtotal)}</dd>
          {order.discount > 0 && <><dt>Remise</dt><dd className="text-right">− {money(order.discount)}</dd></>}
          <dt>Livraison</dt><dd className="text-right">{order.shipping === null ? 'Non enregistrée' : money(order.shipping)}</dd>
          <dt className="font-bold">Total</dt><dd className="text-right font-bold">{money(order.total)}</dd>
        </dl>
        <p className="mt-3 text-xs text-black/55">Prix, libellés et photos figés à la création de la commande.</p>
      </section>

      <section className="admin-panel mt-5 p-5">
        <h2 className="mb-4 text-2xl">Paiement</h2>
        {payment ? <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-black/55">Fournisseur</dt><dd>FedaPay · {payment.environment === 'live' ? 'Live' : 'Sandbox (test)'}{payment.merchant_account_id ? ` · marchand ${payment.merchant_account_id}` : ''}</dd>
            <dt className="text-black/55">Identifiant FedaPay</dt><dd>{payment.provider_id ?? 'Aucune transaction créée'}</dd>
            <dt className="text-black/55">Montant</dt><dd>{formatPrice(Number(payment.amount_xof), 'XOF')}</dd>
            <dt className="text-black/55">Devise</dt><dd>XOF</dd>
            <dt className="text-black/55">Statut</dt><dd>{payment.status}{payment.last_error ? ` · ${payment.last_error}` : ''}</dd>
            <dt className="text-black/55">Confirmation</dt><dd>{confirmedAt ? dateTime(confirmedAt) : 'Non confirmé'}</dd>
            <dt className="text-black/55">Stock</dt><dd>{payment.inventory_state}</dd>
          </dl>
          <h3 className="mb-2 mt-5 font-semibold">Historique des événements</h3>
          <ol className="grid gap-1 text-sm">{events.map(event => <li key={event.id}><strong>{dateTime(event.created_at)}</strong> · {event.new_status} · {eventSource(event.external_event)}</li>)}{!events.length && <li>Aucun événement fournisseur reçu.</li>}</ol>
        </> : <p className="text-sm">Aucun paiement en ligne associé à cette commande.</p>}
      </section>

      <section className="admin-panel mt-5 p-5">
        <h2 className="mb-4 text-2xl">Notifications</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
          <thead><tr>{['Événement', 'Destinataire', 'Canal', 'Statut', 'Tentatives', 'Envoi', 'Livraison', 'Identifiant du message', 'Dernière erreur', ''].map(label => <th key={label} className={head}>{label}</th>)}</tr></thead>
          <tbody>{jobs.map(job => {
            const state = notificationState(job.status, job.delivery_status);
            const email = isEmailKind(job.kind);
            return <tr key={job.id}>
              <td className={cell}>{email ? <Link className="underline" href={`/admin/emails?modele=${job.kind}&commande=${order.id}`}>{emailLabel(job.kind as never)}</Link> : `Ancien canal · ${job.kind}`}</td>
              <td className={`${cell} break-all`}>{job.recipient ?? (job.kind.startsWith('customer_') ? order.client.email : 'Équipe') ?? '—'}</td>
              <td className={cell}>{email ? 'E-mail · Resend' : 'Abandonné'}</td>
              <td className={cell}><span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${toneClass[state.tone]}`}>{state.label}</span></td>
              <td className={cell}>{job.attempts}</td>
              <td className={cell}>{job.sent_at ? dateTime(job.sent_at) : '—'}</td>
              <td className={cell}>{job.delivered_at ? dateTime(job.delivered_at) : job.status === 'sent' ? 'Non confirmée' : '—'}</td>
              <td className={`${cell} break-all font-mono text-xs`}>{job.provider_message_id ?? '—'}</td>
              <td className={cell}>{job.last_error ?? '—'}</td>
              <td className={cell}>{email && ['pending', 'blocked'].includes(job.status) && <form method="post" action="/api/admin/notifications/retry">
                <input type="hidden" name="job_id" value={job.id} />
                <input type="hidden" name="order_id" value={order.id} />
                <button className="admin-action min-h-10 rounded-lg px-3 text-xs">Relancer</button>
              </form>}</td>
            </tr>;
          })}{!jobs.length && <tr><td colSpan={10} className={cell}>Aucune notification pour cette commande.</td></tr>}</tbody>
        </table></div>
        <p className="mt-3 text-xs text-black/55">« Accepté par Resend » signifie que le fournisseur a pris le message. « Livré » n’apparaît qu’après un événement de livraison signé par Resend.</p>
      </section>
    </div>
  );
}
