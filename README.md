# surfsapp

An offline-first PWA that shows surfability scores for Greek beaches. Fetches marine forecast data from Open-Meteo, scores conditions per beach profile, and works fully offline using cached data.

## What it does

- Lists Greek surf beaches sorted by current surfability score
- Scores are computed from swell direction, swell period, swell height, and wind — weighted per beach
- Each beach has a curated profile (ideal swell window, skill level, orientation, etc.)
- 10-day hourly forecast with a daily best-window summary per beach
- Fully usable offline after first load — shows last known scores with a staleness timestamp
- Installable as a PWA on desktop, Android, and iOS Safari

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + TypeScript |
| UI components | Lit Web Components (custom design system) |
| Styling | SCSS + CSS custom properties |
| Map | MapLibre GL JS |
| Local DB | IndexedDB via Dexie |
| Offline / PWA | Vite PWA Plugin |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB |
| Forecast data | Open-Meteo Marine API (free, no key required) |
| Containers | Docker Compose |

## Getting started

**Prerequisites:** Docker + Docker Compose

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
```

Services:
- UI: http://localhost:5173
- Backend API: http://localhost:3000
- MongoDB: localhost:27017

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/beaches` | All beaches with current surf score, sorted best-first |
| `GET` | `/beaches/:id` | Full beach profile + current score |
| `GET` | `/beaches/:id/forecast` | Latest ForecastSnapshot (raw hourly data) |
| `GET` | `/health` | Backend health + MongoDB connection status |
| `POST` | `/admin/fetch-forecasts` | Manually trigger a forecast fetch for all beaches |

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
│       ├── styles/            # SCSS design tokens + base styles
│       └── views/             # Vue page components
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

| Beach | Region | Type |
|---|---|---|
| Vouliagmeni | Attica | Enclosed gulf, wave-generating-onshore |
| Mesachti | Ikaria | Open north-facing, Meltemi-driven |
| Langouvardos | Filiatra, Peloponnese | Open beach break |
| Falasarna | Crete | Open north-facing with offshore swell potential |
| Palaiohora | Crete | Wave-generating-onshore (Libyan Sea) |
| Agios Georgios | Naxos | Open beach break |
| Kokkino Limanaki | Rafina, Attica | Enclosed gulf |
| Kolimpithra | Tinos | Exposed north-facing |
