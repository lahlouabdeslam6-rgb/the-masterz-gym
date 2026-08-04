# The Masterz Gym

Fondation technique du site public premium et de la future plateforme de gestion de The Masterz Gym, salle mixte située à Kénitra, Maroc.

## Périmètre actuel

La Phase 2 ajoute au socle : authentification JWT/OTP, utilisateurs et rôles, demandes
d'adhésion, formules, abonnements et renouvellements, paiements en réception, reçus,
présences et audit. Coaching, recovery, Healthy Cafe, finance, messagerie,
notifications, analytique et IA restent volontairement hors périmètre.

## Prérequis

- Docker Desktop avec Docker Compose
- Node.js 20+ et npm 10+ pour l'exécution hors Docker
- Python 3.12+ pour l'exécution hors Docker

## Démarrage rapide

```bash
cp .env.example .env
docker compose up --build
```

- Site : http://localhost:3000
- API : http://localhost:8000/api/v1/health
- Swagger : http://localhost:8000/docs

Les valeurs de `.env.example` sont exclusivement destinées au développement local.

## Développement hors Docker

```bash
npm install
npm run dev:web

cd apps/api
python -m venv .venv
python -m pip install -e ".[dev]"
fastapi dev app/main.py --port 8000
```

## Initialisation Phase 2

```bash
docker compose run --rm api alembic upgrade head
docker compose run --rm api python -m app.seed
npm run generate:api-client
```

Comptes strictement locaux créés par le seed :

| Rôle | Téléphone | Mot de passe de développement |
|---|---|---|
| Admin | `+212600000001` | `AdminLocal123!` |
| Réception | `+212600000002` | `ReceptionLocal123!` |
| Membre | `+212600000003` | `MemberLocal123!` |

Le fournisseur OTP local écrit le code dans les logs de développement avec le numéro
masqué. Il refuse de fonctionner lorsque `ENVIRONMENT` n'est pas `development`.

## Qualité

```bash
cd apps/api
pytest
ruff check .
ruff format --check .

cd ../..
npm run lint:web
npm run build:web
```

La documentation d'architecture et de cadrage est disponible dans [`docs/`](docs/PROJECT_SPEC.md).
Les workflows et commandes de la Phase 2 sont détaillés dans
[`docs/PHASE_2.md`](docs/PHASE_2.md).
