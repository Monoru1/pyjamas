# Discipline base de données — Git First

1. Le dashboard Supabase est en lecture seule pour le schéma. Aucune modification de table, policy, fonction ou vue via l'interface.
2. Toute évolution de schéma passe par une migration versionnée :
   - `npx supabase migration new <nom>`
   - écrire le SQL dans le fichier généré
   - tester sur base locale neuve avec `npx supabase db reset`
   - régénérer les types avec `npm run types:db`
   - committer migration + types ensemble
3. Aucune migration ne part en production sans relecture.
4. `main` représente la source de vérité.
5. Les connecteurs et le dashboard ne servent pas à modifier le schéma hors de ce flux.

## Definition of Done technique

- TypeScript strict sans `any` volontaire.
- Aucun appel Supabase direct dans les composants UI.
- La logique métier vit dans `src/features/*` ou `src/lib/repositories/*`.
- Toute logique qui touche au prix, au stock ou au message WhatsApp doit être testée.
- Toute évolution SQL doit être idempotente quand c'est possible.
