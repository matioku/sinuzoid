# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sinuzoid is a self-hosted music management and streaming platform built as a microservices architecture. It consists of three backend services, a React frontend, and an Nginx reverse proxy, all orchestrated via Docker Compose.

## Quick Start

```bash
cp .env.example .env
docker compose build && ./start.sh
```

Service URLs after startup:
- Frontend: http://localhost:3000
- Nginx gateway: http://localhost:8080
- FastAPI (music API): http://localhost:8000 — interactive docs at `/docs`
- Symfony (auth): http://localhost:9000
- PgAdmin: http://localhost:8081

## Architecture

```
Frontend (React) → Nginx (8080) → FastAPI (8000) — music/files/playlists
                                → Symfony (9000) — authentication/JWT
                                         ↓
                               PostgreSQL (5432)
```

**Request flow:**
1. Frontend authenticates via Symfony (`/auth/*` routes), receives a JWT stored in localStorage.
2. All FastAPI requests include `Authorization: Bearer <token>`.
3. FastAPI validates the JWT by calling the Symfony auth service internally (`http://auth:80`).

**Nginx routing** (`nginx.conf`): `/` → frontend, `/api` → FastAPI, `/auth` → Symfony.

**Docker network**: all services share `app-network`. Internal service names: `db`, `auth`, `api`, `frontend`.

## Development Commands

### Docker (recommended)

```bash
docker compose up -d              # Start all services
docker compose up <service>       # Start specific service (frontend/api/auth/db)
docker compose logs -f <service>  # Tail logs
docker compose down               # Stop all
./scripts/show-ports.sh           # Print service URLs
```

Reset the database:
```bash
docker compose down
docker volume rm sinuzoid_postgres_data
docker compose up -d
```

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # Vite dev server on port 5173
npm run build     # TypeScript check + production build
npm run lint      # ESLint
```

Frontend environment variables: `VITE_API_URL`, `VITE_AUTH_URL` (see `frontend/.env.example`).

### FastAPI (`backend/fastapi-api/`)

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Symfony Auth (`backend/symfony-auth/`)

```bash
composer install
php bin/console lexik:jwt:generate-keypair   # Generate JWT keys (required on first run)
php bin/console doctrine:migrations:migrate
symfony server:start --port=9000
```

## Service Details

### FastAPI (`backend/fastapi-api/`)

- `main.py` — app entry point, CORS config, router registration
- `app/routes/` — endpoints: `files`, `playlists`, `statistics`, `search`
- `app/services/` — business logic: auth validation, storage, statistics
- `app/models/` — SQLAlchemy ORM models
- `app/schemas/` — Pydantic request/response schemas
- `app/dependencies/` — FastAPI auth middleware (JWT validation against Symfony)
- `app/database.py` — SQLAlchemy engine/session setup

Audio files stored at `/storage/audio`, cover art at `/storage/cover`.

### Symfony Auth (`backend/symfony-auth/`)

- `src/Controller/` — `AuthController`, `UserController`, `AdminController`
- `src/Entity/` — Doctrine entities (`User`, `UserProfile`)
- `src/Service/` — `UserService`, `AuthenticationService`
- `config/` — JWT config (LexikJWT), CORS (NelmioCors), API Platform
- `migrations/` — Doctrine database migrations

### Frontend (`frontend/src/`)

- `pages/` — route-level components
- `components/` — reusable UI components
- `store/` — Zustand stores (auth, player, library, UI state)
- `services/` — API call functions (wraps fetch with auth headers)
- `contexts/` — React contexts for shared data
- `hooks/` — custom React hooks
- `types/` — TypeScript type definitions

Key libraries: React 19, React Router 7, Tailwind CSS 4, Zustand 5, JSZip.

## Environment Configuration

Copy `.env.example` to `.env` at the repo root. Key variables:

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` / `POSTGRES_USER` / `POSTGRES_DB` | Database credentials |
| `DATABASE_URL` | SQLAlchemy connection string |
| `VITE_API_URL` / `VITE_AUTH_URL` | Frontend API endpoints |
| `AUTH_SERVICE_URL` | FastAPI → Symfony internal URL (`http://auth:80`) |
| `APP_SECRET` | Symfony app secret |
| `JWT_PASSPHRASE` | Passphrase for JWT key pair |
| `STORAGE_PATH` | Path for audio/cover storage (`/storage`) |

The Symfony Dockerfile auto-generates JWT keys and runs migrations on startup.

## Database

PostgreSQL 15. Schema initialized from `sinuzoid_database.sql`.

Connect from host: `localhost:5432`, database `sinuzoid_db`, user `postgres`.
Connect from containers: host `db`, same port/credentials.

Manual DB access:
```bash
docker compose exec db psql -U postgres -d sinuzoid_db
```
