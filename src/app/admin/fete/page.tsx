import Link from 'next/link';
import { ArrowUpRight, CalendarHeart, ClipboardList } from 'lucide-react';
import { createAdminClient as createClient } from '@/lib/supabase/admin';
import { updateChristmasEventConfig, updateChristmasRequestStatus } from './actions';

const states: Record<string,string> = {
  requested: 'Demande reçue',
  contacted: 'Contacté',
  confirmed: 'Confirmé par l’équipe',
  cancelled: 'Annulé',
};
const input = 'mt-2 w-full rounded-xl border border-[#d6ded5] bg-white p-3';

export default async function ChristmasEventAdminPage() {
  const supabase = await createClient();
  const [{data:config,error:configError},{data:requests,error:requestsError}] = await Promise.all([
    supabase.from('christmas_event_config').select('*').eq('event_key','noel-2026').maybeSingle(),
    supabase.from('christmas_event_requests')
      .select('id,full_name,phone,email,requested_places,status,created_at')
      .order('created_at',{ascending:false}).limit(150),
  ]);

  return (
    <div className="admin-page space-y-7">
      <header className="admin-heading">
        <div><p>LA MAISON DES PYJAMAS · NOËL 2026</p><h1>La fête de Noël.</h1><span>Organisez les informations de la fête et répondez aux demandes de places.</span></div>
        <Link href="/fete-de-noel" target="_blank" className="admin-store-link">Voir la page <ArrowUpRight size={17}/></Link>
      </header>
      {configError || !config ? (
        <div className="admin-panel p-7" role="alert">Impossible de charger la configuration de l’événement. Aucun détail ne peut être publié tant que la base est indisponible.</div>
      ) : (
        <section className="admin-panel p-5 md:p-8">
          <div className="admin-panel-title">
            <div><p>01 · INFORMATIONS PRATIQUES</p><h2>Préparer l’annonce</h2></div>
            <CalendarHeart size={24} className="text-[#b3203a]" />
          </div>
          <p className="admin-upload-note mb-5">Renseignez uniquement les modalités confirmées par l’organisatrice. Les champs vides s’affichent « à annoncer » sur le site. Les demandes ne correspondent pas encore à des billets vendus.</p>
          <form action={updateChristmasEventConfig} className="grid gap-5 md:grid-cols-2">
            <label className="xmas-admin-event-field">Date de la fête
              <input className={input} type="date" name="event_day" defaultValue={config.event_day || ''}/>
            </label>
            <label className="xmas-admin-event-field">Heure de début
              <input className={input} type="time" name="event_time" defaultValue={config.event_time?.slice(0,5) || ''}/>
            </label>
            <label className="xmas-admin-event-field">Nom du lieu
              <input className={input} name="venue_name" maxLength={180} defaultValue={config.venue_name || ''} placeholder="À confirmer"/>
            </label>
            <label className="xmas-admin-event-field">Adresse / quartier
              <input className={input} name="venue_address" maxLength={280} defaultValue={config.venue_address || ''} placeholder="À confirmer"/>
            </label>
            <label className="xmas-admin-event-field">Tarif par place (FCFA)
              <input className={input} name="ticket_price_xof" type="number" min={0} max={10000000} defaultValue={config.ticket_price_xof ?? ''} placeholder="Laisser vide si inconnu"/>
            </label>
            <label className="xmas-admin-event-field">Capacité confirmée
              <input className={input} name="capacity" type="number" min={1} max={100000} defaultValue={config.capacity ?? ''} placeholder="Laisser vide si inconnue"/>
            </label>
            <label className="xmas-admin-event-field md:col-span-2">Note aux visiteurs
              <textarea className={input} name="information_note" rows={3} maxLength={1000} defaultValue={config.information_note || ''}/>
            </label>
            <label className="col-span-full flex items-center gap-3 text-sm font-semibold text-[#163f32]">
              <input name="requests_open" type="checkbox" defaultChecked={config.requests_open} className="h-5 w-5 accent-[#b3203a]"/>
              Autoriser les demandes de places (nécessite aussi la validation de confidentialité et l’activation technique)
            </label>
            <button type="submit" className="admin-primary-button col-span-full min-h-12 md:w-fit">Enregistrer les informations</button>
          </form>
        </section>
      )}

      <section className="admin-panel p-5 md:p-8">
        <div className="admin-panel-title">
          <div><p>02 · LISTE DE CONTACT</p><h2>Demandes de places</h2></div>
          <ClipboardList size={24} className="text-[#b3203a]" />
        </div>
        {requestsError ? (
          <p role="alert" className="admin-medias-message">Impossible de lire les demandes. Vérifiez vos autorisations.</p>
        ) : !requests?.length ? (
          <div className="admin-empty">Aucune demande pour le moment. Dès qu’un visiteur envoie sa demande, elle sera visible ici.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="xmas-admin-event-table">
              <thead><tr><th>Date</th><th>Personne</th><th>Contact</th><th>Places demandées</th><th>Suivi</th></tr></thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id}>
                    <td>{new Date(request.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><strong>{request.full_name}</strong></td>
                    <td><a className="text-[#b3203a] underline" href={`tel:${request.phone}`}>{request.phone}</a>{request.email && <p className="mt-1 text-xs">{request.email}</p>}</td>
                    <td>{request.requested_places}</td>
                    <td>
                      <form action={updateChristmasRequestStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={request.id}/>
                        <select name="status" defaultValue={request.status} aria-label={`Statut de ${request.full_name}`}>
                          {Object.entries(states).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button type="submit" className="rounded-lg bg-[#b3203a] px-3 py-2 text-xs font-bold text-white">OK</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-upload-note mt-4">Le statut « confirmé » est réservé à une confirmation manuelle. Aucun paiement ni billet numérique n’est déclenché depuis cette page.</p>
      </section>
    </div>
  );
}
