# Roadmap produit Masterz Gym

Ce document conserve les règles métier validées avec le porteur du projet. Les modules
seront livrés un par un, sur le monolithe modulaire existant. Le contrat OpenAPI reste
la source de vérité avant toute connexion frontend.

## Principes de navigation

- L'administration possède la visibilité et les permissions les plus larges.
- Les droits de la réception sont toujours inclus dans ceux de l'administration.
- Le tableau de bord affiche uniquement une synthèse et des accès rapides.
- Chaque domaine possède sa propre page : membres, demandes, abonnements, paiements,
  accès, coaching, recovery, boutique, clubs et cours, réclamations, paramètres et audit.
- Les règles commerciales restent configurables : aucun prix, horaire, délai, capacité
  ou seuil d'éligibilité n'est codé en dur.

## Ordre de livraison

### 1. Structure du back-office

- Sidebar simple et persistante.
- Une page par fonction Phase 2.
- Dashboard de synthèse.
- Séparation nette des fonctions membres, paiements et contrôle d'accès.

### 2. Clubs, abonnements et offres

- Gestion de plusieurs clubs dans la même ville.
- Abonnement musculation du club principal distinct des autres produits.
- Règle d'accès inter-clubs configurable par offre.
- Offre envisagée : un abonnement d'au moins douze mois peut inclure l'accès au second
  club ; les durées plus courtes nécessitent une offre complémentaire.
- Promotions administrables par période ou occasion, par exemple le Nouvel An.

### 3. Coaching

- Gestion des coachs et attribution des clients.
- Au moment de la réservation, le client peut choisir son coach ou demander à la
  réception d'en attribuer un.
- Chaque coach voit uniquement ses clients attribués.
- Fiche de progression du client alimentée par le coach.
- Tests suivis : impédancemétrie, neuromusculaire, mesures du corps, test RM de force et
  enquête alimentaire.
- Historique des résultats pour mesurer la progression sans écraser les anciens tests.

### 4. Recovery

- Produit séparé de l'abonnement musculation et du coaching.
- Pack regroupant sauna, bain froid et compression.
- Réservations, consommations et solde du pack gérés transactionnellement.

### 5. Boutique

- Catalogue administré par l'admin : nom, description, prix, photo, stock et statut.
- Produits envisagés : protéines, straps, ceintures et accessoires de salle.
- Réservation en ligne par le client.
- Validation de disponibilité par la réception ou l'admin, suivie d'une notification.
- Vente directe locale déclarée par la réception même si l'acheteur n'a pas de compte.
- Stock disponible, quantité réservée et stock physique traités séparément pour éviter
  la survente. La diminution physique est confirmée lors de la vente ou du retrait.
- Historique de mouvements de stock et annulations transactionnelles.

### 6. Second club et cours fitness

- Planning configurable par club, salle, coach et capacité.
- Activités prévues : GRIT, circuit training, MASTERZ Pump, MASTERZ Cardio,
  MASTERZ Fit Boxing, CrossFit, kick-boxing et karaté olympique senior.
- Réservation de cours avec contrôle de capacité et politique d'annulation configurable.

### 7. Réclamations et notifications

- Page séparée pour les réclamations avec statut, priorité, responsable et historique.
- Notifications client pour inscriptions, coaching, recovery, boutique et réclamations.
- L'admin garde une vision globale ; la réception traite uniquement les domaines
  autorisés.

## Séparation des produits client

Un même client peut posséder plusieurs relations indépendantes avec Masterz Gym :

1. abonnement musculation ;
2. inscription coaching ;
3. pack recovery ;
4. accès ou abonnement au second club ;
5. réservations de cours ;
6. commandes ou réservations boutique.

Ces produits ne doivent pas être fusionnés dans un statut unique. Le dossier membre les
rassemble visuellement, tout en conservant leurs règles et historiques séparés.
