import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function ContactPage() {
  const settings = await getStoreSettings();
  const socialLinks = [['Instagram', settings.instagramUrl], ['TikTok', settings.tiktokUrl], ['WhatsApp', `https://wa.me/${settings.whatsappPhone.replace(/\D/g, '')}`]];
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-10 text-foreground md:px-8">
      <div className="pointer-events-none absolute -right-24 top-10 h-96 w-96 rounded-full bg-brand-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <section className="rounded-[3rem] bg-brand-evergreen p-8 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Contact</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
            Nous sommes là pour vous accompagner.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/75">
            Une taille à confirmer, un cadeau à composer ou une livraison à préparer : contactez la boutique avant votre commande.
          </p>
          <div className="mt-8 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="font-semibold text-white">WhatsApp</p>
              <p className="mt-2 text-white/65">Commande, tailles et disponibilité.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="font-semibold text-white">Boutique</p>
              <p className="mt-2 text-white/65">Itinéraire, horaires et retrait.</p>
            </div>
          </div>
          <a href={`https://wa.me/${settings.whatsappPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-evergreen shadow-[0_18px_55px_rgba(201,154,46,0.28)] transition hover:-translate-y-0.5">
            Écrire sur WhatsApp
          </a>
        </section>

        <section className="overflow-hidden rounded-[3rem] border border-brand-primary/10 bg-white shadow-[0_30px_90px_rgba(80,34,28,0.12)]">
          <div className="p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">Carte</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-brand-evergreen">Trouver la boutique.</h2>
          </div>
          <iframe
            title="Carte Google Maps La Maison des Pyjamas"
            src="https://www.google.com/maps?q=La%20Maison%20des%20Pyjamas&output=embed"
            className="h-[560px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </div>

      <section className="relative mx-auto mt-8 max-w-7xl rounded-[2.5rem] border border-brand-primary/10 bg-white/70 p-7 backdrop-blur md:p-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">Réseaux</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-brand-evergreen">Suivre la maison.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-brand-primary/10 px-5 py-3 text-sm font-semibold text-foreground/70 transition hover:-translate-y-0.5 hover:bg-brand-primary hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
