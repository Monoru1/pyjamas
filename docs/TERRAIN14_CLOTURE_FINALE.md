# Terrain 14 — Clôture finale et validation commerciale

Date : 20 novembre 2026. Dépôt `Monoru1/pyjamas`, branche `main` à `b8d6e2f555927ffcecc861d0e7bba97957cb30af`. Projet Supabase `pukvrerdloudfiphomsj`. Site `https://pyjamas25.netlify.app`.

Méthode : chaque constat ci-dessous vient d'une preuve consultée directement dans cette session (API GitHub, API Netlify, boîte mail Resend/Gmail, panneau admin déjà authentifié dans le Chrome de Ryad, code source au commit indiqué) — jamais d'une relecture des affirmations du brief. Les points qui n'ont pas pu être vérifiés sont signalés comme tels, pas déclarés par défaut.

## 1. État du dépôt et du déploiement Netlify

- `main` à `b8d6e2f555927ffcecc861d0e7bba97957cb30af` (PR #41 fusionnée), aucune modification en attente.
- Site `pyjamas25` (id `42bea529-6f67-4dfb-b5e0-642cf9ce7456`) : déploiement courant `ready`, URL primaire `https://pyjamas25.netlify.app`.
- Catalogue public consulté en direct : 6 produits affichés, stocks numériques réels (60/60/60/60/49), un coffret cadeau explicitement marqué « Disponibilité à confirmer » plutôt que proposé à la vente. Aucun produit non vendable proposé en achat direct constaté.
- **Écart à confirmer avec Ryad (non résolu par ce rapport) :** le catalogue public affiche aujourd'hui 8 000 FCFA pour « Pyjama bébé Noël — carreaux rouges », alors que la commande réelle du 19/11 a été facturée 10 000 FCFA pour la même référence (`LMP-N-BEBE-CARREAUX-ROUGES-03-06M`). Je n'ai pas modifié de prix ni tranché — c'est une décision/vérification métier, pas un défaut technique démontré.

## 2. Preuve de sauvegarde GitHub

- Run `44752612469` (déclenché depuis `main`@`b8d6e2f`) : `source_objects=691`, `restored_objects=691`, `differences=[]`.
- `PREUVE.txt` de l'artefact : `restauration_verifiee=true`, objet chiffré `production/20261120T142329Z-b8d6e2f.dump.gpg` dans le bucket privé `release-backups`, AES-256 uniquement (aucun texte clair), relecture/déchiffrement identiques à la sauvegarde, rétention 30 jours, 0 objet purgé.
- Cause des 6 différences du run précédent (`44744772530`) identifiée et corrigée : artefact d'ordre d'impression des blocs `DEFAULT ACL` dépendant de l'OID des rôles destinataires (la restauration logique ne préserve jamais les OID). Correctif scopé aux seuls blocs DEFAULT ACL dans `schema-manifest.mjs`, prouvé sur PostgreSQL 17.12 réel (avant/après), sans affaiblir la détection de vraies différences (testé : grantee manquant → toujours détecté ; privilège élargi → toujours détecté). PR #41 fusionnée après CI verte et revue Codex sans anomalie.
- **Ne pas revenir sur ce système sans nouvelle anomalie démontrée — aucune n'a été trouvée.**

## 3. État de la migration Supabase Legacy

**Verdict : LEGACY BLOCKED** (préparation avancée, pas encore prête pour désactivation).

| Surface | Constat vérifié | Lacune |
| --- | --- | --- |
| Pipeline de sauvegarde GitHub Actions | `store-backup.sh` **rejette activement** tout format non `sb_secret_` (regex, exit 1) ; le run réel `44752612469` a réussi avec `type_cle_stockage=sb_secret`. Preuve fonctionnelle en production. | Aucune — surface démontrée Legacy-free |
| Fonction Edge `create-order-request` | Code source à `main`@`b8d6e2f` : lit uniquement `SUPABASE_SECRET_KEYS` (format `sb_secret_` validé par regex) et un secret HMAC dédié `ORDER_REQUEST_HMAC_SECRET` ; aucune référence à une clé Legacy. Docs internes (`TERRAIN12`/`TERRAIN13`) confirment que la version précédemment déployée (v10) utilisait bien `SUPABASE_SERVICE_ROLE_KEY` Legacy et a été corrigée. | **Je n'ai pas pu lire la fonction réellement déployée** : le connecteur Supabase MCP de cette session n'a aucun accès au projet `pukvrerdloudfiphomsj` (`list_edge_functions` et `get_project_url` renvoient tous deux une erreur de permission). Le numéro de version (« v16 ») et la configuration live restent donc non confirmés par moi — seulement par le code source commité. |
| Code serveur Next.js (paiements, stockage recettes, `fête de Noël`) | Utilise la même variable `SUPABASE_SERVICE_ROLE_KEY` sans aucune validation de format. Trafic Netlify récent (13h36–14h36 UTC aujourd'hui, après la mise à jour de la variable à 10h58 UTC) : 100 % succès (69 requêtes, codes 200/202/204, zéro erreur). | Le succès ne prouve pas l'absence de Legacy : une clé Legacy encore valide produirait le même résultat. Valeur jamais affichée (conforme à la consigne). |
| Netlify, clé publique | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...` en production. | Aucune |
| Consommateurs externes / hors dépôt | Aucun inventaire complet possible avec les outils disponibles. | **Explicitement non démontré absent** — à ne pas confondre avec une preuve d'inexistence |

**Action demandée : attendre le GO explicite de Ryad avant toute désactivation.** Aucune clé Legacy n'a été désactivée. Le JWT Secret et les clés de signature Auth n'ont pas été touchés.

## 4. État réel FedaPay et Resend

- FedaPay : `FEDAPAY_ENVIRONMENT=live`, `FEDAPAY_ENABLED=true`, marchand `101915`, `FEDAPAY_LIVE_APPROVED=false` (conservé fermé).
- Transaction réelle vérifiée directement dans le panneau admin (session déjà authentifiée de Ryad, lecture seule, aucune donnée modifiée) : commande `MDP-20261119-6E3AC2`, identifiant FedaPay `114300443`, statut `paid`, 10 000 FCFA XOF, confirmation 19/11 13:25. Stock marqué `committed` (une seule décrémentation constatée, aucun signe de double décrément). Historique de vérification serveur montre 4 relectures de réconciliation (13h10, 13h25, 13h39, puis 20/11 13h40) toutes cohérentes à `paid` — pas de double traitement.
- Resend : 2 notifications exactement pour cette commande (équipe + acheteur), chacune envoyée 1 seule fois, statut `Livré` confirmé par événement de livraison signé Resend (pas seulement « accepté »). Recherche Gmail du 19/11 ne montre aucun doublon.
- **Aucun nouveau paiement réel n'a été créé pour cette vérification.**

## 5. État des commandes et du stock

- Panneau admin : 10 commandes au total. La commande vérifiée en détail (ci-dessus) est cohérente de bout en bout (journal, paiement, stock, notifications).
- `PAYMENT_SHIPPING_XOF=0` en production — cohérent avec le total de livraison à 0 FCFA affiché sur la commande réelle.
- Écart de prix catalogue vs commande signalé en Section 1 : à vérifier, je n'ai rien modifié.

## 6. Contrôles de sécurité restants

- `PAYMENT_CHECKOUT_ENABLED=false` et `FEDAPAY_LIVE_APPROVED=false` en production — confirmés inchangés, ventes toujours fermées.
- Aucun secret affiché en clair à aucun moment de ce travail (clés Netlify lues masquées, contenu des clés Supabase jamais demandé en clair).
- Aucune suppression, désactivation Legacy, migration de production, modification commerciale ou paiement réel n'a été effectué.
- Dépendance Legacy résiduelle non démontrée absente sur le code serveur Next.js (Section 3) — reste un point de vigilance avant toute désactivation.

## 7. Décisions métier nécessitant l'intervention de Ryad

1. Écart de prix catalogue (8 000 FCFA) vs commande facturée (10 000 FCFA) pour la même référence — confirmer le prix réel voulu.
2. Confirmation explicite que la valeur actuelle de `SUPABASE_SERVICE_ROLE_KEY` (Netlify ET GitHub) est bien une clé moderne `sb_secret_` partout où ce n'est pas démontré par le code (seul le chemin de sauvegarde GitHub Actions le démontre mécaniquement).
3. Confirmation de la version réellement déployée de la fonction Edge `create-order-request` (je n'ai pas d'accès Supabase pour la lire moi-même dans cette session).
4. Inventaire des consommateurs externes/hors dépôt des clés Supabase — aucun outil disponible ici ne peut le garantir exhaustif.
5. Frais de livraison, stock physique réel, destinataires de notification, méthodes de paiement réellement proposées, procédure de préparation/remise — à confirmer explicitement si une ouverture commerciale est envisagée (rien n'a été inventé ni modifié ici).
6. GO explicite requis avant toute désactivation des clés Legacy `anon`/`service_role`.
7. GO explicite requis avant toute ouverture commerciale (`PAYMENT_CHECKOUT_ENABLED` / `FEDAPAY_LIVE_APPROVED`).

## 8. Corrections réellement effectuées

- `scripts/release/schema-manifest.mjs` : canonicalisation de l'ordre des lignes dans les blocs DEFAULT ACL (cause réelle des 6 différences), avec test dédié ajouté (`schema-manifest.test.mjs`, 11 tests, tous verts) prouvant que les vraies différences (grantee manquant, privilège élargi) restent détectées.
- `scripts/release/simulate-production.sh` : scénario multi-grantee renforcé pour mieux exercer la forme réelle des blocs DEFAULT ACL en CI.
- `docs/TERRAIN14_BACKUP_ACL_OWNERSHIP.md` : documentation de la cause et de la preuve, en français, cohérente avec le style existant.
- PR #41 fusionnée après CI verte (quality, commerce-postgres, release-rehearsal) et revue Codex sans anomalie (`has_any_findings:false`).
- Aucune refonte, aucun nettoyage esthétique entrepris (hors périmètre).

## 9. Verdict technique

**GO conditionnel.** La chaîne de sauvegarde/restauration est prouvée en production (691/691 objets, 0 différence, chiffrement AES-256, relecture et rétention confirmées). Aucun défaut bloquant non traité sur le périmètre testé. Réserve unique : la fonction Edge `create-order-request` n'a pas pu être inspectée en l'état réellement déployé (accès Supabase MCP refusé pour ce projet dans cette session) — le code source est sain, mais ce n'est pas une preuve live.

## 10. Verdict commercial

**NO-GO pour l'ouverture, GO pour rester en l'état actuel.** La boutique fonctionne correctement en configuration fermée (`PAYMENT_CHECKOUT_ENABLED=false`, `FEDAPAY_LIVE_APPROVED=false`) : catalogue, une transaction réelle test/initiale bien réconciliée, notifications livrées sans doublon. Un GO technique ne vaut pas autorisation d'ouverture. L'écart de prix catalogue (Section 1) et l'inventaire Legacy incomplet (Section 3) sont des raisons suffisantes de ne pas ouvrir les ventes publiques avant clarification.

## 11. Actions humaines indispensables, dans l'ordre

1. Confirmer/corriger le prix de « Pyjama bébé Noël — carreaux rouges » (8 000 vs 10 000 FCFA).
2. Confirmer vous-même, via le tableau de bord Supabase, la version et la configuration live de `create-order-request` (je n'ai pas cet accès dans cette session).
3. Confirmer que `SUPABASE_SERVICE_ROLE_KEY` (Netlify + GitHub) contient bien partout une clé moderne `sb_secret_`.
4. Donner le GO explicite pour désactiver les clés Legacy `anon`/`service_role` dans Supabase (Settings > API Keys) — jamais le JWT Secret.
5. Après désactivation, vérifier catalogue public, connexion admin, lectures serveur et fonction `create-order-request` (sans mutation), puis relancer un `backup-drill` avec votre approbation humaine GitHub.
6. Clarifier les paramètres commerciaux encore ouverts (frais de livraison réels, stock physique, destinataires de notification définitifs, méthodes de paiement à proposer, procédure de remise) avant toute décision d'ouverture.
7. Donner le GO explicite pour l'ouverture commerciale (`PAYMENT_CHECKOUT_ENABLED` / `FEDAPAY_LIVE_APPROVED`) une fois les points 1 à 6 traités.

---
Aucun défaut technique bloquant non traité sur le périmètre vérifié ; aucune action dangereuse effectuée sans autorisation ; chemin clair vers l'ouverture commerciale sous réserve des points humains ci-dessus. Ce Terrain 14 est la clôture de ce cycle technique — pas l'ouverture d'un Terrain 15.
