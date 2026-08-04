# Phase 2 — Authentification et adhésions

## Périmètre livré

- utilisateurs avec les six rôles, statut de compte et numéro de membre ;
- connexion par téléphone, access/refresh JWT, rotation, déconnexion et reset OTP ;
- activation sécurisée d'un membre existant sans divulgation des numéros connus ;
- demandes publiques et revue par la réception ;
- formules administrables et paramètres métier stockés dans PostgreSQL ;
- abonnements historisés avec grâce configurable et renouvellement ;
- paiement exclusivement enregistré en réception, reçu unique et idempotence ;
- recherche membre, contrôle d'accès manuel et exceptions documentées ;
- journal d'audit append-only pour les opérations sensibles.

Les modules coaching, recovery, Healthy Cafe, finance, messagerie, notifications,
analytique et IA ne sont pas implémentés.

## Règles structurantes

Une approbation de demande ne crée ni compte actif ni abonnement. La transaction de
paiement crée le membre en attente d'activation, l'abonnement, le paiement, le reçu,
l'événement d'historique et les audits. Un renouvellement anticipé commence le
lendemain de la fin courante ; après expiration, la réception fournit la nouvelle date.

Les paramètres `subscription_grace_days`, `subscription_expiring_soon_days` et
`attendance_duplicate_window_minutes` résident dans `system_settings`. Le seed fixe
leurs valeurs locales initiales à 4 jours, 7 jours et 30 minutes.

## Commandes

```bash
docker compose build
docker compose run --rm api alembic upgrade head
docker compose run --rm api python -m app.seed
docker compose run --rm api python -m pytest
docker compose run --rm api ruff check .
docker compose run --rm api ruff format --check .
npm run generate:api-client
npm run lint:web
npm run build:web
```

Les ports Docker restent 3000/8000 par défaut. Utiliser `MASTERZ_WEB_PORT=13000` et
`MASTERZ_API_PORT=18000` pour une vérification temporaire si les ports normaux sont pris.

## OTP local et sécurité

Le code OTP en clair n'est jamais stocké : seul son hash et son expiration sont
persistés. Le fournisseur local affiche le code dans les logs avec un téléphone masqué
et ne doit jamais être utilisé hors développement. Les clés JWT de `.env.example` et
les mots de passe seed sont uniquement des valeurs locales à remplacer dans tout autre
environnement.

L'interface `AttendanceIdentityProvider` prépare une future intégration d'appareil sans
stocker d'empreinte, de gabarit biométrique ou de donnée biométrique.
