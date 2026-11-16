# Preuves complémentaires de préparation — 3 novembre 2026

## Périmètre

Complément à #12, fondé sur 9808ddd. Aucune fusion, modification de production, transaction fournisseur, notification externe ou ressource payante créée.

## Corrections et preuves

- File e-mail : contrôle du bail avant chaque tentative, y compris après un succès ambigu ; acquittement `sent` uniquement si une ligne du même bail est effectivement modifiée. Une réponse fournisseur sans identifiant non vide est refusée. Tests des pertes de bail avant envoi et à l'acquittement.
- Test intégré : vrais handlers devis/checkout/webhook/statut, schéma complet et migrations de release sur PostgreSQL embarqué ; seules les frontières identité, Supabase HTTP, FedaPay et Resend sont doublées. Vérifie dernière unité, reprise idempotente, validation montant, rejeu webhook, stock engagé une fois et deux notifications uniques. Aucun réseau externe autorisé par ce test. Ce n'est pas une recette fournisseur ni un test de concurrence multi-connexions.
- Test CI supplémentaire PostgreSQL 17 sur une base neuve locale `mdp_test` : concurrence dernière unité, même clé idempotente et rejeu webhook. Le script refuse toute URL distante ou toute base préexistante. Son résultat CI doit être vérifié après publication.
- Local : lint, TypeScript et 114 tests / 18 fichiers réussis.
- Recette Supabase `oxhymanjibveayhcaqvj` : 20 contrôles SQL non financiers réussis, zéro appel fournisseur, fixtures intégralement annulées. Autorisations staff, prix/variantes/promotions, refus des écritures anonymes, idempotence, snapshots, stock, outbox et expiration vérifiés.

## État actuel constaté (les documents historiques ne suffisent pas)

- Un utilisateur Auth confirmé et un profil administrateur existent déjà en recette : aucun compte recréé ni mot de passe réinitialisé.
- Une commande et un paiement Live pending historiques existaient avant intervention. Aucune nouvelle transaction créée ; cet enregistrement n'est ni confirmé, ni annulé, ni supprimé. Aucune autorisation Live non expirée.
- Secrets serveur de preview présents mais masqués : leur validité n'est pas attestée et ils ne sont pas réutilisables localement depuis le connecteur.
- `FEDAPAY_ENABLED`, `PAYMENT_CHECKOUT_ENABLED`, `PAYMENT_LIVE_TEST_ENABLED` remis à false uniquement pour `deploy-preview`. Les valeurs des autres contextes ont été relues et préservées. Les changements Netlify nécessitent un build pour une prise en compte garantie ; aucune activation financière autorisée.
- Protection Netlify des previews : tentatives SSO et mot de passe refusées en HTTP 422. Aucun changement de plan ni dépense. Aucun nouveau déploiement public demandé ; PR empilée pour revue et CI. Le déploiement d'une nouvelle preview privée reste à débloquer.
- Advisors sécurité recette : aucune erreur ; avertissements sur quatre RPC SECURITY DEFINER contrôlées par identité, protection contre mots de passe compromis désactivée et une table technique RLS sans politique publique (intentionnel).

## NO-GO conservé

FedaPay authentique/signature fournisseur, identité exacte du marchand, livraison externe e-mail/WhatsApp, recette navigateur staff, installation/mobile/accessibilité complète, sauvegarde/retour arrière et validation des migrations de production restent à attester. Les messages WhatsApp existants sont des liens de contact manuels, pas un transport WhatsApp Business automatique. Aucune clé Resend ni configuration e-mail de commande visible dans les variables de ce site.

La création d'une nouvelle autorisation Live, l'utilisation de l'intention historique, un remboursement financier et toute migration/déploiement production exigent une autorisation distincte. Aucun de ces actes n'a été exécuté.
