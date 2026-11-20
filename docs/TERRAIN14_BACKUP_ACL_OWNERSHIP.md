# Terrain 14 — Les 36 écarts de sauvegarde (run #8) : propriétaire perdu par `--no-owner`

## Constat initial

Le run GitHub Actions #44736097374 (backup #8) a échoué : 691 objets des deux côtés, mais 36 blocs de schéma différaient par empreinte (`schema-sha256`). L'artefact `schema-comparison.json` montrait que les 36 différences portaient exclusivement sur des blocs `Type: ACL` ou `Type: DEFAULT ACL` — 30 dans le schéma `auth`, 6 `DEFAULT PRIVILEGES` pour les rôles `postgres` et `supabase_admin` dans `public`. Aucune table, fonction, contrainte, index, politique RLS ou donnée ne différait : les empreintes de données (`production.fingerprint` / `restored.fingerprint`), les comptages (`table-counts`) et les hachages de lignes (`table-hashes`) des deux côtés étaient identiques à l'octet près.

## Cause exacte, démontrée

`schema_fingerprint()` (`scripts/release/lib.sh`) compare le schéma de production et celui de la copie restaurée via **deux appels `pg_dump --schema-only` indépendants**, chacun avec `--no-owner`. La restauration elle-même (`scripts/release/backup-drill.sh`) utilisait aussi `pg_restore --no-owner`.

`pg_dump` calcule le texte ACL d'un objet comme un **écart par rapport aux droits par défaut implicites de son propriétaire actuel** (`pg_catalog.acldefault()`), même avec `--no-owner` : ce drapeau masque seulement l'affichage du propriétaire, il ne change pas le calcul. Si le propriétaire réel diffère entre les deux bases comparées, ce calcul diffère aussi.

`--no-owner` sur `pg_restore` fait que chaque objet restauré appartient au rôle de connexion (l'administrateur du serveur jetable) et non à son propriétaire réel de production (`supabase_auth_admin` pour le schéma `auth` ; les rôles nommés dans les `ALTER DEFAULT PRIVILEGES FOR ROLE postgres/supabase_admin`, propres à la plateforme Supabase, non gérés par les migrations de ce dépôt). Une fois propriétaire flottant unifié sur le rôle administrateur, sa ligne de droits se matérialise fraîchement avec la base de référence *actuelle* de PostgreSQL 17 — alors qu'en production, cette même ligne de droits pour le propriétaire réel a pu être figée avant l'existence d'un droit (par exemple `MAINTAIN`, introduit par PostgreSQL 17). `pg_dump` doit alors émettre, côté production seulement, une ligne de normalisation `REVOKE ALL ... FROM <propriétaire>` que la copie restaurée n'a plus besoin d'émettre — un bloc ACL diffère donc par octet, sans qu'aucun droit accordé à `anon`, `authenticated`, `service_role` ou tout autre rôle consommateur ne change jamais.

### Preuve reproduite

Démontré de bout en bout sur PostgreSQL 17.12 réel (`pg_dump`/`pg_restore` 17.12, pas de simulation du comportement) :

1. Une table `auth.users` appartenant à `supabase_auth_admin`, avec `MAINTAIN` explicitement révoqué du propriétaire (figeant son état comme une table d'avant PostgreSQL 17) et des droits identiques accordés à `anon`/`authenticated`/`service_role`.
2. Avant correctif (`--no-owner` des deux côtés) : le `diff` des deux dumps indépendants montre exactement et uniquement `REVOKE ALL ON TABLE auth.users FROM supabase_auth_admin;` présent côté production, absent côté copie restaurée.
3. Après correctif (propriété réelle conservée des deux côtés) : les deux dumps sont identiques à l'octet près (hors jeton `\restrict` aléatoire, déjà neutralisé par `schema-manifest.mjs`).
4. Reproduction end-to-end avec le véritable `backup-drill.sh` : avant correctif, échec reproductible (« la copie restaurée diffère de la production ») avec les mêmes objets `Type: ACL; Schema: auth` signalés ; après correctif, `0 différence(s)`.

Scénario conservé en permanence dans `scripts/release/simulate-production.sh` (table `auth.users`, droits multi-rôles, `MAINTAIN` révoqué du propriétaire) : le job CI `release-rehearsal` l'exerce désormais sur PostgreSQL 17 réel à chaque exécution.

## Correctif

Conserver la propriété réelle des objets plutôt que la masquer :

- `scripts/release/backup-drill.sh` : `pg_restore` n'utilise plus `--no-owner`. Les rôles propriétaires existent déjà sur la cible jetable (recréés par nom juste avant, comme les autres rôles) et la connexion admin est superutilisateur, donc `ALTER ... OWNER TO` / `SET SESSION AUTHORIZATION` réussissent toujours.
- `scripts/release/lib.sh` (`schema_fingerprint`) : les deux appels `pg_dump --schema-only` n'utilisent plus `--no-owner`. Les deux côtés affichent et comparent désormais le même propriétaire réel pour chaque objet.
- La désambiguïsation des blocs `DEFAULT ACL` par rôle (Terrain antérieur, PR #39) reste nécessaire et inchangée : ces entrées n'ont jamais de propriétaire propre (`Owner: -` systématiquement, avec ou sans `--no-owner`).

Aucune définition, aucun droit significatif, aucune politique RLS, aucune donnée n'est masqué ou supprimé par ce correctif : il rend la comparaison plus stricte (la propriété réelle doit désormais concorder aussi), jamais plus permissive.

## Validation

- `npm test` : 25 tests existants inchangés, plus un test ciblé (`schema-manifest.test.mjs`) qui documente et verrouille ce comportement.
- CI `release-rehearsal` (PostgreSQL 17 réel) : scénario reproduit en permanence dans `simulate-production.sh`, drill vert après correctif.
- Avant/après reproduit manuellement sur PostgreSQL 17.12 local, avec et sans le correctif, sur le script final committé (pas une approximation) : échec identique au run #8 sans le correctif, zéro écart avec.

## Hors périmètre, non modifié

Aucune clé, aucun secret, aucune donnée commerciale, aucun prix, aucun stock. `PAYMENT_CHECKOUT_ENABLED=false` et `FEDAPAY_LIVE_APPROVED=false` inchangés. Aucune désactivation de clé Legacy Supabase n'est effectuée par ce correctif : elle reste subordonnée à un nouveau backup complet réussi (voir le corps du rapport de mission).
