'use client';
import { useEffect, useRef, useState } from 'react';
import { orderWhatsAppUrl } from '@/lib/orders/whatsapp';

type Tracking = { status: string; mode?: string; liveTest?: boolean; reservedUntil?: string; order?: { order_number: string; needs_attention: boolean; status?: string } };
/** What FedaPay appended to the return URL. A HINT for wording only, never a payment result. */
export type ReturnHint = 'approved' | 'declined' | 'canceled' | '';

const POLL_MS = 5000;
const POLL_BUDGET = 24; // About two minutes of automatic checks, then the page says so.
const RECHECK_EVERY = 6; // Ask the server to re-read FedaPay about every 30 s (server-throttled).

/**
 * States in which FedaPay may still confirm a payment for this order (the customer can retry
 * the same transaction after a refusal or cancellation), so the page keeps checking.
 */
export const AWAITING_PROVIDER = ['pending', 'failed', 'cancelled'];

const fulfilment: Record<string, string> = { pending: 'Commande en attente de prise en charge', confirmed: 'Commande prise en charge', preparing: 'Commande en préparation', ready: 'Commande prête', delivered: 'Commande livrée', cancelled: 'Commande annulée' };
const dateTime = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : ''; };

/** Pure wording of the state. Exported for tests: the customer must never believe they paid when they did not. */
export function describePayment(result: Tracking, hint: ReturnHint, stalled: boolean) {
  const until = dateTime(result.reservedUntil);
  const resume = until ? `Vous pouvez reprendre le paiement de cette même commande depuis le panier jusqu’au ${until}. Passé ce délai, la réservation est levée automatiquement.` : 'Vous pouvez reprendre le paiement de cette même commande depuis le panier.';
  switch (result.status) {
    case 'paid': return { title: 'Paiement confirmé', body: 'FedaPay a confirmé votre paiement. Votre commande est enregistrée et la boutique a été prévenue.', action: null };
    case 'failed': return { title: 'Paiement refusé', body: `FedaPay a refusé ce paiement : aucun débit n’a été confirmé. ${resume}`, action: 'resume' as const };
    case 'cancelled': return { title: 'Paiement annulé', body: `FedaPay indique que ce paiement a été annulé : aucun débit n’a été confirmé. ${resume}`, action: 'resume' as const };
    case 'expired': return { title: 'Paiement expiré', body: 'FedaPay n’a confirmé aucun paiement avant la fin du délai de réservation : les articles ont été remis en vente. Pour commander, recommencez depuis le panier. Si vous avez pourtant payé, actualisez le suivi : un paiement confirmé plus tard par FedaPay est toujours enregistré.', action: 'restart' as const };
    case 'refunded': return { title: 'Paiement remboursé', body: 'FedaPay indique que ce paiement a été remboursé.', action: null };
    case 'partially_refunded': return { title: 'Paiement partiellement remboursé', body: 'FedaPay indique qu’une partie de ce paiement a été remboursée.', action: null };
  }
  // pending: FedaPay has not confirmed anything. It also stays pending after a cancelled checkout.
  if (hint === 'canceled' || hint === 'declined' || stalled) return {
    title: 'Paiement non finalisé',
    body: `FedaPay n’a confirmé aucun débit pour cette commande. Si vous avez annulé ou fermé la page de paiement, rien n’a été encaissé. ${resume} Si vous avez pourtant validé un paiement, ne payez pas une seconde fois : ${stalled
      ? 'cette page ne se met plus à jour d’elle-même. La boutique continue de vérifier auprès de FedaPay ; touchez « Actualiser le suivi » dans quelques minutes pour voir le résultat.'
      : 'cette page continue de vérifier automatiquement auprès de FedaPay.'}`,
    action: 'resume' as const,
  };
  return { title: 'Paiement en cours de vérification', body: hint === 'approved'
    ? 'FedaPay vous a renvoyé vers la boutique. Nous attendons sa confirmation serveur avant d’enregistrer le paiement.'
    : 'Nous attendons la confirmation de FedaPay. Si vous validez un paiement Mobile Money, confirmez-le sur votre téléphone.', action: null };
}

/** The order number alone reads as "order placed": say it is unpaid unless the server confirmed it. */
export function orderReferenceLine(status: string, orderNumber: string) {
  if (status === 'paid') return `Commande ${orderNumber}`;
  if (status === 'refunded' || status === 'partially_refunded') return `Commande ${orderNumber} (remboursement)`;
  return `Référence ${orderNumber} · commande non payée à ce stade`;
}

