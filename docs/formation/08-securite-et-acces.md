# 08 — Sécurité et droits d'accès

## Les niveaux d'accès réellement en place
L'application connaît trois rôles : `super_admin`, `admin` et `employee`.

| Capacité | employee | admin / super_admin |
|---|---|---|
| Commandes : consulter, faire avancer un statut autorisé | Oui | Oui |
| Paiements et notifications : consulter, relancer | Oui | Oui |
| Produits, prix, tailles, photos, promotions, collection | Oui | Oui |
| Réceptions et corrections de stock | Oui | Oui |
| Enregistrer **Personnaliser le site** | Non | Oui |
| Enregistrer les informations de **La fête de Noël** | Non | Oui |
| Déclarer une commande payée | Personne | Personne |

## Vendeur et gestionnaire de stock
L'application **ne sépare pas techniquement** un profil « vendeur » d'un profil « gestionnaire de stock » : tout compte `employee` accède aux commandes comme aux stocks. La répartition ci-dessous est donc une **règle d'organisation**, contrôlable après coup grâce aux journaux (chaque changement de statut, réception, correction et relance est enregistré avec son auteur).

| Profil de la boutique | Rôle technique | Utilise | N'utilise pas |
|---|---|---|---|
| Administrateur | `admin` | Tout | — |
| Vendeur | `employee` | Commandes, Paiements & envois | Prix, réceptions, corrections de stock |
| Gestionnaire de stock | `employee` | Produits & stocks, Photos & vidéos | Statuts de commande, relances |

Une séparation technique stricte de ces deux profils demande une évolution de l'application. Elle n'est pas livrée dans la V1.

## Comptes
- Un compte par personne. Jamais de compte partagé : les journaux perdraient leur sens.
- Création, changement de rôle et désactivation sont faits par le responsable technique, à la demande de l'administrateur.
- Départ d'un employé : demander la désactivation du compte le jour même.

## Mots de passe et appareils
- Mot de passe long, unique, jamais communiqué, même à un collègue ou à un « technicien ».
- Se déconnecter sur tout appareil partagé. Ne pas enregistrer le mot de passe sur un téléphone prêté.
- Ne jamais ouvrir l'administration depuis un lien reçu par message : taper l'adresse ou utiliser le favori.

## Données des clients
Noms, téléphones, adresses et e-mails ne servent qu'à traiter la commande. Pas de capture d'écran envoyée dans une messagerie personnelle, pas de copie dans un carnet ou un fichier.

## Incident : qui prévenir, tout de suite
| Situation | Action |
|---|---|
| Mot de passe peut-être connu d'un tiers | Le changer via **Mot de passe oublié ?**, prévenir l'administrateur |
| Téléphone ou ordinateur perdu | Prévenir l'administrateur : le compte est désactivé |
| Mouvement de stock ou statut que personne ne reconnaît | Ne rien corriger, prévenir l'administrateur |
| Demande de clé, de code ou d'accès par message ou téléphone | Refuser, prévenir l'administrateur |
