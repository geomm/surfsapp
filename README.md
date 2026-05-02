# surfsapp

An offline-first PWA that shows surfability scores for Greek beaches. Fetches marine forecast data from Open-Meteo, scores conditions per beach profile, and works fully offline using cached data.

## What it does

- Lists Greek surf beaches sorted by current surfability score
- Scores are computed from swell direction, swell period, swell height, and wind — weighted per beach
- Each beach has a curated profile (ideal swell window, skill level, orientation, etc.)
- 10-day hourly forecast with a daily best-window summary per beach
- Full interactive map view with colour-coded markers, clustering, locate-me, and a toggleable wind-arrow overlay
- Fully usable offline after first load — shows last known scores with a staleness timestamp
- Installable as a PWA on desktop, Android, and iOS Safari (with an in-app "Add to Home Screen" guide)

## Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Frontend      | Vue 3 + Vite + TypeScript                     |
| UI components | Lit Web Components (custom design system)     |
| Styling       | SCSS + CSS custom properties                  |
| Map           | MapLibre GL JS                                |
| Local DB      | IndexedDB via Dexie                           |
| Offline / PWA | Vite PWA Plugin                               |
| Backend       | Node.js + Express + TypeScript                |
| Database      | MongoDB                                       |
| Forecast data | Open-Meteo Marine API (free, no key required) |
| Containers    | Docker Compose                                |

## Local development

**Prerequisites:** Docker + Docker Compose. Everything else (Node, Yarn, Mongo) runs inside containers — no host installs required to boot the stack.

### First-time setup

```bash
# 1. Clone
git clone https://github.com/geomm/surfsapp.git
cd surfsapp

# 2. Create env file
cp backend/.env.example .env
# Edit .env and set MONGO_URI (default works with Docker)

# 3. Start all services
docker compose up

# 4. Seed beach data (first run only)
docker compose exec backend npm run seed

# 5. Install root devDeps so the husky pre-commit hook is wired up
npm install
```

### Where things live

| Path                 | What it is                                                      |
| -------------------- | --------------------------------------------------------------- |
| `ui/`                | Vue 3 + Vite frontend (PWA). Yarn workspace.                    |
| `backend/`           | Node.js + Express API + cron forecast fetcher. npm workspace.   |
| `docker-compose.yml` | Orchestrates `ui`, `backend`, `mongo` containers                |
| `docs/`              | Plans, scoring engine, beach profiles, perf baselines           |
| `scripts/`           | Bench harnesses (`bench-backend.mjs`, `bench-during-fetch.mjs`) |

### Ports

| Service     | Host port | Container port |
| ----------- | --------- | -------------- |
| UI (Vite)   | 5173      | 5173           |
| Backend API | 3000      | 3000           |
| MongoDB     | 27017     | 27017          |

### Dev workflow (hot reload, no service worker)

```bash
docker compose up                                    # start everything
docker compose logs -f ui backend                    # tail logs
docker compose exec ui yarn typecheck                # typecheck the frontend
docker compose restart ui                            # pick up vite.config changes
docker compose exec backend npm run seed             # reseed beaches
```

The UI runs `vite` in dev mode. Fast HMR, but the service worker is **not registered** and PWA install is unavailable.

### HMR over Docker bind mounts (`usePolling`)

`ui/vite.config.ts` sets `server.watch.usePolling: true`. The UI source is bind-mounted into the container (`./ui:/app`), and on macOS / Windows the Docker VM does not propagate native file-system events (`fsevents`/`inotify`) across that boundary. Without polling, edits on the host never trigger an HMR reload inside the container. Polling adds a small CPU cost but is the only reliable cross-platform watcher inside Docker — leave it on.

### Production build + preview (service worker live)

Use this when testing offline-first behaviour, install prompts, or the update banner.

```bash
docker compose stop ui
docker compose run --rm --service-ports ui sh -c "yarn build && yarn preview"
```

Serves the built `dist/` on port 5173 (same mapping as dev) with the service worker registered. Ctrl+C the container to stop, then `docker compose up -d ui` to return to dev mode.

### Quality commands

Run from the host (the lint and typecheck tools resolve config relative to cwd, so `cd` into the package first):

| Package    | Command                           | What it does                              |
| ---------- | --------------------------------- | ----------------------------------------- |
| `ui/`      | `cd ui && yarn lint`              | ESLint flat config, `--max-warnings 0`    |
| `ui/`      | `cd ui && yarn typecheck`         | `vue-tsc --noEmit` (full project)         |
| `ui/`      | `cd ui && yarn format`            | `prettier --write .` (root `.prettierrc`) |
| `ui/`      | `cd ui && yarn build`             | `vue-tsc && vite build` → `ui/dist/`      |
| `backend/` | `cd backend && npm run lint`      | ESLint flat config, `--max-warnings 0`    |
| `backend/` | `cd backend && npm run typecheck` | `tsc --noEmit`                            |
| `backend/` | `cd backend && npm run format`    | `prettier --write .`                      |
| `backend/` | `cd backend && npm run build`     | `tsc` → `backend/dist/`                   |

