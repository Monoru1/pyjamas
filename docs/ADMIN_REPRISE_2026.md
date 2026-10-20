# Reprise Supabase & administration — La Maison des Pyjamas (20/10/2026)

## État vérifié du projet

- Projet Supabase existant (réf. : `pukvrerdloudfiphomsj`) ; PostgreSQL 17, région `eu-west-1`.
- **Restauration demandée et acceptée le 20 octobre 2026** ; statut API contrôlé après l'opération : `ACTIVE_HEALTHY`.
- Vérification SQL en lecture seule après restauration : **12 produits, 8 commandes, 12 images produits, 2 comptes Auth**.
- Profils : **1 super-admin actif avec adresse confirmée**, **1 super-admin inactif**.
- La migration `0050_security_hardening.sql` désactive l'ancien compte de démonstration et supprime le trigger auto-promouvant un e-mail codé en dur.
- Aucune migration SQL, création d'utilisateur, modification de rôle ou réinitialisation forcée de mot de passe n'a été réalisée pendant la reprise.
- Le dépôt reste sur la branche `feat/noel-2026-experience`, reliée à la PR #1 ; **ne pas fusionner dans `main` ni pousser en production sans revue**.

**Confidentialité :** les e-mails personnels des administrateurs, les mots de passe, les tokens d'invitation, les secrets API et les données nominatives des commandes **ne sont pas documentés dans ce dépôt public**.

## Comment accéder à la console

- Dashboard Supabase : https://supabase.com/dashboard/project/pukvrerdloudfiphomsj
- Projet Netlify : https://app.netlify.com/projects/pyjamas25
- Interface de connexion boutique : `/admin/login`
- Demande d'un lien de récupération : `/admin/forgot-password`
- Nouveau mot de passe : `/admin/reset-password`
- Tableau de bord protégé : `/admin`

La page d'administration utilise `supabase.auth.signInWithPassword`, puis le proxy Next.js interroge la fonction `public.is_admin()`. L'accès nécessite :
1. un compte existant dans **Authentication → Users** ;
2. un profil associé dans `public.profiles` avec `role` autorisé et `is_active = true` ;
3. des cookies de session valides.

**Récupération :**
1. Vérifier avec la propriétaire quel e-mail actif possède le rôle de gestion (ne pas ressusciter le compte de démonstration).
2. Sur `/admin/forgot-password`, l'administrateur renseigne **lui-même son adresse** pour demander un e-mail ; l'interface ne révèle pas l'existence du compte.
3. Supabase envoie le lien au titulaire de l'adresse. Le flux PKCE arrive sur `/auth/callback?next=/admin/reset-password` ; le serveur échange le code, puis redirige vers `/admin/reset-password`.
4. Le titulaire choisit un nouveau mot de passe d'au moins 12 caractères et se reconnecte.
5. Après connexion, confirmer `public.is_admin() = true` sur le parcours du navigateur. La réinitialisation du mot de passe **ne crée pas de droits admin**.

## Configuration Supabase Auth nécessaire

Dans **Authentication → URL Configuration** :
- Déclarer l'URL publique officielle (une fois le domaine acheté) comme `Site URL`.
- Ajouter explicitement les redirections autorisées de récupération, en particulier :
  - `https://pyjamas25.netlify.app/auth/callback?next=/admin/reset-password`
  - `https://deploy-preview-1--pyjamas25.netlify.app/auth/callback?next=/admin/reset-password` **uniquement pour les essais, avec un compte de test dédié**.
- Vérifier le modèle d'e-mail de récupération. La configuration par défaut doit conserver le lien de validation Supabase qui redirige vers `redirectTo`. En cas de modèle personnalisé `token_hash`, implémenter et tester un endpoint de confirmation adapté avant activation.
- Vérifier que l'envoi d'e-mails fonctionne. Le service SMTP partagé de Supabase a des quotas restrictifs ; avant exploitation commerciale, préparer un SMTP dédié.
- Configurer la politique des mots de passe / MFA selon les exigences de la boutique.
- Tester un lien valide, un lien expiré, une adresse inexistante, le renvoi et la reconnexion.
- Ne **jamais** placer `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_*` ou la clé FedaPay privée dans le navigateur ou dans un commit.

## Contrôles SQL de lecture seule

Effectuer uniquement depuis SQL Editor avec le compte administrateur du projet :

```sql
select role, is_active, count(*) as profiles
from public.profiles
group by role, is_active
order by role, is_active;

select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.products) as products,
  (select count(*) from public.orders) as orders,
  (select count(*) from public.product_images) as product_images;
```

**Ne pas** supprimer `auth.users` / `profiles`, modifier les rôles en masse, ni reconstruire la base depuis des seeds d'exemple. Avant toute évolution du schéma, inspecter les migrations appliquées par Supabase et établir une sauvegarde adaptée.

## Contrôle du code / CI

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run --passWithNoTests
npm run build
```

Le build local et le Deploy Preview utilisent les variables Netlify existantes ; aucun secret ne doit être copié dans des logs, captures publiques ou fichiers de démonstration.

## Travaux admin avant lancement de Noël

- Tester le vrai propriétaire sur l'authentification, les rôles et la déconnexion.
- Vérifier les opérations produit/collection/image/stock/commande en environnement contrôlé, avec données de test isolées.
- Intégrer les médias Noël validés dans Supabase Storage / CDN, et lier les fichiers aux produits.
- Intégrer FedaPay **en sandbox** : calcul montant côté serveur, paiement et webhook fiables, idempotence et confirmation de commande.
- Vérifier les sauvegardes, la disponibilité du projet, les droits RLS et la surveillance des échecs d'authentification.
- Après validation de la propriétaire, configurer le domaine, les redirections Auth et le CORS du checkout Supabase Edge Function.

Références : https://supabase.com/docs/guides/auth/passwords et https://supabase.com/docs/guides/auth/server-side
