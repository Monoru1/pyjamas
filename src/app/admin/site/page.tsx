import { updateSiteSettings } from '@/app/admin/actions';
import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function SiteSettingsPage() {
  const settings = await getStoreSettings();
  return <div className="admin-page"><header className="admin-heading"><div><p>CONTENU DU SITE</p><h1>Réglages de la maison.</h1><span>Les informations utilisées partout dans la boutique.</span></div></header><section className="admin-panel site-settings-panel"><div className="admin-panel-title"><div><p>IDENTITÉ & COMMANDES</p><h2>Informations générales</h2></div></div><form action={updateSiteSettings} className="site-settings-form"><label>Nom de la boutique<input name="site_name" defaultValue={settings.siteName}/></label><label>Numéro WhatsApp<input name="whatsapp_phone" defaultValue={settings.whatsappPhone} placeholder="229XXXXXXXX"/></label><label className="field-wide">Message WhatsApp par défaut<textarea name="whatsapp_message" rows={5} defaultValue={settings.whatsappDefaultMessage}/></label><button className="admin-primary-button">Enregistrer les réglages</button></form></section></div>;
}
