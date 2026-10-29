'use client';
import { useRef, useState } from 'react';
import { useCartStore } from '@/features/cart/cart.store';
import { useCheckoutCustomerStore } from '@/features/checkout/customer-form.store';
import type { ShopQuote } from '@/lib/payments/quotes';

export function CheckoutButton({mode,shipping,liveTest=false}:{mode:'sandbox'|'live';shipping:number;liveTest?:boolean}) {
  const lines=useCartStore(s=>s.lines);const refreshPrices=useCartStore(s=>s.refreshPrices);
  const customer=useCheckoutCustomerStore();
  const [review,setReview]=useState<{quote:ShopQuote;token:string;basket:string}|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const locked=useRef(false);
  const items=lines.map(l=>({variantId:l.variantId,quantity:l.quantity})).sort((a,b)=>a.variantId.localeCompare(b.variantId));
  const basketKey=JSON.stringify(items);
  const current=review?.basket===basketKey?review:null;
  async function act(confirm=false) {
    if(locked.current||!lines.length)return;locked.current=true;setBusy(true);setError('');
    try {
      const basket={customer:{name:customer.name,phone:customer.phone,email:customer.email,address:customer.address,city:customer.city,comment:customer.comment},lines:items};
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(basket)));
      const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const saved=JSON.parse(sessionStorage.getItem('mdp-shop-payment')||'null');
      const previous=saved?.fingerprint===fingerprint&&saved.key?saved.key:null;
      if(!confirm||!current) {
        // A refresh may follow reservation of the last available unit. Fetch a
        // fresh signed review of that exact order without initiating a provider
        // request; the next click still explicitly confirms the frozen amount.
        const response=await fetch(previous?'/api/payments/checkout':'/api/payments/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(previous?{...basket,idempotencyKey:previous}:{lines:items})});const data=await response.json();
        if(!data.quote||!data.quoteToken)throw new Error(data.error||'Prix indisponibles.');
        refreshPrices(data.quote.items);setReview({quote:data.quote,token:data.quoteToken,basket:basketKey});return;
      }
      const key=previous||crypto.randomUUID();
      sessionStorage.setItem('mdp-shop-payment',JSON.stringify({fingerprint,key}));
      const response=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...basket,idempotencyKey:key,quoteToken:current.token})});const data=await response.json();
      if(data.reference){sessionStorage.setItem('mdp-payment-reference',data.reference);sessionStorage.setItem('mdp-shop-payment',JSON.stringify({fingerprint,key,reference:data.reference}));}
      if(!response.ok||!data.url){if(data.quote&&data.quoteToken){refreshPrices(data.quote.items);setReview({quote:data.quote,token:data.quoteToken,basket:basketKey});}throw new Error(data.error||'Paiement indisponible.');}
      const url=new URL(data.url);
      if(data.internal?(url.origin!==window.location.origin||url.pathname!=='/paiement'):(url.protocol!=='https:'||url.hostname!==(mode==='live'?'checkout.fedapay.com':'sandbox-checkout.fedapay.com')||url.username||url.password||url.port))throw new Error('Lien de paiement invalide.');
      window.location.assign(url.href);
    }catch(cause){setError(cause instanceof Error?cause.message:'Connexion interrompue.');}
    finally{locked.current=false;setBusy(false);}
  }
  return <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
    <p className="mb-3 text-sm">{liveTest?'Recette Live privée : encaissement réel, uniquement après autorisation du propriétaire.':mode==='sandbox'?'Test sandbox réservé à l’équipe. Aucun encaissement réel.':'Paiement sécurisé par FedaPay.'}</p>
    <p className="mb-3 text-sm">Livraison : {shipping.toLocaleString('fr-FR')} FCFA.</p>
    {current&&<div role="status" className="mb-4 rounded-lg bg-white p-3"><strong>{current.quote.reserved?'Total de la commande réservée':'Total actuel vérifié'} : {current.quote.amount_xof.toLocaleString('fr-FR')} FCFA</strong><p className="mt-2 text-sm">{current.quote.reserved?'Le montant de cette commande est figé. Vérifiez-le avant de reprendre le paiement.':'Les prix du panier ont été actualisés. Vérifiez ce montant avant de confirmer.'}</p></div>}
    <button type="button" className="min-h-12 w-full rounded-full bg-brand-primary px-5 text-sm font-bold text-white disabled:opacity-50" disabled={busy||!lines.length} onClick={()=>void act(Boolean(current))}>{busy?'Vérification…':current?'Confirmer ce total et continuer vers FedaPay':'Vérifier les prix et le total'}</button>
    {current&&<button type="button" disabled={busy} onClick={()=>void act(false)} className="mt-3 min-h-11 text-sm underline">Actualiser le total</button>}
    <a href="/paiement" className="mt-3 block text-sm underline">Suivre mon dernier paiement</a>
    {error&&<p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
