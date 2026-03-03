# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs available at `http://localhost:8000/docs`.

Environment variables (see root `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@db:5432/sinuzoid` | SQLAlchemy connection |
| `AUTH_SERVICE_URL` | `http://auth:80` | Symfony auth service (Docker-internal) |
| `STORAGE_PATH` | `/storage` | Base path for audio + cover files |
| `SQL_DEBUG` | `false` | Set `true` to log all SQLAlchemy queries |

## Architecture

### Module Layout

Routes, services, and models follow a parallel sub-package structure. Each domain (files, playlists, statistics) has:

```
app/routes/{domain}/       # HTTP layer — thin, delegates to services
app/services/{domain}/     # Business logic
app/models/models.py       # All SQLAlchemy ORM models (single file)
app/schemas/schemas.py     # All Pydantic schemas (single file)
app/dependencies/auth.py   # Auth middleware
```

Legacy top-level files (`app/routes/files.py`, etc.) are shim imports kept for backwards compatibility.

### Authentication

Every protected endpoint depends on `get_current_user()` from `app/dependencies/auth.py`. It:

1. Extracts the Bearer token from the `Authorization` header.
2. Makes a `GET http://auth:80/api/me` request (via `httpx`, 10 s timeout) to the Symfony service.
3. Returns the user dict (`{id, email, ...}`) on success, or raises 401/403/503.

No JWT validation happens inside FastAPI — it is entirely delegated to Symfony.

### Data Models

All models are in `app/models/models.py`. Key relationships:

- `User` (int PK, mirrored from Symfony) → many `Track`, many `Playlist`
- `Track` (UUID PK) → one `Metadata` (JSONB), many `Statistics`, many `Playlist` (via `playlist_tracks` junction with `position` column)
- `Statistics` has composite PK `(user_id, track_id)` — one row per user per track
- `playlist_tracks` junction table stores track order via `position` (INT)

Metadata is stored as a single JSONB column (`metadata_json`) in the `Metadata` model. This avoids schema migrations when new tags are added.

### Storage Layout

```
/storage/
├── audio/{user_id}_{uuid}.{ext}
└── cover/
    ├── {basename}_cover.jpg          # Original JPEG
    ├── {basename}_thumb_small.webp   # 150×150
    ├── {basename}_thumb_medium.webp  # 300×300
    └── {basename}_thumb_large.webp   # 600×600
```

Cover extraction supports MP3 (APIC ID3 frame), FLAC (picture block), MP4/M4A (covr atom), and OGG (METADATA_BLOCK_PICTURE / COVERART). Thumbnails are always WebP.

### Audio Upload Flow

`POST /files/upload/audio` (in `app/routes/files/audio_handler.py`):

1. Verify JWT → get `user_id`.
2. Check storage quota (`StorageQuotaService`; default 1 GB/user, calculated from sum of `Track.file_size`).
3. Validate MIME type + extension (allowed: mp3, wav, flac, ogg, aac, m4a).
4. Save file asynchronously via `aiofiles` to `/storage/audio/`.
5. Extract metadata with **Mutagen** (50+ fields including BPM, key, Discogs tags, custom TXXX frames, technical info).
6. Extract and process cover art → JPEG + 3 WebP thumbnails.
7. Insert `Track` + `Metadata` rows in DB.

### Audio Streaming

`GET /files/audio/{filename}` supports HTTP Range requests, returning `206 Partial Content` for seekable streaming. Ownership is verified against the DB before serving. `last_accessed` timestamp is updated on each download.

### Route Class Pattern

Route handlers are defined as static methods of a class that return async closures. This allows FastAPI's `add_api_route()` to inject dependencies while keeping related handlers grouped:

```python
class PlaylistCrudRoutes:
    @staticmethod
    def create_playlist(...):
        async def endpoint(playlist_data, db, current_user):
            ...
        return endpoint
```

### Service Layer Conventions

- All services use direct `db.commit()` / `db.rollback()` (no Unit-of-Work abstraction).
- Ownership is always re-verified in the DB (never trusted from the token alone).
- `StorageQuotaService.check_upload_allowed()` is the single gating point for uploads.
- `MetadataEditService` performs field-level validation (BPM 0–300, date format, etc.) before updating the JSONB column.
