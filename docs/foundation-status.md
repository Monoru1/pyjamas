# Fondation projet — état actuel

## Fait

- Dépôt GitHub initialisé.
- Stack Next.js + TypeScript + Tailwind posée.
- Configuration Supabase documentée.
- Seed de référence ajouté.
- Buckets connus déclarés dans `supabase/config.toml` : `product-images` et `site-assets`.
- Règles Git First ajoutées dans `CONTRIBUTING.md`.

## Règles

- Le schéma ne doit plus être modifié depuis le dashboard Supabase.
- Les migrations correctives arrivent seulement après la baseline réelle.
- Les secrets restent uniquement dans l'environnement local ou dans les variables de déploiement.

## Point bloquant volontaire

La migration baseline fidèle n'est pas écrite à la main.

Elle doit être générée avec la CLI Supabase depuis la base distante.

Raison : la base existe déjà avec tables, policies, fonctions, vues et triggers. Une baseline manuelle serait une reconstruction approximative.

## Prochaines migrations prévues après baseline

1. `0002_security_hardening`
2. `0003_media_library`
3. `0004_search_fts`
4. `0005_constraints_indexes`
5. `0006_cleanup`
