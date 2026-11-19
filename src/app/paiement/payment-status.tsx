'use client';
import { useEffect, useRef, useState } from 'react';
const labels: Record<string,string> = { pending:'En attente de confirmation', paid:'Paiement confirmé', failed:'Paiement refusé — nouvelle tentative possible chez FedaPay', cancelled:'Tentative annulée — nouvelle tentative possible chez FedaPay', expired:'Paiement expiré', refunded:'Paiement remboursé', partially_refunded:'Paiement partiellement remboursé' };
export function PaymentStatus({ reference }: { reference: string }) {
  const [result, setResult] = useState<{status:string;mode?:string;liveTest?:boolean;order?:{order_number:string;needs_attention:boolean}}>({ status:'pending' });
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const token = reference || sessionStorage.getItem('mdp-payment-reference') || '';
    async function refresh() {
      try {
        if (!token) throw new Error('Référence manquante. Consultez le suivi depuis votre panier.');
        const response = await fetch(`/api/payments/status?reference=${encodeURIComponent(token)}`, { cache:'no-store', signal:controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Vérification indisponible.');
        setResult(data); setError('');
        const saved = JSON.parse(sessionStorage.getItem('mdp-shop-payment') || 'null');
        if (data.status === 'paid' && saved?.reference === token) sessionStorage.removeItem('mdp-shop-payment');
        if (['pending','failed','cancelled'].includes(data.status) && ++attempts < 30) timer = setTimeout(refresh, 5000);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Vérification indisponible.'); }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [reference, retry]);
  return <div className="mt-8 rounded-xl border border-brand-primary/20 bg-white p-6" role="status">
    {result.liveTest && <p className="mb-3 font-bold">RECETTE LIVE PRIVÉE — paiement réel de test</p>}
    {result.mode === 'sandbox' && <p className="mb-3 font-bold">TEST SANDBOX — aucun encaissement réel</p>}
    <h2 className="text-2xl">{labels[result.status] || labels.pending}</h2>
    {result.order?.order_number && <p className="mt-3">Commande {result.order.order_number}</p>}
    <p className="mt-4 leading-7">Seule la vérification serveur auprès de FedaPay confirme le paiement. Le retour du navigateur ne vaut pas confirmation.</p>
    {result.order?.needs_attention && <p className="mt-3">La boutique doit vérifier votre commande avant son traitement.</p>}
    {error && <p className="mt-4 text-red-800" role="alert">{error}</p>}
    <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-5 min-h-11 underline">Actualiser le suivi</button>
    <p className="mt-3 text-sm">Le panier actuel reste disponible. Un changement de panier ne modifie pas les articles de cette commande.</p>
    {result.status === 'paid' && result.order?.order_number && <OrderContact reference={reference || (typeof window !== 'undefined' ? sessionStorage.getItem('mdp-payment-reference') || '' : '')} orderNumber={result.order.order_number} />}
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
