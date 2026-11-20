# Terrain 14 — Les écarts de sauvegarde : propriétaire perdu par `--no-owner`, puis ordre des lignes DEFAULT ACL

> **Mise à jour (run production #44744772530)** : le correctif de la Partie 1 a bien éliminé les 30 écarts `auth.*`, mais **pas** les 6 `DEFAULT PRIVILEGES` de `public` — une cause distincte, documentée en Partie 2. La phrase de la Partie 1 affirmant que les blocs `DEFAULT ACL` n'ont « jamais de propriétaire propre, avec ou sans `--no-owner` » était inexacte : sans `--no-owner`, `pg_dump` affiche bien le véritable rôle grantor comme `Owner:`. Conservée ci-dessous telle qu'écrite à l'époque, par souci d'historique ; voir la Partie 2 pour le correctif exact.

## Partie 1 — Constat initial

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

## Hors périmètre, non modifié (Partie 1)

Aucune clé, aucun secret, aucune donnée commerciale, aucun prix, aucun stock. `PAYMENT_CHECKOUT_ENABLED=false` et `FEDAPAY_LIVE_APPROVED=false` inchangés. Aucune désactivation de clé Legacy Supabase n'est effectuée par ce correctif : elle reste subordonnée à un nouveau backup complet réussi (voir le corps du rapport de mission).

## Partie 2 — Les 6 écarts restants (run production #44744772530) : ordre des lignes `DEFAULT ACL`, pas leur contenu

### Constat

Le premier backup-drill réel déclenché depuis `main` après la Partie 1 (run [#44744772530](https://github.com/Monoru1/pyjamas/actions/runs/44744772530)) a échoué : 691 objets des deux côtés, mais 6 différences — exactement les 6 `DEFAULT PRIVILEGES` du schéma `public` déjà repérées dans le constat initial (`FUNCTIONS`/`SEQUENCES`/`TABLES` × rôles `postgres`/`supabase_admin`). Les 30 écarts `auth.*` de la Partie 1 ont bien disparu ; seuls ces 6 ont survécu au premier correctif, preuve que leur cause est différente de l'écart de propriétaire d'objet.

### Cause exacte, démontrée

Sans `--no-owner`, l'en-tête d'un bloc `DEFAULT ACL` affiche réellement le rôle grantor (`Owner: postgres`, `Owner: supabase_admin` — vérifié directement avec un `pg_dump` 17.12 réel, voir ci-dessous). Chaque bloc peut contenir **plusieurs lignes** `ALTER DEFAULT PRIVILEGES ... GRANT/REVOKE ...`, une par bénéficiaire distinct, dans l'ordre où `pg_dump` parcourt le tableau `aclitem[]` stocké — un ordre déterminé par l'**OID du rôle bénéficiaire**.

Une restauration logique ne préserve jamais les OID des rôles : `backup-drill.sh` recrée chaque rôle par son nom (`create role "$role"` pour chaque ligne de `select rolname from pg_roles ...`, sans `ORDER BY`), et PostgreSQL attribue les OID de façon strictement séquentielle à la création. Si l'ordre relatif de (re)création des rôles bénéficiaires sur la cible jetable ne reproduit pas exactement celui de production — plausible sur un catalogue de production qui a des années d'historique (`ALTER ROLE`, VACUUM, réorganisations physiques de `pg_roles`) — alors **les mêmes droits, accordés aux mêmes rôles**, s'impriment dans un ordre de lignes différent, sans qu'aucun droit n'ait changé.

### Preuve reproduite

Démontré sur PostgreSQL 17.12 réel, sans approximation :

1. `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO dap3_anon, dap3_auth;` sur une base « production », avec `dap3_anon` (OID inférieur) créé avant `dap3_auth`. `pg_dump --schema-only` imprime alors la ligne pour `dap3_anon` avant celle pour `dap3_auth`.
2. Dump complet (`pg_dump --format=custom`), puis recréation des deux mêmes rôles dans l'**ordre inverse** (`dap3_auth` d'abord, obtenant cette fois l'OID inférieur) avant `pg_restore` sur une base « restaurée » neuve.
3. Re-dump de la base restaurée : les deux lignes `ALTER DEFAULT PRIVILEGES` sont **permutées** par rapport à la production — seul le `diff` texte change, aucune donnée ni aucun droit.
4. Avec le correctif de `schema-manifest.mjs` (tri canonique des lignes d'un même bloc `DEFAULT ACL` avant hachage) : `schemaDifferences()` ne signale plus aucun écart entre les deux dumps. Un test direct confirme aussi qu'un bénéficiaire réellement manquant, ou un droit réellement élargi, reste détecté (voir `schema-manifest.test.mjs`).

### Correctif

`scripts/release/schema-manifest.mjs` : au sein d'un même bloc `DEFAULT ACL` uniquement (jamais pour un bloc `ACL` ordinaire — l'ordre y reste significatif, inchangé), les lignes individuelles `ALTER DEFAULT PRIVILEGES ...` sont triées avant le hachage. Un ajout, une suppression ou une modification de droit change toujours l'ensemble des lignes triées et reste donc détecté ; seul l'ordre, qui ne reflète qu'un artefact d'OID de restauration, cesse d'être significatif.

`scripts/release/simulate-production.sh` : les `ALTER DEFAULT PRIVILEGES` de démonstration accordent désormais à **plusieurs** rôles (`anon, authenticated, service_role`) en une seule instruction au lieu d'un seul, pour que le job CI `release-rehearsal` exerce au moins la forme multi-bénéficiaire de ces blocs (la non-déterminisme exact observé en production tient à l'historique physique du catalogue `pg_roles`, difficile à forcer de façon fiable sur un cluster jetable tout neuf ; la preuve ci-dessus, avec un ordre de création inversé imposé explicitement, est la démonstration directe et contrôlée du mécanisme).

### Validation

- `schema-manifest.test.mjs` : nouveau test dédié — permutation de lignes `DEFAULT ACL` sans changement de contenu → 0 écart ; bénéficiaire manquant → 1 écart ; droit élargi → 1 écart. Suite complète toujours verte.
- Reproduction directe sur PostgreSQL 17.12 (ordre de création de rôles inversé explicitement) : écart avant correctif, 0 écart après, sur le même module `schema-manifest.mjs`.
- `backup-drill.sh` + `simulate-production.sh` (scénario multi-bénéficiaire) exécutés localement de bout en bout sur PostgreSQL 17 réel : `0 différence(s)`, `RÉUSSI`.

### Hors périmètre, non modifié (Partie 2)

Aucune clé, aucun secret, aucune donnée commerciale, aucun prix, aucun stock. Aucun contrôle d'intégrité n'est affaibli : la comparaison reste sensible à tout changement réel de droit, de bénéficiaire ou de propriétaire ; seul un artefact d'ordre d'impression sans aucune signification sémantique cesse d'être signalé. Aucune désactivation de clé Legacy Supabase n'est effectuée par ce correctif.
