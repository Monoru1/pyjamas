'use client';
import { useEffect, useState } from 'react';
const labels: Record<string,string>={pending:'En attente de confirmation',paid:'Paiement de test confirmé',failed:'Paiement refusé',cancelled:'Paiement annulé',expired:'Session expirée',refunded:'Remboursement de test confirmé',partially_refunded:'Remboursement partiel de test'};
export function PaymentStatus({reference}:{reference:string}) {
  const [status,setStatus]=useState('pending');
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;let attempts=0;
    async function refresh(){
      try{
        const response=await fetch(`/api/payments/status?reference=${encodeURIComponent(reference)}`,{cache:'no-store',signal:controller.signal});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Vérification indisponible.');
        setStatus(data.status);setError('');
        if(data.status==='pending' && ++attempts<20) timer=setTimeout(refresh,5000);
      }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Vérification indisponible.');}
    }
    if(reference)void refresh();
    return ()=>{controller.abort();clearTimeout(timer);};
  },[reference]);
  return <div className="mt-8 rounded-xl border border-brand-primary/20 bg-white p-6" role="status">
    <h2 className="text-2xl">{labels[status]||labels.pending}</h2>
    <p className="mt-4 leading-7">Il s’agit d’un essai sandbox : aucune commande commerciale ni place à la fête n’est confirmée. Seule une vérification serveur auprès de FedaPay peut confirmer ce test.</p>
    {(!reference || error) && <p className="mt-4 text-red-800" role="alert">{!reference ? 'Référence manquante.' : error}</p>}
    {status==='pending' && <p className="mt-4 text-sm">Une notification peut arriver plus tard, même si le navigateur a été fermé. L’équipe peut vérifier le statut depuis son administration.</p>}
  </div>;
}
