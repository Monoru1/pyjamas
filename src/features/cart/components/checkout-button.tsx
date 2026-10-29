'use client';
import { useRef, useState } from 'react';
import { useCartStore } from '@/features/cart/cart.store';
import { useCheckoutCustomerStore } from '@/features/checkout/customer-form.store';

export function CheckoutButton({ mode, shipping }: { mode: 'sandbox' | 'live'; shipping: number }) {
  const lines = useCartStore(state => state.lines);
  const { name, phone, email, address, city, comment } = useCheckoutCustomerStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  async function pay() {
    if (locked.current || !lines.length) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const basket = {customer:{name,phone,email,address,city,comment},lines:lines.map(line=>({variantId:line.variantId,quantity:line.quantity}))};
      // Persist only the request fingerprint and idempotency key across a reload, never customer details.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(basket)));
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
      const previous = JSON.parse(sessionStorage.getItem('mdp-shop-payment') || 'null') as {fingerprint?:string;key?:string}|null;
      const key = previous?.fingerprint === fingerprint && previous.key ? previous.key : crypto.randomUUID();
      sessionStorage.setItem('mdp-shop-payment',JSON.stringify({fingerprint,key}));
      const response=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...basket,idempotencyKey:key})});
      const data=await response.json();
      if(data.reference) { sessionStorage.setItem('mdp-payment-reference', data.reference); sessionStorage.setItem('mdp-shop-payment',JSON.stringify({fingerprint,key,reference:data.reference})); }
      if(!response.ok || !data.url) throw new Error(data.error || 'Paiement indisponible.');
      const url = new URL(data.url);
      if(data.internal ? (url.origin !== window.location.origin || url.pathname !== '/paiement') : (url.protocol!=='https:' || url.hostname !== (mode === 'live' ? 'checkout.fedapay.com' : 'sandbox-checkout.fedapay.com')))throw new Error('Lien de paiement invalide.');
      window.location.assign(url.href);
    } catch(cause) { setError(cause instanceof Error ? cause.message : 'Connexion interrompue. Réessayez avec la même demande.'); locked.current=false; setBusy(false); }
  }
  return <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
    <p className="mb-3 text-sm leading-6">{mode === 'sandbox' ? 'Test réservé à l’équipe sur une base isolée. Aucun encaissement réel.' : 'Paiement sécurisé par FedaPay. La commande sera confirmée après vérification du paiement.'}</p>
    <p className="mb-3 text-sm">Livraison : {shipping.toLocaleString('fr-FR')} FCFA. Le total définitif est calculé par le serveur.</p>
    <button type="button" className="min-h-12 w-full rounded-full bg-brand-primary px-5 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !lines.length} onClick={pay}>{busy?'Préparation du paiement…':mode === 'sandbox' ? 'Tester FedaPay (sandbox)' : 'Payer avec FedaPay'}</button>
    <a href="/paiement" className="mt-3 block text-sm underline">Suivre mon dernier paiement</a>
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
