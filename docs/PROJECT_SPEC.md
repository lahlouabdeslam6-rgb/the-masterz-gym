# Spécification du projet

## Vision

The Masterz Gym est une salle mixte premium à Kénitra. Le produit regroupera un site public en français et une plateforme interne unique pour gérer l'activité sportive, recovery et café.

## Utilisateurs

- **Admin** : configuration, supervision, finance et analyse.
- **Réceptionniste** : membres, abonnements, paiements, présence et réservations.
- **Coach** : disponibilités, réservations, programmes et mesures.
- **Membre** : profil, abonnement, réservations et suivi sportif.
- **Client Recovery** : packs et réservations recovery, avec ou sans abonnement gym.
- **Employé Café** : catalogue, stock et commandes.

## Modules cibles

1. Authentification et utilisateurs
2. Formules et abonnements
3. Paiements et reçus
4. Présences
5. Coachs et réservations coaching
6. Programmes d'entraînement et mesures corporelles
7. Packs et réservations recovery
8. Produits, stock et commandes Healthy Cafe
9. Finance et dépenses
10. Messagerie interne
11. Notifications
12. Journal d'audit
13. Analytique
14. Contenu et paramètres du site public

## Périmètre de la phase 1

La phase 1 livre uniquement le socle exécutable, les conventions et la documentation. Sont exclus : authentification, permissions métier, CRUD métier, paiements réels, OTP WhatsApp, JWT, notifications et jobs métier.

## Exigences transverses

- Interface en français et conception responsive.
- Données datées stockées avec fuseau horaire ; affichage selon le fuseau configuré de la salle.
- Prix en devise configurable (MAD par défaut dans une future configuration, jamais dans le code métier).
- Paramètres commerciaux administrables : tarifs, capacités, horaires et règles d'annulation.
- Contrat OpenAPI comme source de vérité pour les clients.
- Traçabilité future de toute opération sensible.

## Critères de réussite du socle

Le site répond sur le port 3000, l'API et Swagger sur le port 8000, le health check répond sur `/api/v1/health`, PostgreSQL et Redis sont sains, et les contrôles automatisés passent.

