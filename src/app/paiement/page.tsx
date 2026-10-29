import Link from 'next/link';
import { PaymentStatus } from './payment-status';

export const metadata = {
  title: 'Suivi de paiement · La Maison des Pyjamas',
  description: 'Retrouvez le statut de votre règlement et de votre commande.',
  robots: { index: false, follow: false },
};

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference = '' } = await searchParams;
  return (
    <main className="relative min-h-[75vh] overflow-hidden bg-background px-4 py-12 text-foreground sm:px-6 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="relative mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-primary underline underline-offset-4">
          ← La Maison des Pyjamas
        </Link>
        <header className="mt-5 rounded-[2rem] bg-[#b3203a] px-6 py-9 text-white shadow-xl sm:px-10 sm:py-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">Votre commande, en toute sérénité</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Suivi de votre paiement</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
            Nous vérifions directement votre règlement auprès de FedaPay. Conservez cette page jusqu'à la confirmation.
          </p>
        </header>
        <PaymentStatus reference={reference} />
        <section className="mt-6 rounded-2xl border border-brand-primary/15 bg-white/80 p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Quelques conseils utiles</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>Ne payez pas une seconde fois tant que le premier règlement est en cours de vérification.</li>
            <li>Si votre banque vous demande une confirmation, terminez-la sur la page sécurisée de FedaPay.</li>
            <li>Si le statut tarde à changer, utilisez « Actualiser le suivi » sans recommencer votre commande.</li>
          </ul>
        </section>
        <div className="mt-6 flex flex-wrap gap-5 text-sm">
          <Link href="/panier" className="inline-flex min-h-11 items-center font-semibold text-brand-primary underline underline-offset-4">Retour au panier</Link>
          <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">Continuer mes achats</Link>
        </div>
      </div>
    </main>
  );
}