These same commands run automatically on staged files via the pre-commit hook — see [Pre-commit hooks](#pre-commit-hooks) below.

### Real-device testing over HTTPS (cloudflared)

Cloudflared gives you a trusted HTTPS URL pointing at the dev server — required for service worker registration, "Add to Home Screen" on iOS/Android, and the Phase 1 Definition of Done in [`docs/v0.2-plan.md`](docs/v0.2-plan.md).

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:5173
```

Open the printed `https://*.trycloudflare.com` URL on your phone. API requests go through `/api` on the same tunnel (Vite proxies them to the backend). The tunnel host is allow-listed in `ui/vite.config.ts` (`server.allowedHosts: ['.trycloudflare.com']`).

## Pre-commit hooks

A husky + lint-staged pre-commit hook runs on every `git commit`. After cloning, run `npm install` once at the repo root to install the hooks (the `prepare` script wires up `.husky/`).

What runs on staged files:

| File pattern                | Checks                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| `ui/**/*.ts`, `ui/**/*.tsx` | `eslint --fix`, `prettier --write`, `tsc --noEmit` (scoped via `tsc-files`) |
| `ui/**/*.vue`               | `eslint --fix`, `prettier --write`, `vue-tsc --noEmit` (full ui project)    |
| `backend/**/*.ts`           | `eslint --fix`, `prettier --write`, `tsc --noEmit` (scoped via `tsc-files`) |
| `*.{js,json,md}`            | `prettier --write`                                                          |

A typical 1–3 file commit completes in ~1–2 seconds on a warm cache.

To skip the hook in an emergency (rolling back, partial commits, etc.):

```bash
git commit --no-verify -m "..."
```

Don't make this a habit — CI will still run the same lint and typecheck.

## API endpoints

| Method | Path                     | Description                                            |
| ------ | ------------------------ | ------------------------------------------------------ |
| `GET`  | `/beaches`               | All beaches with current surf score, sorted best-first |
| `GET`  | `/beaches/:id`           | Full beach profile + current score                     |
| `GET`  | `/beaches/:id/forecast`  | Latest ForecastSnapshot (raw hourly data)              |
| `GET`  | `/health`                | Backend health + MongoDB connection status             |
| `POST` | `/admin/fetch-forecasts` | Manually trigger a forecast fetch for all beaches      |

## Forecast fetching

The backend fetches forecast data from the Open-Meteo Marine API automatically:

- On startup — immediately after the DB connection is ready
- On a recurring cron schedule — every `FORECAST_INTERVAL_HOURS` hours (default: 6)
- Manually — `POST /admin/fetch-forecasts`

## Project structure

```
surfsapp/
├── docker-compose.yml
├── ui/                        # Vue 3 frontend (PWA)
│   └── src/
│       ├── components/lit/    # Lit Web Component design system
│       ├── composables/       # useInstallPrompt, useOnlineStatus, useServiceWorker
│       ├── styles/            # SCSS design tokens + base styles
│       └── views/             # Vue page components (Home, BeachDetail, Map)
└── backend/                   # Node.js API
    └── src/
        ├── data/              # beach_profiles.json (source of truth)
        ├── models/            # Mongoose schemas (Beach, ForecastSnapshot)
        ├── routes/            # Express routers (beaches, admin)
        ├── services/          # forecastFetcher (Open-Meteo integration)
        ├── scripts/           # seed.ts
        └── scheduler.ts       # Cron job setup
```

## Docs

- [`docs/mvp-plan.md`](docs/mvp-plan.md) — phased development plan
- [`docs/scoring-engine.md`](docs/scoring-engine.md) — surfability scoring algorithm
- [`docs/beach-profiles.md`](docs/beach-profiles.md) — beach profile schema and curated beaches

## Beaches (MVP)

8 curated Greek beaches across different regions and surf types:

| Beach            | Region                | Type                                            |
| ---------------- | --------------------- | ----------------------------------------------- |
| Vouliagmeni      | Attica                | Enclosed gulf, wave-generating-onshore          |
| Mesachti         | Ikaria                | Open north-facing, Meltemi-driven               |
| Langouvardos     | Filiatra, Peloponnese | Open beach break                                |
| Falasarna        | Crete                 | Open north-facing with offshore swell potential |
| Palaiohora       | Crete                 | Wave-generating-onshore (Libyan Sea)            |
| Agios Georgios   | Naxos                 | Open beach break                                |
| Kokkino Limanaki | Rafina, Attica        | Enclosed gulf                                   |
| Kolimpithra      | Tinos                 | Exposed north-facing                            |
