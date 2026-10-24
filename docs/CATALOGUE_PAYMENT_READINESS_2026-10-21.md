# Catalogue et paiements — audit de préparation du 21 octobre 2026

## État vérifié sur le projet Supabase `pukvrerdloudfiphomsj`
- 12 produits, 24 variantes, 11 collections, 12 images liées et 8 commandes préexistantes.
- Seulement 2 produits actifs : `noel-famille-velours-bordeaux` et `coffret-cadeau-premium`.
- Les 12 fiches produit référencent des URL `images.unsplash.com` : **images illustratives non acceptables pour la vente**.
- Les quantités en `product_variants.stock_quantity` et les prix ne sont **pas validés comme inventaire/prix commerciaux**.
- Les collections non actives ne doivent pas être réactivées avant concordance photos, référence, stock, prix, tailles.
- Préserver l'historique des 8 commandes.

## Paiement FedaPay
- Les routes Next.js `/api/payments/checkout`, `/api/payments/webhook`, `/api/payments/status` et `/api/payments/reconcile` existent sur `main`.
- La route checkout actuelle est **sandbox uniquement**, exige un compte staff autorisé, génère une réservation de test et ne crée pas de commande commerciale ni de décrément réel du stock.
- Le schéma sandbox `payment_attempts` / `payment_events` est actuellement présent dans Supabase ; la migration `20261020142232_sandbox_payment_acceptance.sql` figure dans l'historique distant.
- Ce schéma n'est **pas** un circuit de vente live. Ne pas élargir sa contrainte `environment='sandbox'` en production par un simple flag.
- Ne pas réutiliser de lien/token de paiement manuel pour plusieurs paniers.
- Le compte FedaPay Live montré par l'utilisateur est `Non Validé`. Aucun encaissement client Live déclaré fonctionnel.
- Ne pas ajouter de clés secrètes à GitHub ou aux fichiers publics. Les secrets doivent être configurés côté serveur Netlify.
- Pour le webhook, vérifier signature sur corps brut, correspondance `provider_id`, `amount_xof`, `currency`, références, idempotence et ordre des événements.
- L'administrateur doit afficher `paid` exclusivement après vérification côté serveur de FedaPay.

## Médias disponibles
- Google Drive : `La maison des pyjamas / Photos` et `Vidéos`, dossiers accessibles.
- Des médias de la campagne ont déjà été intégrés et optimisés dans `public/christmas-2026/` sur GitHub.
- Associer les photos correspondantes aux **vrais** articles après validation de la propriétaire ; ne pas utiliser une image de décoration comme photo d'une variante.
- Préférer des uploads Storage contrôlés, optimisés, plutôt que des liens Drive privés, et vérifier le consentement des personnes visibles.

## Critères d'acceptation avant l'ouverture au public
1. Pour chaque SKU : vrai modèle, taille, couleur, photo, prix XOF et stock attesté par la propriétaire.
2. Catalogue Supabase et site synchronisés, vérification des commandes existantes.
3. Sandbox : création unique d'une transaction par panier, tests checkout, webhook authentifié, paiement refusé/annulé/expiré, réconciliation.
4. Adaptation séparée du flux **Live**, commande commerciale, gestion stock et journal des remboursements ; tests avec habilitations appropriées.
5. Validation du compte marchand FedaPay, variables serveur, URL webhook et conditions légales.
6. Test de bout en bout depuis le catalogue public jusqu'à la confirmation dans l'admin sur un environnement prévu à cet effet ; passage Live uniquement après acceptation.

## Sécurité observée
- Supabase Advisor avertit de l'exposition de quatre fonctions SECURITY DEFINER aux comptes authentifiés. Revoir chacune avant modification, ne pas retirer les droits aveuglément.
- Protection des mots de passe compromis désactivée ; activer dans les paramètres Auth après revue.
- `event_request_limits` a RLS activé sans politique ; vérification nécessaire avant d'exposer la table.

## Prochaines actions
- Valider le fichier de correspondance photos Drive → SKU avec la propriétaire.
- Obtenir prix et stocks commerciaux vérifiés, frais de livraison, conditions de vente et approbation marchande.
- Adapter et tester checkout commercial sans fragiliser le mode sandbox ; publier en PR avec preuves de test.
