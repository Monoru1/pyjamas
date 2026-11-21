# Terrain 16 — Clôture de la sécurité (branche `security/strix-hardening`)

Base : `main` @ `5493d8d`. Contient les 3 commits du Terrain 15 (SEC-001 à SEC-004, contenu
identique au patch livré) et les corrections Terrain 16. **Rien n'est appliqué en production.**

## Migrations (ordre)

| Fichier | Effet | Réversible |
|---|---|---|
| `20261121170000_checkout_client_limits.sql` | SEC-001 : budget par connexion, plafond de 20 unités impayées contrôlé dans la transaction de réservation | oui (doc Terrain 15) |
| `20261121180000_unpaid_reservation_30_minutes.sql` | SEC-001 : réservation impayée 30 min (nouvelles commandes) | oui |
| `20261121180100_two_admin_accounts_mfa.sql` | SEC-005/011 : **exactement deux administrateurs** (`sakryad@gmail.com`, `lamaisondespyjamas@gmail.com`) liés à leur identifiant Supabase Auth, droits identiques ; `employee`, `super_admin` ou tout autre profil ne donnent plus rien ; profils hors de ces deux identités désactivés (jamais supprimés, journalisés) ; interrupteur AAL2 ; journal clients/profils/collections/images. Refuse de s'exécuter si aucun des deux comptes n'existe. | oui |
| `20261121180200_retire_unpaid_order_requests.sql` | SEC-006 : plus aucun rôle ne peut appeler `create_order_request_atomic` | oui |
| `20261121180300_storage_no_public_listing.sql` | SEC-010 : buckets non listables, URL publiques inchangées | oui |
| `20261121180400_admin_session_30_days.sql` | Session admin : session encore présente dans `auth.sessions` (révocation immédiate côté données), authentification principale de moins de 30 jours (claim `amr`), AAL2 si l'interrupteur est actif | oui |

