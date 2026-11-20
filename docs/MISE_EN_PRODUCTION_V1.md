# Publication V1 et stock de la boutique

Production Supabase `pukvrerdloudfiphomsj`. Recette Supabase `oxhymanjibveayhcaqvj`. Le site est un canal de vente de la boutique physique. Une livraison reçue par le personnel augmente le stock disponible. La réservation du site réduit le disponible immédiatement. Le paiement vérifié engage la quantité jusqu’à sa remise.

## État publié — 16 novembre 2026

La PR #14 est fusionnée, `main` et la production Netlify sont à `4efb9d4`. La production contient **66 migrations**, 18 produits, 53 variantes, 551 unités et 9 commandes historiques. La migration V1 est terminée : **ne pas rejouer les procédures de migration ci-dessous**, conservées comme historique technique. Sauvegarde/restauration : run GitHub Actions `43879477683` ; migration : `43880456079`.

Prix actuellement enregistrés : 10 000–45 000 FCFA. Aucun prix uniforme ni quantité uniforme n’est autorisé. Paiements et commandes publiques restent fermés.

## Migration (historique — déjà exécutée)

Le 13 novembre 2026, la production comptait 18 produits, 53 variantes et 9 commandes. Le contrôle a retrouvé les contraintes historiques attendues sur `payment_attempts`. Les prix indicatifs des produits étaient déjà alignés sur le prix minimal de leurs variantes actives. Onze lignes de commandes étaient candidates au remplissage de la nouvelle colonne de photo depuis le catalogue actuel. Ce remplissage ne peut pas restituer la photo originale lorsque celle-ci n’était pas conservée.

1. Confirmer le point de restauration de production et les moyens de restaurer PostgreSQL, les comptes et les fichiers Storage. Exercer la restauration dans un environnement isolé et protéger les données clients. La CI utilise une structure de production et des commandes synthétiques.
2. Comparer l’historique distant et le SQL de chaque migration. Le SQL de `add_noel_pajama_sizes` a été comparé à celui de la production et son fichier renommé en `20261023132029`. Cette migration est déjà appliquée en production. La réconciliation et les réceptions physiques sont déjà appliquées en recette sous `20261113150500` et `20261113154852`.
3. En production, appliquer dans l’ordre les dix migrations commerciales de `20261029093122_fedapay_commerce` à `20261113154852_physical_stock_receipts` après avoir vérifié leurs dépendances. Utiliser les versions du dépôt dans l’historique. Réserver `supabase/recette/bootstrap-production-schema.sql` aux bases jetables.
4. Pendant la fenêtre de migration, suspendre les écritures du personnel, capturer les références et montants historiques, les quantités par variante, les comptes et rôles, et l’inventaire des médias. Comparer ces relevés après application. Contrôler les droits staff et anon, les fonctions de réservation, les commandes existantes, les mouvements de stock, et les écrans mobile et ordinateur avec un compte staff autorisé.
5. Préparer la publication Netlify avec les quatre options sur `false` dans Production. Vérifier `NEXT_PUBLIC_SUPABASE_URL` et la provenance des clés, puis fusionner la PR #14 et tester le site public et le back-office. L’ancien back-office fait des écritures directes de stock que la nouvelle migration bloque. Garder la gestion de stock suspendue jusqu’au déploiement de l’administration compatible.

## Exécution outillée (16 novembre 2026)

Les dix migrations s'appliquent en une seule transaction, dans l'ordre des versions du dépôt. Aucune ne supprime de table, de colonne ou de ligne.

1. `supabase/production/preflight.sql` — lecture seule. Toutes les lignes `BLOQUANT` doivent être à `true`. Conserver le résultat.
2. `node scripts/build-production-migration.mjs > v1-production.sql` — produit la transaction. Elle refuse de démarrer si une migration V1 est déjà enregistrée ou si `add_noel_pajama_sizes` manque, inscrit les dix versions du dépôt dans `supabase_migrations.schema_migrations`, puis compare avant `commit` les produits, variantes, prix, stocks, commandes et lignes. Le moindre écart lève une erreur et annule tout.
3. Exécuter `v1-production.sql` avec un rôle propriétaire (éditeur SQL Supabase ou `psql`), en une seule fois. Ne pas passer par un outil qui renumérote les versions.
4. `supabase/production/postflight.sql` — lecture seule. Toutes les lignes à `true`, empreintes identiques au préflight.

