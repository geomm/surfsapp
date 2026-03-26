# App Purpose
An offline-first surf conditions app that alerts surfers when beaches near them have suitable conditions. Uses marine forecast data combined with per-beach profiles to compute a surfability score.

Target region: Greece (MVP), expandable later.

---

## Architecture Overview

```
Open-Meteo Marine API (hourly, 10-day forecast)
        ↓
  Node.js Backend
  - cron job: fetches forecast for all beaches every 3–6h
  - scoring engine: runs beach profiles against forecast data
  - stores ForecastSnapshots in MongoDB
  - REST API: serves beaches + scored forecasts
        ↓
  Vue 3 Frontend (PWA)
  - fetches latest scores on load
  - caches in IndexedDB (Dexie) for offline use
  - shows "last updated X hours ago" when offline
  - beach_profiles.json bundled in app
        ↓
  Capacitor (later)
  - wraps PWA for iOS/Android native distribution
```

---

## Services

Docker containers for isolation.

### 1. UI
- Package manager: yarn
- Framework: Vite / Vue 3 / TypeScript
- Routing: Vue Router
- State: Pinia
- UI components: Lit Web Components (custom design system)
- Styling: SCSS with CSS custom properties
- Map: MapLibre GL JS
- Local DB: IndexedDB via Dexie
- Offline/PWA: Vite PWA Plugin

### 2. Node.js Backend
- Runtime: Node.js
- Responsibilities:
  - Cron job: fetch marine forecasts for all beaches (every 3–6h)
  - Scoring engine: compute surfability scores from beach profiles
  - REST API: serve beaches, profiles, and forecast snapshots
- Data source: Open-Meteo Marine API (evaluate Copernicus Marine later)

### 3. MongoDB
- Stores: beach metadata, forecast snapshots, user favourites (future)
- Beach profiles: curated JSON file (not DB), bundled with backend

---

## Key Design Decisions

- **Beach profiles** drive the scoring — each beach has its own threshold config (swell direction window, period range, height range, wind preference, skill level)
- **Scoring is backend-side** — frontend receives pre-computed scores + reasons
- **Offline strategy** — frontend caches last known scores in IndexedDB; shows staleness timestamp
- **No backend in offline mode** — app is fully usable with cached data
- **No Ionic UI** — custom Lit component design system; Capacitor only for native wrapping
- **No user accounts in MVP** — favourites stored locally in IndexedDB

---

## Data Sources

| Data | Source |
|---|---|
| Marine forecast | Open-Meteo Marine API (MVP), Copernicus Marine (evaluate later) |
| Beach locations | Manually curated `beach_profiles.json` |
| Map tiles | MapLibre GL JS with hosted vector tiles (online); PMTiles later |

---

## Docs Index

- `docs/mvp-plan.md` — phased development plan
- `docs/scoring-engine.md` — surfability scoring algorithm design
- `docs/beach-profiles.md` — beach profile schema and curated beaches
