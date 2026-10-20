'use client';
import { useRef, useState } from 'react';
import { useCartStore } from '@/features/cart/cart.store';
import { useCheckoutCustomerStore } from '@/features/checkout/customer-form.store';

export function SandboxCheckoutButton() {
  const lines = useCartStore(state => state.lines);
  const { name, phone } = useCheckoutCustomerStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  async function pay() {
    if (locked.current || !lines.length) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const basket = {customer:{name,phone},lines:lines.map(line=>({variantId:line.variantId,quantity:line.quantity}))};
      // Persist only the request fingerprint and idempotency key across a reload, never customer details.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(basket)));
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
      const previous = JSON.parse(sessionStorage.getItem('mdp-sandbox-payment') || 'null') as {fingerprint?:string;key?:string}|null;
      const key = previous?.fingerprint === fingerprint && previous.key ? previous.key : crypto.randomUUID();
      sessionStorage.setItem('mdp-sandbox-payment',JSON.stringify({fingerprint,key}));
      const response=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...basket,idempotencyKey:key})});
      const data=await response.json();
      if(!response.ok || !data.url) throw new Error(data.error || 'Paiement de test indisponible.');
      const url = new URL(data.url);
      if(url.protocol!=='https:' || url.hostname!=='sandbox-checkout.fedapay.com')throw new Error('Lien de paiement invalide.');
      window.location.assign(url.href);
    } catch(cause) { setError(cause instanceof Error ? cause.message : 'Connexion interrompue. Réessayez avec la même demande.'); locked.current=false; setBusy(false); }
  }
  return <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
    <p className="mb-3 text-sm leading-6"><strong>Test FedaPay réservé à l’équipe.</strong> Aucune vente réelle, aucun billet ni mouvement de stock commercial.</p>
    <button type="button" className="min-h-12 w-full rounded-full bg-brand-primary px-5 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !lines.length} onClick={pay}>{busy?'Préparation du test…':'Tester le paiement FedaPay (sandbox)'}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
