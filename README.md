# La Maison des Pyjamas

Site officiel et back-office de La Maison des Pyjamas.

## Statut

Fondation projet initialisée : Next.js, TypeScript, Supabase, règles Git First et structure de base.

## Stack cible

- Next.js App Router
- TypeScript strict
- Tailwind CSS v4
- shadcn/ui
- Supabase / PostgreSQL
- Supabase Auth
- Supabase Storage
- Zustand pour le panier
- TanStack Query
- React Hook Form + Zod

## Workflow base de données

Le dépôt GitHub devient la source de vérité.

La base Supabase existe déjà. La baseline fidèle doit être récupérée depuis la base distante avec la CLI Supabase, puis toutes les évolutions doivent passer par des migrations versionnées.

Voir `CONTRIBUTING.md` et `docs/foundation-status.md`.

## Variables d'environnement

Copier `.env.example` vers `.env.local`, puis compléter :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `SUPABASE_PROJECT_REF`
