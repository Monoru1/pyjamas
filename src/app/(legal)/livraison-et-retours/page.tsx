import Link from 'next/link';
import type { Metadata } from 'next';
import { storeIdentity as id } from '@/lib/legal/store-identity';
export const metadata: Metadata = { title: "Livraison et retours" + ' · La Maison des Pyjamas' };
const sections = [["Livraison", "Les zones desservies, les frais et les délais de livraison sont en cours de validation par la boutique. Le montant de livraison appliqué à votre commande est toujours indiqué avant le paiement."], ["Une question ou un problème avec votre commande ?", `Après un paiement confirmé, utilisez « Contacter la boutique au sujet de ma commande » sur votre page de suivi : votre référence est transmise automatiquement. Vous pouvez aussi écrire à ${id.email} ou appeler le ${id.phone}.`], ["Retours, échanges et remboursements", "Les modalités de retour, d’échange et de remboursement seront publiées sur cette page après leur validation par la boutique. Aucun délai ni aucune condition non confirmés ne sont annoncés ici."]];
export default function LegalPage() {
 return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
 <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">La Maison des Pyjamas · Mise à jour du 19 novembre 2026</p>
 <h1 className="mt-4 text-4xl md:text-5xl">Livraison et retours</h1>
 <p role="note" className="my-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6">Certaines modalités commerciales (livraison, retours, échanges et remboursements) sont en cours de validation par la boutique. Elles seront publiées sur cette page. En attendant, contactez la boutique avant votre achat.</p>
 <div className="mt-8 space-y-8">{sections.map(([title, text]) => <section key={title}><h2 className="text-2xl">{title}</h2><p className="mt-3 leading-8 text-foreground/75">{text}</p></section>)}</div>
 <Link className="mt-10 inline-block underline" href="/contact">Contacter la boutique</Link>
 </main>;
}
