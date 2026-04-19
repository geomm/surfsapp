# Surf App — MVP Development Plan

**Goal:** An offline-first PWA that lists Greek surf beaches with live surfability scores, fetches marine forecasts, and works offline using cached data.

---

## MVP Definition

The user should be able to:

1. Open the app and see all beaches listed with current surfability score + label
2. Filter beaches by region, difficulty, or favourites
3. Tap a beach and read its current surf score, reasons, and localised map
4. Browse a 10-day forecast for that beach (daily summaries)
5. Favourite a beach from the listing or detail screen
6. Reopen the app offline and still see the last known scores
7. Know when data was last refreshed ("Last updated X hours ago")

Do NOT build in MVP:
- User accounts / auth
- Push notifications
- Social features
- User-submitted conditions
- Tide modelling (add later)
- Capacitor native app wrapping (add after PWA is stable)

Shipped beyond original MVP scope:
- Full interactive map view with clustered markers, locate-me, wind-arrow overlay (Phase 13)

---

## Stack

| Layer | Technology |
|---|---|
| App shell | Vue 3 + Vite + TypeScript |
| Routing | Vue Router |
| State | Pinia |
| UI components | Lit Web Components |
| Styling | SCSS + CSS custom properties |
| Map | MapLibre GL JS |
| Local DB | IndexedDB via Dexie |
| Offline/PWA | Vite PWA Plugin |
| Backend | Node.js |
| Database | MongoDB |
| Forecast API | Open-Meteo Marine API |
| Containerisation | Docker |

---

## Data Model

### beach_profiles.json (static, bundled with backend)
See `docs/beach-profiles.md` for full schema and curated beaches.

### MongoDB Collections

**beaches**
```
id, name, coords, region, description, orientation,
difficulty, tags, shorelineNormalDeg, photo (optional)
```

**forecastSnapshots**
```
id, beachId, fetchedAt,
hourlyForecasts: [{ timestamp, rawData, surfScore, label, reasons[] }],
dailySummaries: [{ date, bestWindowStart, bestWindowEnd, peakScore, overallLabel }]
```

**favourites** (future — stored locally in IndexedDB for MVP)
```
id, beachId, createdAt
```

### IndexedDB (Dexie) — Frontend

```
beaches         — id, name, coords, cached beach metadata
forecastCache   — beachId, fetchedAt, dailySummaries[], currentScore
favourites      — id, beachId, createdAt
settings        — mapCenter, mapZoom, filters, offlinePreferences
```

---

## Development Phases

### Phase 0 — Project Setup
- Monorepo with Docker Compose: `ui/`, `backend/`, `mongo/`
- Frontend: `npm create vite` (Vue 3 + TypeScript)
- Backend: Node.js + Express skeleton
- MongoDB container
- Basic docker-compose.yml with hot reload

### Phase 1 — SCSS Design System
- Token files: colors, spacing, typography, z-index
- Expose tokens as CSS custom properties on `:root`
- Base reset + base styles
- Utility mixins: breakpoints, focus

### Phase 2 — Lit Component Library
- Base components: button, card, badge, icon, bottom sheet
- Components consume CSS custom properties for theming
- Simple dev page for component preview

### Phase 3 — Backend: Beach Profiles + API Skeleton
- Define and validate `beach_profiles.json` (5–10 Greek beaches)
- Seed MongoDB with beach records on startup
- REST endpoints:
  - `GET /beaches` — list all beaches with last known score
  - `GET /beaches/:id` — beach detail
  - `GET /beaches/:id/forecast` — 10-day forecast with hourly scores

### Phase 4 — Backend: Forecast Fetching
- Integrate Open-Meteo Marine API
- Cron job: fetch forecast for all beaches every 3–6 hours
- Store raw hourly data + computed scores in `forecastSnapshots`

### Phase 5 — Backend: Scoring Engine
- Implement rule-based scorer against beach profiles
- Subscores: swell direction, swell period, swell height, wind
- Weighted final score → label (poor / maybe / good / very good)
- Attach human-readable `reasons[]` array to each scored hour
- Compute daily summaries (best window + peak score per day)
- See `docs/scoring-engine.md` for algorithm details

