# Terrain 13 — Fonction Edge et séparation du secret de limitation

## Dépendance et correction

Le code déployé `create-order-request` v10 lit le JWT Legacy intégré `SUPABASE_SERVICE_ROLE_KEY` et l'utilise aussi pour pseudonymiser les numéros de téléphone du quota. L'action serveur `src/app/panier/actions.ts` exporte encore un appelant. Aucun composant actuel ne référence cette action ; le checkout commercial utilise `/api/payments/checkout`. Cela ne prouve pas l'absence d'appelants directs externes : la fonction est conservée.

La fonction corrigée lit uniquement une clé `sb_secret_` du dictionnaire intégré `SUPABASE_SECRET_KEYS`, entrée `default` (ou nom explicite `ORDER_REQUEST_API_KEY_NAME`). Elle n'a aucun repli Legacy. Son client Supabase reste strictement serveur ; `verify_jwt=false` reste inchangé. L'accès public anonyme existant conserve les validations, l'origine autorisée, le honeypot, la limite de corps, l'idempotence et le quota PostgreSQL existants. Aucun droit ou objet SQL n'est changé.

Le secret HMAC est désormais `ORDER_REQUEST_HMAC_SECRET` : 32 octets aléatoires cryptographiques, encodés en 64 caractères hexadécimaux, conservés comme secret chiffré Supabase. Aucun secret n'est enregistré dans GitHub ni dans ce document. Une rotation future de clé API ne modifie plus l'identité HMAC des contacts.

## Transition sans réinitialisation incontrôlée des quotas

Le quota existant reste à cinq tentatives par contact et 120 tentatives globales par fenêtre PostgreSQL de cinq minutes. Les lignes de quota, commandes, prix et stocks ne sont jamais réécrits par ce déploiement.

`ORDER_REQUESTS_ENABLED=false` est provisionné et la fonction refuse les requêtes métier avant tout appel à la base. Une date `ORDER_REQUEST_HMAC_READY_AT` est aussi imposée ; aucune admission n'est possible avant cette date. Garder cette admission fermée pendant la rotation. Avant toute réactivation future, attendre **au moins six minutes après le déploiement fermé**, puis positionner la date d'activation dans la nouvelle fenêtre voulue. Cette période couvre une fenêtre de quota complète et une marge d'une minute pour les requêtes en vol ; les anciennes empreintes expirent naturellement. Ne jamais supprimer les compteurs pour accélérer la transition.

Aucune réactivation n'est réalisée par Terrain 13. L'ouverture future exige la validation commerciale séparée. `PAYMENT_CHECKOUT_ENABLED=false` et `FEDAPAY_LIVE_APPROVED=false` restent inchangés.

## Validation et déploiement

- Tests du handler contre une base PGlite isolée avec le véritable SQL de quota ; données synthétiques seulement.
- Refus Legacy, clé absente/mal formée, HMAC absent/invalide, admission fermée et avant activation ; aucune requête SQL dans ces cas.
- Stabilité des empreintes HMAC lors de rotations de clé API ; limites contact/global inchangées.
- Typage du handler avec Deno et vérification de l'entrée déployable dans la CI Deno 2.5.6 ; versions Supabase conservées à 2.110.2.
- Déployer uniquement après CI et revue réussies ; inclure `index.ts`, `handler.ts`, `security.ts`, `_shared/http.ts` et `deno.json`. Les fichiers de test ne sont pas déployés.
- Vérifier GET/OPTIONS et le refus de l'admission fermée sans appel d'écriture. Ne jamais invoquer un parcours admis en production pour valider la rotation.

## Retour arrière

Conserver l'admission fermée. Si le nouveau déploiement est défaillant, corriger le bundle ou revenir à une version moderne validée. Le retour à v10 réintroduirait une dépendance Legacy et ne constitue pas un retour arrière compatible après désactivation. Ne jamais changer le JWT Secret ni rouvrir les ventes pour tester.

## Dépendances externes

Le relevé ciblé du 20 novembre a trouvé Vault vide, aucun `cron.job`, aucune file `net.http_request_queue`, aucune routine HTTP/clé JWT incorporée dans public/auth/supabase_migrations. Les configurations hors dépôt et intégrations non accessibles restent à confirmer par le propriétaire ; cette inspection ne démontre pas leur absence.
