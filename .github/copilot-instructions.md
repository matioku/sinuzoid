# Sinuzoid – Copilot Instructions

## Architecture

Sinuzoid is a self-hosted music streaming platform built as microservices:

```
Frontend (React/TS) → Nginx :8080 → FastAPI :8000   (music, files, playlists)
                                   → Symfony :9000   (authentication, JWT)
                                            ↓
                                  PostgreSQL :5432   (shared DB)
```

**Request flow:**
1. Frontend authenticates via Symfony (`/auth/*`), stores JWT in `sessionStorage` and refresh token in `localStorage`.
2. All FastAPI requests include `Authorization: Bearer <token>`.
3. FastAPI validates tokens by calling `GET http://auth:80/api/me` — it never validates JWT signatures itself.

**Docker networking:** all services share `app-network`. Internal hostnames: `db`, `auth`, `api`, `frontend`.

**Nginx routing** (`nginx.conf`): `/` → frontend, `/api` → FastAPI, `/auth` → Symfony.

## Development Commands

### Full stack (Docker – recommended)
```bash
cp .env.example .env
docker compose build && ./start.sh

docker compose up -d              # Start all services
docker compose up <service>       # Start one service: frontend / api / auth / db
docker compose logs -f <service>  # Tail logs
docker compose down               # Stop all
./scripts/show-ports.sh           # Print service URLs
```

Reset the database:
```bash
docker compose down && docker volume rm sinuzoid_postgres_data && docker compose up -d
```

### Frontend (`frontend/`)
```bash
npm install
npm run dev       # Vite dev server on :5173
npm run build     # tsc + Vite production build
npm run lint      # ESLint (TypeScript + React Hooks rules)
```

Copy `frontend/.env.example` to `frontend/.env`. Key vars: `VITE_API_URL` (default `http://localhost:8000`), `VITE_AUTH_URL` (default `http://localhost:9000`).

> **Note:** Several hardcoded `http://localhost:8000` / `http://localhost:9000` URLs still exist in service files and hooks, not yet migrated to env vars.

### FastAPI (`backend/fastapi-api/`)
```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Interactive docs: http://localhost:8000/docs
```

Set `SQL_DEBUG=true` in env to log all SQLAlchemy queries.

### Symfony Auth (`backend/symfony-auth/`)
```bash
composer install
php bin/console lexik:jwt:generate-keypair   # Required on first local run
php bin/console doctrine:migrations:migrate
symfony server:start --port=9000
```

The Dockerfile handles key generation and migrations automatically — manual steps only needed for non-Docker development.

## FastAPI Conventions

### Module layout
Each domain (`files`, `playlists`, `statistics`) has parallel sub-packages:
```
app/routes/{domain}/    # Thin HTTP layer — delegates to services
app/services/{domain}/  # Business logic
app/models/models.py    # All SQLAlchemy ORM models (single file)
app/schemas/schemas.py  # All Pydantic schemas (single file)
app/dependencies/auth.py
```
Legacy top-level files (e.g. `app/routes/files.py`) are shim imports kept for backwards compatibility.

### Route class pattern
Handlers are static methods returning async closures, grouped by resource:
```python
class PlaylistCrudRoutes:
    @staticmethod
    def create_playlist(...):
        async def endpoint(playlist_data, db, current_user): ...
        return endpoint
```

### Key rules
- Ownership is **always** re-verified in the DB — never trusted from the token alone.
- `StorageQuotaService.check_upload_allowed()` is the single gating point for uploads (1 GB/user default, computed from sum of `Track.file_size`).
- DB access uses direct `db.commit()` / `db.rollback()` — no Unit-of-Work abstraction.
- Metadata is stored as a single JSONB column (`metadata_json`) in the `Metadata` model to avoid migrations for new audio tags.

### Storage layout
```
/storage/
├── audio/{user_id}_{uuid}.{ext}
└── cover/
    ├── {basename}_cover.jpg
    ├── {basename}_thumb_small.webp   # 150×150
    ├── {basename}_thumb_medium.webp  # 300×300
    └── {basename}_thumb_large.webp   # 600×600
```

