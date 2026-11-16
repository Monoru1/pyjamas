# 02 — Guide de l'administrateur

## Ce que l'administrateur fait en plus
- Enregistrer les réglages de **Personnaliser le site** et les informations de **La fête de Noël**.
- Décider des corrections d'inventaire importantes et des annulations de commande.
- Traiter les anomalies de paiement signalées par l'équipe (guide 06).
- Demander la création, la modification ou la désactivation d'un compte (guide 08). Il n'existe pas d'écran de gestion des comptes dans l'administration : ces opérations sont faites par le responsable technique dans Supabase.

## Routine conseillée
**Chaque matin**
1. **Commandes** : filtrer **Paiement** sur « Paiement confirmé » et **Préparation** sur « En attente ». Ce sont les commandes à prendre en charge.
2. **Paiements & envois** : vérifier qu'aucune notification n'est en échec.
3. **Produits & stocks** : repérer les tailles à zéro.

**Chaque semaine**
1. Comparer un échantillon de tailles entre le rayon et la colonne **Disponible**. Corriger par **Corriger une quantité** avec un motif précis.
2. Relire **Derniers mouvements du personnel**.
3. Vérifier la liste des comptes actifs avec le responsable technique.

## Valeurs provisoires du 16 novembre 2026
Le stock (30 unités par taille commercialisée) et le prix (30 000 FCFA par lot) ont été décidés à titre provisoire. Tant que la boutique ne les a pas confirmés :
- la vente publique en ligne reste fermée ;
- chaque valeur se corrige depuis **Produits & stocks** : **Enregistrer le prix** pour le prix, **Corriger une quantité** pour le stock, avec le motif « inventaire du JJ/MM ».

Les mouvements provisoires sont reconnaissables dans l'historique à leur motif « PROVISOIRE V1 ».

## Ouverture et fermeture de la vente en ligne
Les interrupteurs de paiement et de notifications ne sont pas dans l'administration : ce sont des réglages techniques de l'hébergement. Pour fermer la vente en urgence, appeler le responsable technique. Voir `docs/MISE_EN_PRODUCTION_V1.md`.