Retour arrière base : `supabase/production/rollback-terrain16.sql` (après redéploiement de l'ancien code).

## Déploiement — ordre impératif, autorisation du propriétaire requise à partir de l'étape 6

1. Sauvegarde restaurable prouvée (`production-release` → `backup-drill`).
2. Répéter les six migrations sur PostgreSQL isolé avec les deux états possibles de la responsable et vérifier le retour arrière.
3. Vérifier le checkout existant avec le nouveau schéma et les scénarios FedaPay simulés.
4. Production : `terrain16-preflight.sql` (lecture seule). La requête 2 exige le propriétaire confirmé et actif et une identité Auth réservée pour la responsable. L'invitation en attente est suffisante pour la bascule. La requête 2b liste les profils qui seront désactivés.
5. Vérifier que la branche passe la CI.
6. **Autorisation explicite du propriétaire.**
7. Générer la transaction depuis la tête revue de la PR avec `node scripts/build-terrain16-migration.mjs`. L'appliquer sur le projet de production identifié et relire les 6 entrées d'historique et `terrain16-postflight.sql`. Toute anomalie détectée avant le commit annule la transaction.
8. Fusionner la PR commerciale puis la PR de sécurité. Contrôler le commit publié sur Netlify après les migrations.
9. Vérifier le panier, les pages de paiement et de suivi, la réconciliation et le back-office avec le propriétaire. La responsable pourra tester son accès après confirmation de son invitation.

En cas d'échec à l'étape 7, suspendre la publication et vérifier ce qui a été validé en base.
Un échec dans une transaction annulée ne demande pas de rollback SQL. Après validation de la
transaction, comparer l'impact du rollback ciblé et celui d'une restauration. Le rollback laisse
les profils désactivés et les écritures commerciales en place.

## Netlify (aucune modification faite)

| Variable | Quand | Valeur |
|---|---|---|
| `PAYMENT_QUOTE_SECRET` | facultatif, après déploiement | secret aléatoire ≥ 32 caractères, dédié |
| `CHECKOUT_FINGERPRINT_SECRET` | facultatif, après déploiement | secret aléatoire ≥ 32 caractères, dédié |
| `PAYMENT_MAX_OPEN_UNITS_PER_CLIENT` | facultatif | défaut 20 |
| `ADMIN_MFA_REQUIRED` | **seulement après l'enrôlement des deux titulaires** | `true`, puis redéployer (valeur lue au build) |

Sans ces variables, le code reprend les secrets actuels : aucune rotation n'est imposée.

## MFA — actions humaines

1. Après déploiement, chaque titulaire se connecte et ouvre `/admin/mfa` → « Configurer l'application », scanne le QR code, valide le code à 6 chiffres.
2. Dès qu'un facteur est vérifié, ce compte doit saisir un code à chaque connexion.
3. Chacun ajoute un **appareil de secours** depuis `/admin/mfa` (récupération : Supabase TOTP ne fournit pas de codes de secours).
4. Quand les deux comptes ont au moins 1 facteur vérifié (préflight, colonne `verified_factors`) : `ADMIN_MFA_REQUIRED=true` sur Netlify + redéploiement, puis en SQL :
   `update private.security_flags set enabled = true where key = 'admin_mfa_required';`
5. Appareil perdu : l'autre administrateur supprime le facteur dans Supabase → Authentication → Users ; ne jamais désactiver l'interrupteur pour dépanner.

## Fonction Edge `create-order-request`

Le code est retiré du dépôt et la base refuse désormais l'appel (migration 180200). Après autorisation :
`supabase functions delete create-order-request --project-ref pukvrerdloudfiphomsj` (et recette).

## Décision du 21 novembre 2026 — accès administrateurs

- Deux comptes, droits complets identiques : `sakryad@gmail.com` (propriétaire technique), `lamaisondespyjamas@gmail.com` (responsable).
- La migration réserve les deux identifiants Auth existants, y compris l'invitation en attente. Seules les identités réservées et confirmées sont liées côté serveur. Une autre identité utilisant la même adresse ne peut acquérir ces droits.
- Après acceptation de l'invitation et confirmation de l'adresse existante, l'opérateur de la base exécute `select * from private.bind_authorized_admins();` et contrôle les deux liaisons. La procédure est idempotente et journalise la nouvelle attribution.
- Aucun écran, aucune route ni aucune fonction ne crée de compte : un nouveau compte ou une inscription publique n'obtient aucun droit.
- Pour retirer durablement un administrateur, supprimer sa liaison et vider l'identifiant réservé dans la même transaction. Le journal historique est conservé.
- Accès complet à la boutique ne donne accès à aucun secret : clés API et service restent côté serveur.

## Session administrateur persistante (30 jours)

Comportement : mot de passe + code MFA à la première connexion ; ensuite le navigateur garde la
session Supabase (cookies `sb-…`, 30 jours au lieu de 400) et Supabase renouvelle seul le jeton
d'accès d'une heure (rotation des refresh tokens). 30 jours après la saisie du mot de passe
(claim `amr`), le proxy termine la session et la base refuse le jeton : nouvelle connexion + MFA.
Un renouvellement de jeton ou une nouvelle saisie de code ne prolonge pas les 30 jours.

Révocation : « Se déconnecter » (cet ordinateur, `local`), « Déconnecter les autres appareils »
(`others`) et « Déconnecter tous les appareils » (`global`) dans *Sécurité du compte*. Supabase
supprime les sessions ; la base refuse alors aussitôt leurs jetons (`auth.sessions`). Un jeton
d'accès déjà émis reste techniquement valide jusqu'à son expiration (1 h par défaut) pour les
API qui ne consultent pas la base ; aucune donnée de la boutique n'est lisible avec lui.

Paramètres Supabase (Authentication → Sessions / Auth settings) :

| Paramètre | Valeur | Remarque |
|---|---|---|
| JWT expiry | 3600 s (défaut) | ne pas augmenter |
| Refresh token rotation | activée, reuse interval 10 s (défauts) | ne pas désactiver |
| Time-box user sessions | 30 jours (720 h) | **offre Pro uniquement** ; sur l'offre gratuite, la limite reste appliquée par l'application et la base |
| Inactivity timeout | vide, ou 7 jours si souhaité | Pro uniquement ; 7 jours déconnecterait après une semaine d'absence |
| MFA TOTP | activé (enrôlement + vérification) | requis pour `/admin/mfa` |

Ordinateur de la boutique (la session persistante repose sur son verrouillage) : verrouillage
automatique Windows après 5 min ; mot de passe ou Windows Hello ; BitLocker/Chiffrement de
l'appareil ; mises à jour automatiques Windows et navigateur ; un seul compte Windows, pas de
session partagée ; Bureau à distance désactivé et aucun logiciel de prise en main installé ; mots
de passe dans le gestionnaire du navigateur ou un coffre, jamais dans un fichier ou un post-it.