### Data model key points
- `Track` PK: UUID string. `User` PK: integer (from Symfony).
- `playlist_tracks` junction table has a `position` (INT) column for track order.
- `Statistics` composite PK: `(user_id, track_id)` — one row per user per track.
- Audio streaming uses HTTP Range requests (`206 Partial Content`) for seekable playback.

## Symfony Auth Conventions

- **Access tokens**: JWT, 1-hour lifespan, signed with RS256. User identifier claim is **email**.
- **Refresh tokens**: random 64-char hex (not JWT), 30-day expiry, max 5 per user (oldest auto-revoked).
- **Password reset tokens**: 1-hour expiry, one-time use. The `request-password-reset` endpoint always returns success (prevents email enumeration).
- Never hash passwords manually — `UserPasswordHashListener` handles it via `prePersist`/`preUpdate`.
- Password rules (enforced by `PasswordService`): min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit.
- All exceptions are formatted by `ExceptionListener` as `{ "error": { "code", "message", "status" } }`.
- `User::getRoles()` always appends `ROLE_USER`; role field values are `'user'` or `'admin'`.

## Frontend Conventions

### State management (Zustand stores in `src/store/`)
- **`musicStore`** — tracks, albums, image blob URL cache. Cache TTL: 5 min for data, 30 min for images. Persisted in `sessionStorage` (blob URLs excluded). Use `forceFetch()` to bypass cache.
- **`audioPlayerStore`** — all player state (current track, playlist, index, volume, shuffle, repeat). Shuffle excludes the current track when selecting a random index.
- **`playlistStore`** — playlists CRUD, 5 min cache. Only `playlists` + `lastFetch` persisted.

### Audio playback
`src/hooks/useAudioElement.ts` owns the `<audio>` element. On track change: extract filename via `.split('/').pop()`, fetch blob from FastAPI with Bearer token, assign `URL.createObjectURL(blob)` to `audio.src` (revoke old URL first). HTML5 audio events sync back into the store.

### Authentication
`src/contexts/AuthContext.tsx` manages tokens. Access token: `sessionStorage` (cleared on tab close). Refresh token: `localStorage`. Auto-refresh every 60 s, triggered when expiry is within 5 minutes. Auth headers are attached manually in every `src/services/` file — there is no global interceptor.

### Images
Images require Bearer tokens; they **cannot** be loaded via plain `<img src>`. Use `src/hooks/useMusicImages.ts` which fetches blobs and caches URLs in `musicStore`.

### Key type/format rules
- Backend returns duration as ISO 8601 (`PT3M45S`); use `formatDuration` in `src/utils/formatters.ts` (handles both ISO 8601 and `MM:SS`).
- File path format: `/storage/audio/{user_id}_{uuid}.ext` — always extract filename with `.split('/').pop()` before API calls.
- Dark mode: `class` strategy — toggled by adding/removing `.dark` on `<html>`.
- Fonts (Manrope, Space Grotesk) are loaded locally from `src/assets/fonts/`.

### Downloads
Single track: fetch blob from `GET /files/audio/{filename}`. Playlist/library: fetch each blob, dynamically import **JSZip**, zip into albums-as-folders. Trigger via temporary `<a download>` element (`triggerDownload()` in `src/services/trackApi.ts`).

## Environment Variables

Copy `.env.example` to `.env` at repo root. Key variables:

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` / `POSTGRES_USER` / `POSTGRES_DB` | Database credentials |
| `DATABASE_URL` | SQLAlchemy connection string |
| `VITE_API_URL` / `VITE_AUTH_URL` | Frontend API endpoints |
| `AUTH_SERVICE_URL` | FastAPI → Symfony URL (Docker: `http://auth:80`) |
| `APP_SECRET` | Symfony app secret |
| `JWT_PASSPHRASE` | Passphrase for JWT key pair |
| `STORAGE_PATH` | Audio/cover storage root (default `/storage`) |
