import Link from 'next/link';
import { PaymentStatus } from './payment-status';
export const metadata={title:'Paiement de test · La Maison des Pyjamas',robots:{index:false,follow:false}};
export default async function PaymentPage({searchParams}:{searchParams:Promise<{reference?:string}>}) {
  const {reference=''}=await searchParams;
  return <main className="mx-auto max-w-2xl px-5 py-16"><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">FedaPay · environnement de test</p><h1 className="mt-4 text-4xl">Suivi du paiement</h1><PaymentStatus reference={reference}/><Link href="/panier" className="mt-7 inline-block underline">Retour au panier</Link></main>;
}
