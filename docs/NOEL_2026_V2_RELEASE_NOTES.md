# Noël 2026 — Stabilisation de la vitrine et du studio (PR #2)

**État de la branche** : `feat/christmas-storefront-admin-v2` — n'est pas automatiquement publiée sur `main`.

## Incident de production et mesures

Le 20 octobre 2026, l'utilisateur a signalé le crash de `/admin` et une expérience publique trop lente.
Le déploiement Netlify « ready » n'avait **pas** prouvé l'absence de crash à l'exécution.

Observations de l'audit :
- Le proxy actuel vérifiait Supabase Auth sur **toutes** les pages, y compris accueil, catalogue et médias.
- Certains appels à froid sur l'accueil Netlify ont nécessité près de **5–6 secondes**.
- La restauration du projet Supabase `pukvrerdloudfiphomsj` est confirmée `ACTIVE_HEALTHY`.
- Le crash de la capture initiale n'a pas pu être relié à un stacktrace spécifique : les logs anciens n'étaient plus accessibles au moment de l'audit.

Corrections appliquées :
1. Proxy limité à `/admin` et `/admin/:path*`.
2. En cas d'exception Auth, l'accès protégé échoue **fermement**, avec redirection vers la connexion, jamais divulgation de données.
3. Client Supabase **anonyme sans cookies** pour les lectures publiques.
4. `revalidate=60` pour l'accueil et le catalogue ; contenu réactualisable côté Next.
5. Abandon des effets plein écran bloquants / arbres et clics animés sur toutes les routes.
6. Médias photogaphiques locaux légers ; clips chargés **seulement sur interaction**.
7. Des tests HTTP réels de la Deploy Preview couvrent l'accueil, le catalogue, les routes Auth, les images, la vidéo et les redirections admin.

Important : la performance doit aussi être vérifiée en navigation mobile et sur déploiement de production. L'échec fermé Auth ne remplace pas un message de maintenance côté employé en cas de panne externe.

## Média Drive (sélection initiale)

Sources : dossier Google Drive « La maison des pyjamas », inventaire initial de **27 photos et 53 vidéos**. La PR contient une sélection réelle vérifiée, pas la totalité des originaux.

- Photos Noël en famille et portrait familial : `public/christmas-2026/*.jpg`.
- Vidéo éditoriale légère : `public/christmas-2026/christmas-family-reel.mp4` (environ 636 Ko).
- Vidéo de la boutique : `public/christmas-2026/boutique-reel.mp4` (environ 1,1 Mo).
- L'accueil et la navigation ont une palette rouge, vert sapin et ivoire, avec mise en page responsive.
- Le site n'utilise pas de liens Drive temporaires pour les médias livrés.

**Validation obligatoire de la propriétaire avant diffusion** : droits d'image de toutes les personnes photographiées ou filmées, notamment les enfants. Ne pas traiter la présence dans Drive comme une autorisation juridique automatique.

## Base et collections

Deux migrations **non destructives** ont été appliquées et vérifiées au projet Supabase :
- `0053_christmas_video_storage.sql` : bucket public `christmas-videos`, RLS upload/update/delete réservé aux comptes `is_admin()`, fichiers MP4/WebM limités à **50 MiB**.
- `0054_noel_collection_focus.sql` : conservation de toutes les anciennes collections et de leurs relations ; elles sont masquées (`is_active=false`) plutôt que supprimées ; `noel` reste active. `promotions` reste active pour la mécanique de réduction mais n'est jamais rendue comme collection commerciale en boutique.
- L'ancien état actif/inactif est sauvegardé dans `public.settings` sous la clé `pre_noel_2026_collection_visibility`.
- Résultat SQL vérifié : **6 produits liés à `noel`**.

Pour restaurer la visibilité (après examen humain) :

```sql
select value
from public.settings
where key = 'pre_noel_2026_collection_visibility';
```

La restauration des anciennes valeurs doit se faire avec une migration réversible utilisant ce snapshot, jamais en effaçant les relations ou les commandes.

## Espace employés

- Navigation avec menu mobile, raccourci boutique, tableaux existants des commandes, produits, stock, promotions et nouvelle médiathèque.
- `/admin/medias` : téléchargement **direct navigateur → Supabase Storage** après vérification de session et rôle `is_admin`, inscription `media_assets` en RLS, activation/désactivation de métadonnées.
- Images limitées à 5 MiB JPG/PNG/WebP ; vidéos limitées à 50 MiB MP4/WebM. Les gros rushs du Drive doivent être montés et compressés avant de les charger.
- `/admin/site` : sélection des photos et de la vidéo de l'accueil depuis la médiathèque, sans code ni clé secrète.
- `/admin/collections` : édition de Noël, liste des archives en lecture seule, suppression accidentelle des autres collections retirée de l'interface.
- Le compte `super_admin` reste protégé par Supabase Auth ; la fonction `is_admin()` autorise les rôles actifs `super_admin`, `admin`, `employee`. Les rôles n'ont pas été modifiés.
- La récupération par e-mail nécessite toujours les URL autorisées et l'envoi SMTP Supabase à valider. Aucun mot de passe client n'a été lu ou transmis.

**À tester avec le compte propriétaire réel** : connexion, mobile, upload image/vidéo, mise en avant de la vidéo, modification collection et passage de commande.

## Suite après stabilisation

- Lier les véritables shootings aux fiches produits **après identification des SKU, prix, tailles et droits** ; ne pas inventer de correspondances.
- Traiter le reste des médias pertinents, monter les clips de démonstration, documenter les consentements.
- Intégrer FedaPay via transaction côté serveur, webhook validé et sandbox ; ne jamais activer Live sans accord, tests et configuration du marchand.
- Corriger les vulnérabilités remontées par `npm audit` après analyse de leur exploitabilité (ne pas forcer des upgrades cassants).
- Vérifier Core Web Vitals mobile, accessibilité, redirections OAuth, e-mails, panier complet, logique stocks.
