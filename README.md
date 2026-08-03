# The Masterz Gym

Fondation technique du site public premium et de la future plateforme de gestion de The Masterz Gym, salle mixte située à Kénitra, Maroc.

## Périmètre actuel

Cette phase fournit uniquement le monorepo, une page d'accueil temporaire, l'API de santé, PostgreSQL, Redis, Alembic et les outils de qualité. L'authentification et les modules métier ne sont pas encore implémentés.

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

