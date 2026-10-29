'use client';
import { useEffect, useState } from 'react';
const labels: Record<string,string> = { pending:'En attente de confirmation', paid:'Paiement confirmé', failed:'Paiement refusé — nouvelle tentative possible chez FedaPay', cancelled:'Tentative annulée — nouvelle tentative possible chez FedaPay', expired:'Paiement expiré', refunded:'Paiement remboursé', partially_refunded:'Paiement partiellement remboursé' };
export function PaymentStatus({ reference }: { reference: string }) {
  const [result, setResult] = useState<{status:string;mode?:string;order?:{order_number:string;needs_attention:boolean}}>({ status:'pending' });
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
    {result.mode === 'sandbox' && <p className="mb-3 font-bold">TEST SANDBOX — aucun encaissement réel</p>}
    <h2 className="text-2xl">{labels[result.status] || labels.pending}</h2>
    {result.order?.order_number && <p className="mt-3">Commande {result.order.order_number}</p>}
    <p className="mt-4 leading-7">Seule la vérification serveur auprès de FedaPay confirme le paiement. Le retour du navigateur ne vaut pas confirmation.</p>
    {result.order?.needs_attention && <p className="mt-3">La boutique doit vérifier votre commande avant son traitement.</p>}
    {error && <p className="mt-4 text-red-800" role="alert">{error}</p>}
    <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-5 min-h-11 underline">Actualiser le suivi</button>
    <p className="mt-3 text-sm">Le panier actuel reste disponible. Un changement de panier ne modifie pas les articles de cette commande.</p>
  </div>;
}
