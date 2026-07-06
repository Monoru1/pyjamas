# ADR 0001 — Stack technique

## Statut

Accepté.

## Contexte

La Maison des Pyjamas doit devenir un site officiel et un back-office utilisable par une boutique physique avant Noël. Le projet doit dépasser les anciens projets internes par sa qualité, sa maintenabilité et son efficacité business.

## Décision

- Next.js App Router
- TypeScript strict
- Tailwind CSS v4
- shadcn/ui
- Supabase / PostgreSQL
- Supabase Auth
- Supabase Storage
- React Hook Form + Zod
- TanStack Query pour les données serveur
- Zustand uniquement pour le panier
- Repository Pattern pour isoler Supabase de l'UI

## Raisons

Le choix privilégie la stabilité, le SEO social, les aperçus WhatsApp/Open Graph, l'optimisation d'images, la vitesse mobile et la maintenabilité.

## Conséquences

- Pas de Vite SPA.
- Pas de framework expérimental.
- Pas de changement de stack sans ADR.
- Les composants React ne doivent pas appeler Supabase directement.
