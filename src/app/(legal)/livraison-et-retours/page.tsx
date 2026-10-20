import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: "Livraison et retours" + ' · La Maison des Pyjamas' };
const sections = [["Avant de confirmer votre achat", "Demandez à la boutique de confirmer la zone de livraison, les frais, le délai et les modalités de retrait. Ces informations ne sont pas encore validées pour une publication définitive."], ["Un article reçu pose problème ?", "Contactez la boutique avec votre référence de commande et une description du problème. Les modalités de retour, d’échange et de remboursement doivent être communiquées par l’exploitant avant la vente. Aucun frais ou délai non confirmé n’est inventé ici."]];
export default function LegalPage() {
 return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
 <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">La Maison des Pyjamas · Mise à jour du 20 octobre 2026</p>
 <h1 className="mt-4 text-4xl md:text-5xl">Livraison et retours</h1>
 <p role="note" className="my-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6">Version préparatoire : les informations juridiques et modalités commerciales manquantes doivent être validées par la propriétaire avant l’ouverture complète du service.</p>
 <div className="mt-8 space-y-8">{sections.map(([title, text]) => <section key={title}><h2 className="text-2xl">{title}</h2><p className="mt-3 leading-8 text-foreground/75">{text}</p></section>)}</div>
 <Link className="mt-10 inline-block underline" href="/contact">Contacter la boutique</Link>
 </main>;
}
