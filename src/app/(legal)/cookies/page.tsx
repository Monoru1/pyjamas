import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: "Cookies et stockage du navigateur" + ' · La Maison des Pyjamas' };
const sections = [["Panier", "Le panier est mémorisé dans le stockage local du navigateur sous la clé mdp-cart. Ce stockage permet de retrouver les articles lors d’une prochaine visite. Vous pouvez vider le panier ou supprimer les données du site dans les paramètres de votre navigateur."], ["Coordonnées de commande", "Les coordonnées saisies sont conservées uniquement pour la session de navigation sous la clé mdp-checkout-customer. Vous pouvez les effacer depuis le formulaire ou fermer l’onglet. Les anciennes coordonnées mémorisées par une version précédente sont effacées lors de l’ouverture de cette version."], ["Connexion du personnel", "Supabase utilise des cookies de session pour l’authentification de l’administration. Ils permettent de reconnaître une session autorisée et ne sont pas des cookies publicitaires."], ["Services externes", "Les liens vers Instagram, TikTok, WhatsApp et Google Maps ouvrent les services concernés à votre initiative. Aucune carte Google intégrée n’est chargée automatiquement dans cette version. Les règles de confidentialité propres à ces services s’appliquent lorsque vous les ouvrez."], ["Publicité et mesure d’audience", "Cette version n’intègre pas de traceur publicitaire facultatif ni de solution de mesure d’audience facultative. Une bannière de consentement sans fonction n’est donc pas affichée. L’ajout ultérieur de traceurs facultatifs devra s’accompagner d’un choix réel et révocable lorsque la réglementation l’exige."]];
export default function LegalPage() {
 return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
 <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">La Maison des Pyjamas · Mise à jour du 20 octobre 2026</p>
 <h1 className="mt-4 text-4xl md:text-5xl">Cookies et stockage du navigateur</h1>

 <div className="mt-8 space-y-8">{sections.map(([title, text]) => <section key={title}><h2 className="text-2xl">{title}</h2><p className="mt-3 leading-8 text-foreground/75">{text}</p></section>)}</div>
 <Link className="mt-10 inline-block underline" href="/contact">Contacter la boutique</Link>
 </main>;
}
