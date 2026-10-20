import Link from 'next/link';
import { CampaignImage as Image } from '@/components/marketing/campaign-image';
import { ArrowUpRight, CalendarDays, Gift, Heart, MapPin, Music2, Sparkles, Ticket } from 'lucide-react';
import { createPublicClient } from '@/lib/supabase/public';
import { ChristmasEventRequestForm } from './request-form';

export const revalidate = 60;

export const metadata = {
  title: 'La fête de Noël 2026 | La Maison des Pyjamas',
  description: 'Une fête de Noël se prépare à La Maison des Pyjamas. Demandez à être recontacté pour les informations et les places.',
};

async function getChristmasEventConfig() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from('christmas_event_config')
      .select('display_title,event_day,event_time,venue_name,venue_address,ticket_price_xof,capacity,information_note,requests_open')
      .eq('event_key', 'noel-2026').maybeSingle();
    return data;
  } catch { return null; }
}

function formatDay(date: string | null | undefined) {
  if (!date) return 'Date à annoncer';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle:'full', timeZone:'UTC' }).format(new Date(date + 'T12:00:00Z'));
}

export default async function ChristmasEventPage() {
  const config = await getChristmasEventConfig();
  const price = config?.ticket_price_xof == null ? 'À confirmer' : config.ticket_price_xof === 0 ? 'Entrée gratuite' : new Intl.NumberFormat('fr-FR').format(config.ticket_price_xof) + ' FCFA';
  const open = Boolean(config?.requests_open && process.env.EVENT_REQUESTS_ENABLED === 'true' && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.EVENT_REQUEST_RATE_SECRET);

  return (
    <main className="xmas-event">
      <div className="christmas-announcement">
        <Sparkles size={15} aria-hidden="true" /> ÉDITION 2026 · UN RENDEZ-VOUS À PARTAGER <Sparkles size={15} aria-hidden="true" />
      </div>
      <section className="xmas-event-hero">
        <div className="xmas-event-hero-copy">
          <span className="xmas-event-eyebrow">LA MAISON DES PYJAMAS PRÉPARE SA FÊTE</span>
          <h1>Un Noël <em>à vivre</em> ensemble.</h1>
          <p>Avant Noël, retrouvons-nous pour célébrer les petits bonheurs, l’esprit de famille et cette période qui nous rassemble. Une fête se prépare à la maison !</p>
          <div className="xmas-event-hero-actions">
            <a href="#pre-reservation" className="christmas-btn christmas-btn-light">Demander mes places <ArrowUpRight size={19}/></a>
            <Link href="/catalogue?collection=noel" className="christmas-text-link">Voir les pyjamas <ArrowUpRight size={18}/></Link>
          </div>
          <div className="xmas-event-hero-tag"><Music2 size={18}/> Les détails seront annoncés prochainement</div>
        </div>
        <div className="xmas-event-hero-image">
          <Image src="/christmas-2026/family-celebration.jpg" alt="Famille en pyjamas assortis dans une ambiance de Noël" fill priority sizes="(max-width: 850px) 100vw, 50vw" className="object-cover"/>
        </div>
      </section>

      <section className="xmas-event-facts" aria-label="Informations pratiques">
        <div><CalendarDays size={23}/><span>Quand ?</span><strong>{formatDay(config?.event_day)}{config?.event_time ? ` à ${config.event_time.slice(0,5)}` : ''}</strong></div>
        <div><MapPin size={23}/><span>Où ?</span><strong>{config?.venue_name || 'Lieu à annoncer'}{config?.venue_address ? ` — ${config.venue_address}` : ''}</strong></div>
        <div><Ticket size={23}/><span>Entrée</span><strong>{price}</strong></div>
      </section>

      <section className="xmas-event-intro">
        <div>
          <p className="christmas-eyebrow">UNE PARENTHÈSE ENCHANTÉE</p>
          <h2>Plus qu’une fête. <em>Un souvenir.</em></h2>
          <p>Des pyjamas de Noël, de belles rencontres et une ambiance festive. La programmation et les informations pratiques seront communiquées par l’organisatrice.</p>
          {config?.information_note && <p className="xmas-event-config-note">{config.information_note}</p>}
          <div className="xmas-event-values">
            <span><Heart size={19}/> Se retrouver</span>
            <span><Gift size={19}/> Partager</span>
            <span><Sparkles size={19}/> Célébrer</span>
          </div>
        </div>
        <div className="xmas-event-intro-photo">
          <Image src="/christmas-2026/christmas-boutique.jpg" alt="La boutique décorée pour Noël" fill sizes="(max-width: 850px) 100vw, 45vw" className="object-cover"/>
        </div>
      </section>

      <ChristmasEventRequestForm open={open} />

      <section className="xmas-event-bottom">
        <p className="christmas-eyebrow">LE DRESS CODE DE LA MAISON</p>
        <h2>Et si on venait <em>assortis ?</em></h2>
        <p>Préparez votre tenue de fête en découvrant la collection de pyjamas de Noël.</p>
        <Link href="/catalogue?collection=noel" className="christmas-btn christmas-btn-light">Explorer les pyjamas <ArrowUpRight size={18}/></Link>
      </section>
    </main>
  );
}
