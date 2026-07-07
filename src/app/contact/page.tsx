export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <section className="rounded-[3rem] bg-brand-evergreen p-8 text-white md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Contact</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
            Une question, une taille, une livraison ?
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/75">
            La boutique vous accompagne pour choisir le bon pyjama, composer un cadeau et confirmer la disponibilité.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-white/80">
            <p>WhatsApp : à renseigner</p>
            <p>Email : à renseigner</p>
            <p>Horaires : à confirmer avec la boutique</p>
          </div>
          <a href="https://wa.me/" className="mt-8 inline-flex rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-evergreen">
            Écrire sur WhatsApp
          </a>
        </section>

        <section className="overflow-hidden rounded-[3rem] border border-brand-primary/10 bg-white shadow-[0_24px_80px_rgba(80,34,28,0.10)]">
          <iframe
            title="Carte Google Maps La Maison des Pyjamas"
            src="https://www.google.com/maps?q=La%20Maison%20des%20Pyjamas&output=embed"
            className="h-[520px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </div>
    </main>
  );
}
