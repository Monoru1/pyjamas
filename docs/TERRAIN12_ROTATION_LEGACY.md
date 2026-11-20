# Terrain 12 — Préparation de la désactivation Legacy

Date d'inspection : 20 novembre 2026. Projet : `pukvrerdloudfiphomsj`.

**La désactivation n'est pas autorisée à ce stade.** La validation réelle du stockage GitHub avec la nouvelle clé doit précéder toute décision. Aucun secret, interrupteur commercial, fonction déployée ou donnée commerciale n'a été modifié par ce travail.

## Dépendances constatées et limites

| Surface | Constat vérifié | Action avant désactivation |
| --- | --- | --- |
| Netlify, clé publique | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` utilise `sb_publishable_` en production et dans les autres contextes listés | Vérifier que le déploiement publié incorpore cette configuration, puis connexion admin/lecture catalogue sans mutation |
| Netlify, clé serveur | `SUPABASE_SERVICE_ROLE_KEY` marquée secrète, mise à jour le 20/11 à 10:58 UTC ; valeur masquée par l'API. Nouvelle clé déclarée installée par l'opérateur | Vérification de type et fonctionnement à confirmer par une preuve serveur, sans journaliser la clé. Ne pas inférer son préfixe depuis le nom de variable |
| Netlify, ventes | `PAYMENT_CHECKOUT_ENABLED=false`, `FEDAPAY_LIVE_APPROVED=false` dans le contexte production au moment de la lecture | Conserver les valeurs ; aucune modification dans cette PR |
| GitHub environnement `production` | Secret déclaré remplacé par l'opérateur ; la lecture de sa valeur n'est pas possible. Dernier run 44725326173 : garde d'environnement réussi, restauration réussie, stockage ignoré | Nouveau run depuis le commit fusionné ; artefact avec `type_cle_stockage=sb_secret` et relecture réussie obligatoire |
| Clients navigateur et SSR | `src/lib/env.ts`, clients Supabase et middleware utilisent la variable publique publishable ; pas de variable Legacy `anon` trouvée dans le code actif | Vérifier les builds déjà publiés et les éventuels clients hors dépôt |
| Clients serveur Next.js et tâches Netlify | Utilisent la variable serveur `SUPABASE_SERVICE_ROLE_KEY` via supabase-js 2.110.2. Le nom historique ne prouve pas le type réel de la clé | Les tâches de rapprochement, notifications et vérification de services héritent du contexte Netlify, à confirmer sur le déploiement courant |
| Edge Function **déployée** `create-order-request` | Unique fonction retournée par l'API de production : ACTIVE, version 10, `verify_jwt=false`. Son code lit **`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`**, crée un client admin et emploie cette même clé comme clé HMAC du budget de requêtes | **Dépendance Legacy restante à traiter.** Utiliser une clé moderne disponible côté fonction (par ex. clé nommée dans `SUPABASE_SECRET_KEYS`, après vérification du format disponible). Préparer une correction séparée et vérifier la fonction déployée. Aucune modification/déploiement dans Terrain 12 |
| Appelant historique de la fonction | `src/app/panier/actions.ts` appelle la fonction avec `apikey` = clé publique publishable ; aucune authentification JWT de passerelle exigée | Conserver validations et limites existantes. Ne pas activer des commandes réelles pour tester ; utiliser une recette isolée et des appels sans mutation |
| Automatisations externes, autres dépôts, secrets Supabase, cron/Vault/pg_net/webhooks | Pas d'inventaire complet disponible via les capacités utilisées ; absence de références dans le dépôt ne démontre pas une absence d'usage hors dépôt | Inventorier chaque secret/configuration et caller externe. Vérifier les tâches DB et intégrations sans extraire de valeur de secret dans un rapport |

L'utilisation de la clé API comme clé HMAC par `create-order-request` mérite une correction séparée : une rotation change les empreintes du même contact et peut réinitialiser son budget courant. Préférer à terme un secret HMAC dédié ; cette PR n'ajoute ni ne change aucune clé. Le `verify_jwt=false` déployé n'élimine pas la dépendance interne à la clé Legacy.

## Procédure après preuve de sauvegarde et correction des dépendances

1. Conserver le lien du run réussi, son commit et l'artifact non sensible ; vérifier chiffrement, relecture et rétention. Le simple succès de pg_dump ne valide pas la clé de Storage.
2. Corriger les consommateurs Legacy restants dans une PR distincte, les tester en recette, puis déployer après validation. Conserver les ventes fermées pendant cette préparation.
3. Confirmer l'inventaire des contextes Netlify, environnements GitHub, fonctions déployées, jobs DB, autres dépôts et intégrations externes. Noter explicitement les inconnues restantes.
4. Obtenir l'autorisation explicite de Ryad pour la désactivation. Dans Supabase, Settings > API Keys > Legacy anon, service_role API keys : désactiver les clés Legacy du projet exact. **Ne jamais régénérer, tourner ni révoquer le JWT Secret ou une clé de signature Auth dans cette opération.**
5. Contrôler catalogue public, médias, session/connexion admin, lectures serveur, fonction historique avec requête sans mutation et logs d'authentification/Storage. Relancer le backup courant avec approbation humaine ; ne créer aucune commande et ne réaliser aucun paiement pour ces contrôles.
6. Conserver `PAYMENT_CHECKOUT_ENABLED=false` et `FEDAPAY_LIVE_APPROVED=false`. La désactivation des clés n'autorise pas l'ouverture commerciale.

## Retour arrière

Si un consommateur oublié échoue, réactiver l'option Legacy dans la même page API Keys ; ne pas régénérer le JWT Secret, ne pas changer les clés modernes, ne pas restaurer la base. Vérifier les lectures et jobs qui échouaient, identifier le consommateur, corriger sa configuration avant une nouvelle tentative. La réactivation est une action d'opérateur sous autorisation ; elle n'est pas exécutée par Terrain 12.

Référence officielle : https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