export function PaymentStatus({ reference, whatsappPhone = '', returnHint = '' }: { reference: string; whatsappPhone?: string; returnHint?: ReturnHint }) {
  const [result, setResult] = useState<Tracking>({ status: 'pending' });
  const [loaded, setLoaded] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const token = reference || sessionStorage.getItem('mdp-payment-reference') || '';
    async function refresh() {
      try {
        if (!token) throw new Error('Référence manquante. Consultez le suivi depuis votre panier.');
        // Return from FedaPay or manual refresh: ask the server to re-read FedaPay now.
        const recheck = (attempts === 0 && (returnHint || retry > 0)) || (attempts > 0 && attempts % RECHECK_EVERY === 0);
        const response = await fetch(`/api/payments/status?reference=${encodeURIComponent(token)}${recheck ? '&recheck=1' : ''}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Vérification indisponible.');
        setResult(data); setLoaded(true); setError('');
        const saved = JSON.parse(sessionStorage.getItem('mdp-shop-payment') || 'null');
        // Server-confirmed terminal states only: paid ends the attempt, expired allows a NEW order.
        if (['paid', 'expired'].includes(data.status) && saved?.reference === token) sessionStorage.removeItem('mdp-shop-payment');
        if (!AWAITING_PROVIDER.includes(data.status)) return; // Paid, expired, refunded: nothing left to wait for.
        if (++attempts < POLL_BUDGET) timer = setTimeout(refresh, POLL_MS); else setStalled(true);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Vérification indisponible.'); }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [reference, retry, returnHint]);
  const view = describePayment(result, returnHint, stalled);
  const paid = result.status === 'paid' && Boolean(result.order?.order_number);
  return <div className="mt-8 rounded-xl border border-brand-primary/20 bg-white p-6" role="status" aria-live="polite">
    {result.liveTest && <p className="mb-3 font-bold">RECETTE LIVE PRIVÉE — paiement réel de test</p>}
    {result.mode === 'sandbox' && <p className="mb-3 font-bold">TEST SANDBOX — aucun encaissement réel</p>}
    <h2 className="text-2xl">{loaded ? view.title : error ? 'Suivi indisponible' : 'Vérification en cours…'}{paid && result.order?.status && fulfilment[result.order.status] ? ` — ${fulfilment[result.order.status]}` : ''}</h2>
    {result.order?.order_number && <p className="mt-3">{orderReferenceLine(result.status, result.order.order_number)}</p>}
    {loaded && <p className="mt-4 leading-7">{view.body}</p>}
    <p className="mt-4 text-sm leading-6">Seule la vérification serveur auprès de FedaPay confirme un paiement. Le retour du navigateur ne vaut ni paiement ni annulation.</p>
    {result.order?.needs_attention && <p className="mt-3">La boutique doit vérifier votre commande avant son traitement.</p>}
    {error && <p className="mt-4 text-red-800" role="alert">{error}</p>}
    {loaded && view.action === 'resume' && <a href="/panier" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-brand-primary px-6 text-sm font-bold text-white">Reprendre le paiement</a>}
    {loaded && view.action === 'restart' && <a href="/panier" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-brand-primary px-6 text-sm font-bold text-white">Recommencer ma commande</a>}
    <button type="button" onClick={() => { setStalled(false); setRetry(value => value + 1); }} className="mt-5 block min-h-11 underline">Actualiser le suivi</button>
    <p className="mt-3 text-sm">Le panier actuel reste disponible. Un changement de panier ne modifie pas les articles de cette commande.</p>
    {paid && <WhatsAppContact url={orderWhatsAppUrl(whatsappPhone, result.order!.order_number)} />}
    {paid && <OrderContact reference={reference || (typeof window !== 'undefined' ? sessionStorage.getItem('mdp-payment-reference') || '' : '')} orderNumber={result.order!.order_number} />}
  </div>;
}

function WhatsAppContact({ url }: { url: string | null }) {
  if (!url) return null;
  return <div className="mt-6 rounded-xl bg-green-50 p-4">
    <p className="text-sm leading-6">Organisez maintenant la livraison ou le retrait de votre commande avec la boutique. Les modalités et frais de livraison sont convenus sur WhatsApp.</p>
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 items-center rounded-full bg-[#1f7a4d] px-6 text-sm font-bold text-white">Organiser livraison ou retrait sur WhatsApp</a>
  </div>;
}

/** Order-scoped message to the shop. Confirmation only after the server reports a real send. */
function OrderContact({ reference, orderNumber }: { reference: string; orderNumber: string }) {
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  // Each request id is bound to one exact message: a retry of the same text reuses it
  // (idempotent), an edited text gets a new one (no idempotency conflict).
  const pending = useRef<{ id: string; text: string } | null>(null);
  useEffect(() => { if (window.location.hash === '#contact') document.getElementById('contact')?.scrollIntoView(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    const text = message.trim();
    if (!pending.current || pending.current.text !== text) pending.current = { id: crypto.randomUUID(), text };
    const { id } = pending.current;
    setState('sending'); setError('');
    try {
      const response = await fetch('/api/orders/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference, requestId: id, message: text }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.sent !== true) throw new Error(data.error || 'Votre message n’a pas pu être envoyé.');
      setState('sent'); setMessage(''); pending.current = null;
    } catch (cause) { setState('idle'); setError(cause instanceof Error ? cause.message : 'Votre message n’a pas pu être envoyé.'); }
  }
  return <section id="contact" className="mt-8 border-t border-brand-primary/15 pt-6">
    <h3 className="text-lg font-semibold">Contacter la boutique au sujet de ma commande</h3>
    <p className="mt-2 text-sm">Votre message sera transmis à La Maison des Pyjamas avec la référence {orderNumber}. La boutique vous répondra à l’adresse e-mail indiquée lors de la commande.</p>
    {state === 'sent' ? <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">Message envoyé à la boutique. Vous recevrez la réponse par e-mail.</p> : <form onSubmit={submit} className="mt-4">
      <label className="block text-sm font-semibold" htmlFor="order-contact-message">Votre message</label>
      <textarea id="order-contact-message" required minLength={5} maxLength={1500} rows={4} value={message} onChange={event => setMessage(event.target.value)} className="mt-2 w-full rounded-lg border border-black/20 p-3 text-sm" />
      <button type="submit" disabled={state === 'sending' || message.trim().length < 5} className="mt-3 min-h-11 rounded-full bg-brand-primary px-5 text-sm font-bold text-white disabled:opacity-50">{state === 'sending' ? 'Envoi…' : 'Envoyer à la boutique'}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error} <a className="underline" href="/contact">Page Contact</a></p>}
  </section>;
}
