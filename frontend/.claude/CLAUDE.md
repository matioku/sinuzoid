# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server on port 5173
npm run build     # TypeScript check + production build
npm run lint      # ESLint
```

Environment variables required: copy `frontend/.env.example` to `frontend/.env`. Key vars: `VITE_API_URL` (FastAPI, default `http://localhost:8000`), `VITE_AUTH_URL` (Symfony, default `http://localhost:9000`).

Note: several hardcoded `http://localhost:8000` and `http://localhost:9000` URLs exist in services and hooks (not yet using env vars).

## Architecture

### State Management

Three Zustand stores in `src/store/`:

- **`musicStore`** — tracks, albums, image caches. Cache TTL: 5 min for data, 30 min for images. Persisted via `sessionStorage` (excludes blob URLs). Key: `forceFetch()` to bypass cache.
- **`audioPlayerStore`** — all player state: current track, playlist, index, volume, shuffle, repeat mode (none / track / playlist). Shuffle excludes current track when picking random index.
- **`playlistStore`** — user playlists CRUD. Cache TTL: 5 min. Persisted: `playlists` + `lastFetch` only.

### Audio Playback

`src/hooks/useAudioElement.ts` owns the HTML `<audio>` element and syncs it to `audioPlayerStore`. Flow:

1. Store sets `currentTrack`.
2. Hook extracts filename from `track.file_path`, fetches the audio blob from FastAPI with the Bearer token.
3. `URL.createObjectURL(blob)` assigned to `audio.src` (old blob URL revoked first).
4. HTML5 audio events (`canplay`, `timeupdate`, `ended`, `error`) sync back into the store.
5. `ended` → calls `store.next()`, or rewinds if repeat-track mode.

The hook exposes `seekTo()` and `isReady()` via `AudioContext` (`src/contexts/AudioContext.tsx`).

### Authentication

Managed by `src/contexts/AuthContext.tsx`:

- **Access token**: `sessionStorage` (1-hour expiry, cleared on browser close).
- **Refresh token**: `localStorage` (persists across sessions).
- Auto-refresh runs every 60 s; triggers when expiry is within 5 minutes.
- Auth headers attached manually in every service file: `Authorization: Bearer {token}`.

### Routing

Protected routes require `isAuthenticated` (from `AuthContext`). The root layout wraps all app pages inside `<Layout>` (header, sidebar, main `<Outlet>`, bottom player). Public routes: `/login`, `/register`.

### Download System

`src/services/trackApi.ts` handles downloads:

- Single track: `GET /files/audio/{filename}` → blob.
- Playlist / full library: fetches each blob, then dynamically imports **JSZip** and assembles a `.zip`. Albums are preserved as folders for full-library downloads.
- `triggerDownload(blob, filename)` creates a temporary `<a download>` element and clicks it.

### Background Sync

`useBackgroundSync()` and `useNetworkSync()` (both called in `App.tsx`):

- Refetch every 5 minutes.
- Refetch on tab focus, window focus, or network reconnect.

### Image Caching

`src/hooks/useMusicImages.ts` + `musicStore` cache image blob URLs keyed by filename. Images are fetched with auth headers — they cannot be loaded via plain `<img src URL>` because the API requires a Bearer token.

## Key Patterns

- **Duration format**: Backend returns ISO 8601 (`PT3M45S`); `formatDuration` in `src/utils/formatters.ts` parses both ISO 8601 and `MM:SS`.
- **Track ID**: UUID string. **User ID**: integer (comes from Symfony).
- **File path**: stored as `/storage/audio/{user_id}_{uuid}.ext`; filename extracted by `.split('/').pop()` before API calls.
- **Tailwind dark mode**: `class` strategy — toggled by adding/removing `.dark` on `<html>`.
- **Fonts**: Manrope and Space Grotesk loaded locally from `src/assets/fonts/`.