### Phase 6 — Beach Listing View
- List all beaches from API, sorted by surf score (best first)
- Each beach card shows: name, region, surf score badge, label, current swell summary
- Staleness indicator per card: "Last updated X hours ago"
- Favourite toggle on each card
- Pull-to-refresh

### Phase 7 — Beach Detail View
- Back navigation to listing
- Current surf score + label (prominent)
- Reasons list ("swell direction matches", "wind is offshore", etc.)
- Localised MapLibre map: single beach pin + surrounding coastline, read-only orientation view
- 10-day forecast strip (scrollable day cards with score + label)
- Favourite toggle
- Staleness indicator: "Last updated X hours ago"

### Phase 8 — Favourites (filter, not separate screen)
- Save/remove favourites in IndexedDB
- "Favourites only" filter toggle on listing
- Favourite state persisted across sessions

### Phase 9 — Offline First
- Service worker via Vite PWA Plugin
- Cache: app shell, beach dataset, last forecast response
- IndexedDB: persist last known scores per beach
- Staleness UX: show "Last updated X hours ago", degraded indicator when stale (>6h)
- App fully usable offline after first load

### Phase 10 — PWA Installation
- manifest.json with app icons
- Installable on desktop, Android, iOS Safari
- Test standalone mode

### Phase 11 — Filters
- Filter by: region, difficulty, favourites only
- Persist active filters in IndexedDB settings

### Phase 12 — Mobile Polish
- Touch-optimised interactions
- Safe area insets
- Test on real Android + iOS Safari

### Phase 13 — Full Map View (shipped)
- `/map` route with MapLibre GL JS, symmetric Map ⇄ List FAB
- All beaches rendered as colour-coded GeoJSON circle markers by surfability score
- Cluster markers below zoom 8
- Tap marker → bottom-sheet preview → beach detail
- Persist map centre + zoom in IndexedDB settings
- Offline notice when map opens without network
- Locate-me control (pans map + drops a user-location marker)
- Toggleable wind-arrow overlay (arrows point where wind is going, not coming from)

---

## Folder Structure

```
surfsapp/
├── docker-compose.yml
├── ui/
│   ├── package.json (yarn)
│   ├── vite.config.ts
│   └── src/
│       ├── app/
│       │   ├── main.ts
│       │   └── router.ts
│       ├── views/
│       │   ├── BeachListView.vue
│       │   └── BeachDetailView.vue
│       ├── components/
│       │   ├── vue/
│       │   └── lit/
│       ├── stores/
│       ├── db/
│       │   └── database.ts
│       ├── services/
│       │   ├── api-service.ts
│       │   ├── map-service.ts
│       │   └── forecast-service.ts
│       ├── composables/
│       ├── styles/
│       │   ├── main.scss
│       │   ├── tokens/
│       │   ├── mixins/
│       │   ├── base/
│       │   └── utilities/
│       └── assets/
└── backend/
    ├── package.json
    └── src/
        ├── index.ts
        ├── routes/
        │   └── beaches.ts
        ├── services/
        │   ├── forecast-fetcher.ts
        │   └── scoring-engine.ts
        ├── models/
        │   ├── Beach.ts
        │   └── ForecastSnapshot.ts
        ├── data/
        │   └── beach_profiles.json
        └── cron/
            └── forecast-cron.ts
```

---

## Shipping Strategy

### Version 1 — PWA
Ship as installable PWA. No app store required.

### Version 2 — Native (Capacitor)
Wrap PWA with Capacitor for iOS/Android app store distribution.
Adds: native notifications, native geolocation, splash screen.

---

## Future Features (Post-MVP)

- Beach search
- Nearby beaches (geolocation)
- Surf forecast notifications
- User notes per beach
- Tide integration
- Device sync
- Community condition reports
- Copernicus Marine integration for better Mediterranean resolution