`node scripts/rehearse-production-migration.mjs` rejoue cette séquence dans la CI sur la structure de production : application, refus d'un second passage, et retour arrière complet lorsqu'un prix serait réécrit. Cette répétition ne remplace ni la sauvegarde ni le test de restauration sur les données réelles.

Dépendances vérifiées : `fedapay_commerce` remplace deux contraintes créées par `sandbox_payment_acceptance` et modifie `payment_attempts` ; `live_test_price_quotes` réaligne `products.base_price` sur le prix minimal des variantes actives (bloqué par le préflight s'il y a un écart) ; `order_reconciliation` remplit `order_items.image_url` avec la photo actuelle ; `physical_stock_receipts` interdit au personnel d'écrire `stock_quantity` hors de `admin_record_stock`, ce qui rend l'ancien écran de stock inopérant jusqu'à la fusion de la PR #14.

## Exécution à distance par GitHub Actions

Le workflow manuel `production-release` (`.github/workflows/production-release.yml`) remplace toute opération sur un poste personnel. Il ne se lance que depuis `main`, sur un commit nommé explicitement, tête de la PR #14 et vert en CI. Ses deux phases tournent dans l'environnement GitHub protégé `production` : les secrets ne sont remis au job qu'après approbation du relecteur obligatoire. Le dépôt étant public, les journaux et les artifacts le sont aussi : seuls des comptages, empreintes et résultats de contrôle y figurent.

Configuration unique, dans GitHub → Settings → Environments → `production` :

- relecteur obligatoire : le propriétaire ; branches autorisées : `main` uniquement ;
- secret `PROD_DB_URL` : chaîne de connexion « Session pooler » de `pukvrerdloudfiphomsj` ;
- secret `SUPABASE_SERVICE_ROLE_KEY` : clé de service de `pukvrerdloudfiphomsj` (dépôt de la sauvegarde chiffrée) ;
- secret `BACKUP_PASSPHRASE` : phrase d'au moins 24 caractères, à conserver hors de GitHub — sans elle la sauvegarde est indéchiffrable.

Phase `backup-drill` (lecture seule sur la production) : sauvegarde complète, restauration stricte sur PostgreSQL 17 jetable (toute erreur de `pg_restore` arrête le run), comparaison des empreintes, des comptages table par table et de l'historique des migrations, préflight, répétition de la migration et du postflight sur la copie. La sauvegarde est chiffrée en AES-256, déposée dans le bucket privé `release-backups` du projet, relue et déchiffrée pour preuve, avec une rétention de 30 jours. Aucun dump n'est publié en artifact.

Phase `production-migration` : exige le numéro du run `backup-drill` réussi, la saisie `MIGRER LA PRODUCTION`, une preuve de moins de 12 heures pour le même commit, un préflight rejoué, une production inchangée depuis la sauvegarde et une transaction identique à celle répétée. Les dix migrations partent en une transaction ; tout échec l'annule. Le postflight suit.

Le job de CI `release-rehearsal` exécute ces mêmes scripts sur PostgreSQL 17 contre une production simulée, y compris le refus d'une restauration en erreur et d'une seconde migration.

## Sauvegarde et preuve de restauration (prérequis de la migration)

État du préflight exécuté sur la production le 16 novembre 2026 : 11 contrôles bloquants validés sur 11 ; 56 versions ; 18 produits, 53 variantes, stock total 551 ; 9 commandes de test, 11 lignes, 5 clients, 402 000 FCFA ; empreinte catalogue `e8602adf188a2bad5f54d8a269a5ed96`, empreinte commandes `a42e571da59febbee26c278814548ebb`.

```bash
export PROD_DB_URL='…'   # Supabase → Connect → Session pooler (IPv4). Ne jamais l'écrire ailleurs.
PG_CONTAINER=… DRILL_ADMIN_URL=… bash scripts/release/backup-drill.sh
```

Le script ne fait que lire la production. Il produit `backups/<horodatage>/full.dump` (sauvegarde complète), restaure les schémas commerciaux dans un PostgreSQL Docker jetable, compare la copie à la production, puis joue la migration V1 et le postflight sur cette copie. Il s'arrête avec « NE PAS MIGRER » au premier écart. Aucun service payant. Prérequis : Docker, Node.js ; l'image `postgres:17` fournit `pg_dump` dans la version du serveur.

La preuve est `backups/<horodatage>/PREUVE.txt`. Les empreintes `catalogue` et `empreinte_commandes` qu'il contient doivent être celles du préflight ci-dessus. Le dossier `backups/` est ignoré par Git et contient des données clients : le conserver dans un espace protégé. Les fichiers du Storage ne font pas partie d'une sauvegarde SQL ; la migration V1 ne les touche pas.

Pour restaurer la production à partir de cette sauvegarde : `pg_restore --clean --if-exists --dbname "$PROD_DB_URL" backups/<horodatage>/full.dump`, uniquement sur décision du propriétaire.

Avec un connecteur SQL limité en taille, `node scripts/build-production-migration.mjs --compact` produit la même transaction sans recopier le SQL dans l'historique.

## Commandes pour la session autorisée sur Supabase

`PROD_DB_URL` est la chaîne de connexion PostgreSQL de `pukvrerdloudfiphomsj` (Supabase → Connect). Elle se place dans une variable d'environnement locale, jamais dans Git, un rapport ou une conversation.

```bash
# 1. Lecture seule : écart sur les commandes, catalogue réel, préflight. Rien n'est écrit.
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -P pager=off \
  -f supabase/production/orders-check.sql \
  -f supabase/production/catalogue-review.sql \
  -f supabase/production/preflight.sql | tee preflight-production.txt

# 2. Après sauvegarde confirmée, restauration testée et préflight sans bloquant : une transaction.
node scripts/build-production-migration.mjs > v1-production.sql
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f v1-production.sql

# 3. Lecture seule : contrôle après migration.
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -P pager=off -f supabase/production/postflight.sql | tee postflight-production.txt
```

Avec un connecteur SQL à la place de `psql` : exécuter le contenu de chaque fichier tel quel sur `pukvrerdloudfiphomsj`. `preflight.sql` et `postflight.sql` sont chacun une seule requête. `orders-check.sql` contient trois requêtes à lancer séparément. `v1-production.sql` doit partir en un seul envoi, avec son `begin` et son `commit` ; ne pas utiliser l'outil de migration du connecteur, qui renumérote les versions.

Par défaut, la transaction laisse les lignes de commande existantes sans photo : le remplissage prévu par `order_reconciliation` y mettrait la photo actuelle du catalogue, pas celle vendue à l'époque. L'option `--keep-historical-photos` l'applique ; elle exige l'accord explicite du propriétaire.

## Validation du catalogue par la boutique

Ne pas appliquer 30 unités par taille ni 30 000 FCFA par lot. L'ancien script `supabase/production/provisional-catalogue.sql` est neutralisé et refuse toute exécution, y compris avec ses anciennes confirmations.

Depuis **Produits & stocks**, le personnel confirme chaque référence et taille : unité vendue (pièce ou lot et composition), prix et quantité physique. Le prix se corrige avec **Enregistrer le prix**. Une livraison réellement reçue passe par **Réceptionner des marchandises**, avec sa référence. Un écart d'inventaire passe par **Corriger une quantité**, avec son motif. Les réceptions, réservations et quantités payées à remettre restent distinctes. Conserver les anciennes commandes.

## Rétablissement

Revenir au dernier déploiement Netlify connu en cas d’erreur applicative et garder les ventes et les écritures de stock suspendues. Si les contrôles indiquent une atteinte aux données, restaurer d’abord le point validé dans un environnement isolé, puis décider avec le propriétaire de la restauration et de la reprise des écritures postérieures au point choisi. Réconcilier les événements financiers avec FedaPay avant toute reprise. Une restauration SQL seule ne recrée pas les objets Storage effacés.

## Mise en service progressive

Voir [la procédure opérationnelle Terrain 8](MISE_EN_SERVICE_TERRAIN8.md) pour les preuves attendues, le contrôle en production fermée et le retour à l’état fermé.

- Production Netlify, configurer `PAYMENT_CHECKOUT_ENABLED=false`, `FEDAPAY_ENABLED=false`, `FEDAPAY_LIVE_APPROVED=false`, `ORDER_NOTIFICATIONS_ENABLED=false`.
- Resend, renseigner `RESEND_API_KEY` et `RESEND_WEBHOOK_SECRET` en secrets de production, puis `ORDER_EMAIL_FROM`, `ORDER_ADMIN_EMAIL` et `ORDER_TEST_EMAILS`. Créer un webhook distinct pour `/api/notifications/resend` sur l’origine réellement publiée. Vérifier le message de test dans l’historique Supabase et la livraison fournisseur signée. Pour cet envoi staff avec données fictives uniquement, utiliser temporairement `ORDER_EMAIL_DEMO_ENABLED=true` et une adresse de la liste de test.
- FedaPay, réconcilier en lecture seule la transaction de recette `113943841` avant tout autre test financier. Confirmer le marchand Live `101915`, les clés et le webhook, puis obtenir l’accord sur le test réel et rapprocher la commande, le stock, le paiement et les e-mails.
- Faire confirmer par la boutique l’inventaire physique, les prix, les tarifs et zones de livraison, les moyens de paiement, les coordonnées et les conditions de vente et retour avant l’ouverture.

## Sauvegarde courante après migration V1 — Terrain 12 (20 novembre 2026)

Le workflow `production-release` distingue désormais trois phases explicites :

| Phase | Référence autorisée | Opérations | Preuve de migration |
| --- | --- | --- | --- |
| `backup-drill` | SHA complet du commit `main` exécutant le workflow, CI verte | Dump complet, restauration isolée, comparaison du schéma et de toutes les lignes des schémas restaurés, stockage chiffré, relecture, rétention | Non : `backup_mode=current` |
| `v1-rehearsal` | Référence historique PR #14, CI verte, confirmation `REPETER V1` | Même sauvegarde ; préflight historique strict sur la source en lecture seule ; V1 sur la copie isolée seulement | Oui, uniquement si tous les contrôles réussissent |
| `production-migration` | Référence historique PR #14, CI verte, confirmation `MIGRER LA PRODUCTION` | Parcours historique conservé : preuve V1 récente du même workflow/commit, préflight strict récent, empreinte source inchangée et hash de transaction identique | Un backup courant est explicitement refusé avant toute requête SQL |

La production actuelle est déjà migrée : ne lancer que `backup-drill`. Ne jamais sélectionner les phases historiques pour la validation de la rotation. Les scripts proviennent toujours du commit de confiance qui exécute le workflow (`github.sha`) ; une saisie d'un ancien SHA ne permet plus d'exécuter un ancien script de sauvegarde dans le parcours courant.

Le job sans secret refuse un environnement `production` absent, illisible ou dépourvu de relecteur obligatoire. Les deux jobs accédant aux secrets conservent `environment: production`, `needs: verify` et la concurrence globale `production-release` sans annulation. Aucune protection n'est créée ou modifiée par ce correctif.

La restauration utilise le même `full.dump` qui est ensuite chiffré et stocké, plutôt qu’un second dump indépendant. Elle reste strictement limitée aux schémas `public`, `auth` et `supabase_migrations`, comme auparavant ; le dump `full.dump` contient tous les schémas. Les objets Storage (photos et autres fichiers) ne sont pas inclus dans un dump PostgreSQL. Les versions des extensions non disponibles sur le serveur jetable figurent dans les preuves ; toute dépendance empêchant la restauration reste bloquante.

Le stockage exige désormais la preuve de restauration/comparaison du dump exact. Toute nouvelle tentative efface l'ancienne preuve avant le dump. Le workflow exige une clé `sb_secret_` via `SUPABASE_SERVICE_ROLE_KEY`, envoyée dans `apikey` uniquement. Un rejet HTTP 401/403 indique explicitement le secret concerné sans afficher sa valeur. Le bucket doit rester privé ; seul le chiffrement AES-256 est envoyé. La relecture compare le ciphertext puis le dump déchiffré, avant toute suppression de rétention.

Validation après fusion : attendre la CI verte de `main`, lancer ce workflow depuis `main`, phase `backup-drill`, `release_sha` = SHA complet courant de `main`, laisser les champs historiques vides. Le relecteur humain approuve ensuite le job protégé. L'artifact `release-evidence/PREUVE.txt` doit inclure `backup_mode=current`, `restauration_verifiee=true`, `type_cle_stockage=sb_secret`, le hash de l'objet chiffré, la relecture identique et la rétention. Sans ces éléments, ne pas déclarer la nouvelle clé validée et ne pas désactiver Legacy.

Les comparaisons sont effectuées en lecture seule après le dump. Si des événements concurrents modifient une table, le contrôle peut refuser la sauvegarde ; il faut relancer une sauvegarde sur un état stabilisé, jamais supprimer la comparaison.
