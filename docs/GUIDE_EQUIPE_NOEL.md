# Utiliser la boutique de Noël

Ce guide décrit les écrans livrés dans la prévisualisation. Les essais avec un vrai compte employé doivent encore être validés avant déploiement commercial.

## Connexion

Ouvrir `/admin`, se connecter avec son propre compte et ne jamais partager le mot de passe. En cas de session expirée, se reconnecter avant de recommencer l’opération. Un compte connecté sans profil actif n’a pas accès au studio. La récupération du mot de passe doit être vérifiée avec le service e-mail avant remise des accès à l’équipe.

## Préparer un produit réel

1. Ouvrir **Produits & stocks**, puis créer une fiche en brouillon.
2. Renseigner le vrai nom, la description, la catégorie et les collections. Ne pas utiliser les anciennes fiches de démonstration comme catalogue commercial.
3. Créer les variantes de taille et de couleur, vérifier le prix en FCFA et saisir les quantités réellement disponibles.
4. Téléverser les photographies correspondant précisément au modèle ; sélectionner l’image principale.
5. Contrôler les informations puis activer la fiche. Les anciennes photographies de stock Unsplash ne sont pas affichées dans le nouveau catalogue public.
6. Ouvrir la fiche publique depuis un téléphone et vérifier la sélection des variantes.

Archiver une variante ou une collection la masque ; cette version conserve les liens et les références historiques. Ne pas tenter de supprimer des commandes ou des données client pour « nettoyer » le catalogue.

## Changer les images ou le film de l’accueil

1. Dans **Photos & vidéos**, choisir un fichier, contrôler l’aperçu et renseigner son titre et son texte alternatif.
2. Ajouter le média ; attendre le message de confirmation. En cas d’erreur, vérifier d’abord si le fichier est déjà apparu avant de recommencer.
3. Dans **Personnaliser le site**, sélectionner l’image principale, les deux petites cartes et/ou le film. La carte inférieure doit montrer un autre modèle de pyjama.
4. Enregistrer puis ouvrir la boutique. Ne pas utiliser un lien de partage privé Drive.

Formats : JPG/PNG/WebP jusqu’à 5 Mo ; MP4/WebM jusqu’à 50 Mo. Le film complet fourni dure 74,8 secondes et ne démarre qu’après un clic. Masquer un média dans la bibliothèque ne rend pas son URL publique confidentielle et ne doit pas effacer un fichier déjà utilisé par une page.

Les paramètres de publication sont réservés à la propriétaire ou à un responsable. Les autorisations de diffusion des personnes photographiées doivent être validées avant leur utilisation.

## Traiter une demande de commande

Une demande WhatsApp n’est pas un paiement. Vérifier le client, les variantes, les quantités et les modalités de livraison avant prise en charge. La confirmation de la commande utilise une fonction SQL qui contrôle le stock ; si un autre employé l’a déjà traitée, actualiser l’écran et relire le statut avant de continuer.

Suivre ensuite les étapes préparation, prête et livraison. En cas d’annulation d’une commande déjà prise en charge, utiliser le statut d’annulation : ne pas modifier le stock manuellement pour contourner le workflow.

Le flux historique de création de demande WhatsApp doit encore faire l’objet d’une validation atomique et d’un test de doubles clics/requêtes réseau ; ne pas le présenter comme certifié pour le paiement en ligne.

## Fête de Noël

Le formulaire reste fermé pendant la validation juridique et technique. Une demande de places exprime un intérêt ; même le statut « confirmé par l’équipe » ne constitue pas une preuve de paiement ni un billet.

La propriétaire renseigne les véritables date, horaire, lieu, prix et capacité dans **La fête de Noël**. Le personnel peut consulter les demandes et mettre à jour leur suivi. Ne pas annoncer de billets payants tant qu’une billetterie distincte n’a pas été développée et validée.

La réouverture nécessite à la fois les protections DB, les variables techniques, la validation de confidentialité et le paramètre d’ouverture. Un simple clic dans l’administration ne suffit pas tant que l’activation technique est absente.

## Tests de paiement

Les tests FedaPay sont réservés à l’équipe et au mode sandbox. Utiliser exclusivement les identités et moyens de test prévus par FedaPay. Les montants affichés dans **Paiements de test** ne sont pas du chiffre d’affaires encaissé. Ils ne déclenchent aucune préparation de marchandise.

Un paiement doit être confirmé par le serveur après lecture de la transaction fournisseur. Une page de retour, une capture de téléphone ou une notification WhatsApp ne suffit pas. En cas de doute ou de statut bloqué, demander une réconciliation à la personne responsable ; ne jamais marquer manuellement une vente comme payée pour contourner l’attente.

## En cas de problème

Noter la page, l’heure et la référence de commande ou de paiement de test. Ne jamais envoyer un mot de passe ou une clé API dans une capture. Vérifier l’état de l’opération avant de la recommencer. Si le service est indisponible, garder les demandes et les journaux, fermer les nouvelles demandes si nécessaire et prévenir la personne responsable du site.
