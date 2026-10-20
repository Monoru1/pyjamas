import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: "Mentions légales" + ' · La Maison des Pyjamas' };
const sections = [["La boutique", "Nom commercial : La Maison des Pyjamas. Pays d’activité : Bénin. L’identité ou raison sociale de l’exploitant, sa forme juridique, son adresse juridique, son RCCM, son IFU et la personne responsable de la publication doivent être confirmés par la propriétaire. Ces renseignements ne sont pas remplacés par des données fictives."], ["Hébergement", "Le site est hébergé par Netlify. La base de données, l’authentification et certains médias utilisent Supabase. Les coordonnées juridiques complètes des prestataires et les contrats applicables seront repris après vérification par l’exploitant."], ["Contact", "Pour toute question relative à la boutique ou à vos données personnelles, utilisez les moyens de contact indiqués sur la page Contact."], ["Photographies et créations", "Les médias de campagne proviennent des shootings de la boutique. La diffusion commerciale et les autorisations des personnes représentées, en particulier les mineurs, doivent être confirmées par écrit par la propriétaire."]];
export default function LegalPage() {
 return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
 <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">La Maison des Pyjamas · Mise à jour du 20 octobre 2026</p>
 <h1 className="mt-4 text-4xl md:text-5xl">Mentions légales</h1>
 <p role="note" className="my-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6">Version préparatoire : les informations juridiques et modalités commerciales manquantes doivent être validées par la propriétaire avant l’ouverture complète du service.</p>
 <div className="mt-8 space-y-8">{sections.map(([title, text]) => <section key={title}><h2 className="text-2xl">{title}</h2><p className="mt-3 leading-8 text-foreground/75">{text}</p></section>)}</div>
 <Link className="mt-10 inline-block underline" href="/contact">Contacter la boutique</Link>
 </main>;
}
