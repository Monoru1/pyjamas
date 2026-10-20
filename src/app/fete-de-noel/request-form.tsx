'use client';

import { useActionState } from 'react';
import { ArrowRight, CalendarHeart, LoaderCircle } from 'lucide-react';
import { requestChristmasPlaces, type EventRequestResult } from './actions';

const initial: EventRequestResult = { ok: false, message: '' };

export function ChristmasEventRequestForm({ open }: { open: boolean }) {
  const [state, action, pending] = useActionState(requestChristmasPlaces, initial);
  return (
    <section className="xmas-event-booking" id="pre-reservation" aria-labelledby="xmas-event-form-title">
      <div className="xmas-event-form-heading">
        <CalendarHeart size={31} aria-hidden="true" />
        <p className="christmas-eyebrow">DEMANDES DE PLACES</p>
        <h2 id="xmas-event-form-title">Soyez parmi <em>les premiers.</em></h2>
        <p>Préinscrivez-vous pour recevoir les informations sur la fête avant l’ouverture des réservations définitives.</p>
      </div>
      {!open ? (
        <div role="status" className="xmas-event-result">Les demandes de places ne sont pas ouvertes pour le moment. Revenez bientôt.</div>
      ) : (
        <form action={action} className="xmas-event-form">
          <div className="xmas-event-form-row">
            <label>Votre nom et prénom *
              <input name="full_name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Ex. Jeanne A." />
            </label>
            <label>Téléphone / WhatsApp *
              <input name="phone" required type="tel" autoComplete="tel" inputMode="tel" maxLength={25} placeholder="+229 ..." />
            </label>
          </div>
          <div className="xmas-event-form-row">
            <label>Adresse e-mail (facultative)
              <input name="email" type="email" autoComplete="email" maxLength={254} placeholder="vous@exemple.com" />
            </label>
            <label>Nombre de places souhaitées *
              <select name="places" required defaultValue="2">
                {Array.from({ length: 8 }, (_, i) => <option value={i + 1} key={i}>{i + 1} place{i ? 's' : ''}</option>)}
              </select>
            </label>
          </div>
          <label className="xmas-event-consent">
            <input type="checkbox" name="consent" required />
            <span>J’accepte que La Maison des Pyjamas utilise mes coordonnées uniquement pour répondre à ma demande concernant la fête de Noël.</span>
          </label>
          <div className="xmas-event-honeypot" aria-hidden="true"><label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off"/></label></div>
          {state.message && <div className="xmas-event-result" role={state.ok ? 'status' : 'alert'}>{state.message}</div>}
          <button className="christmas-btn christmas-btn-red" type="submit" disabled={pending || state.ok}>
            {pending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={19} />}
            {pending ? 'Enregistrement…' : state.ok ? 'Demande enregistrée' : 'Demander mes places'}
          </button>
          <p className="xmas-event-fineprint">Consultez notre <a className="underline" href="/politique-de-confidentialite">politique de confidentialité</a>. Ce formulaire n’est pas un billet. Date, lieu, tarif et capacité restent à confirmer. Aucune somme n’est prélevée.</p>
        </form>
      )}
    </section>
  );
}
