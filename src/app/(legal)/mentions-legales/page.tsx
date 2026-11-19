import Link from 'next/link';
import type { Metadata } from 'next';
import { storeIdentity as id } from '@/lib/legal/store-identity';
export const metadata: Metadata = { title: "Mentions légales" + ' · La Maison des Pyjamas' };
const sections = [["Éditeur et exploitante", `Nom commercial : ${id.tradeName}. Exploitante : ${id.operator}. RCCM : ${id.rccm}. Numéro fiscal : ${id.taxNumber}. Pays d’activité : Bénin.`], ["Coordonnées", `Adresse : ${id.address}. Téléphone : ${id.phone}. E-mail : ${id.email}.`], ["Hébergement", "Le site est hébergé par Netlify. La base de données, l’authentification et certains médias utilisent Supabase."], ["Paiement", "Les paiements en ligne sont traités par FedaPay. La boutique ne reçoit ni ne conserve les données de carte ou les codes Mobile Money de ses clients."], ["Contact", "Pour toute question relative à la boutique ou à vos données personnelles, écrivez à l’adresse ci-dessus ou utilisez les moyens indiqués sur la page Contact."], ["Photographies et créations", "Les médias de campagne proviennent des shootings de la boutique. La diffusion commerciale et les autorisations des personnes représentées, en particulier les mineurs, doivent être confirmées par écrit par la propriétaire."]];
export default function LegalPage() {
 return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
 <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">La Maison des Pyjamas · Mise à jour du 19 novembre 2026</p>
 <h1 className="mt-4 text-4xl md:text-5xl">Mentions légales</h1>
 <div className="mt-8 space-y-8">{sections.map(([title, text]) => <section key={title}><h2 className="text-2xl">{title}</h2><p className="mt-3 leading-8 text-foreground/75">{text}</p></section>)}</div>
 <Link className="mt-10 inline-block underline" href="/contact">Contacter la boutique</Link>
 </main>;
}
