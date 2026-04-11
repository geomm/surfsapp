# PRD: Phase 9 — Offline First

## Introduction

Phase 9 makes surfsapp fully usable offline after the first load. It installs the Vite PWA Plugin to register a service worker that caches the app shell, adds IndexedDB caching for beaches and forecast snapshots via Dexie, implements a network-first fetch strategy with IndexedDB fallback, shows a persistent offline banner when connectivity is lost, and provides a prompt-to-update banner when a new service worker is available.

---

## Goals

- Install and configure `vite-plugin-pwa` with Workbox for app shell caching
- Cache the beaches list and per-beach forecast snapshots in IndexedDB (Dexie)
- Implement network-first data fetching: try API, fall back to IndexedDB cache on failure
- Write fetched data to IndexedDB cache after every successful API response
- Show a persistent top banner when the app is offline ("You're offline — showing cached data")
- Show a "New version available — tap to refresh" banner when a new service worker is waiting
- App fully usable offline after first successful load

---

## User Stories

### US-001: Install vite-plugin-pwa and configure service worker
**Description:** As a developer, I need a service worker registered so the app shell is cached and the app loads offline.

**Acceptance Criteria:**
- [ ] `vite-plugin-pwa` installed via `yarn add -D vite-plugin-pwa` in `ui/`
- [ ] `vite.config.ts` updated: import `VitePWA` from `vite-plugin-pwa` and add to plugins array
- [ ] PWA config: `registerType: 'prompt'`, `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`
- [ ] `manifest` section with `name: 'surfsapp'`, `short_name: 'surfsapp'`, `theme_color` matching `--color-primary` (or `#1a73e8`), `background_color: '#ffffff'`, `display: 'standalone'`
- [ ] Service worker registers successfully in production build (`yarn build && yarn preview`)
- [ ] Typecheck passes

**Notes:** Do NOT add icon files in this story — Phase 10 handles icons. The manifest can reference placeholder paths. `registerType: 'prompt'` means the new SW waits for user action before activating (US-006 builds the prompt UI).

### US-002: Extend Dexie schema for beaches and forecasts cache
**Description:** As a developer, I need IndexedDB tables to cache API responses so the app can serve data offline.

**Acceptance Criteria:**
- [ ] `ui/src/db.ts` updated: Dexie version bumped to 2
- [ ] New table `beachesCache` with schema `&id` — stores full `Beach` objects
- [ ] New table `forecastsCache` with schema `&beachId` — stores full `ForecastSnapshot` objects
- [ ] TypeScript interfaces: `BeachCacheRecord` (same shape as `Beach`) and `ForecastCacheRecord` (same shape as `ForecastSnapshot`)
- [ ] Tables typed on the `SurfsAppDB` class: `db.beachesCache` and `db.forecastsCache`
- [ ] Existing v1 tables (`favourites`, `settings`) preserved in the v2 upgrade
- [ ] Typecheck passes

### US-003: Cache beaches and forecasts on successful fetch
**Description:** As a user, I want the app to save the latest data locally so it's available when I'm offline.

**Acceptance Criteria:**
- [ ] In `beachStore.fetchBeaches()`: after successful API response and enrichment, write all beaches to `db.beachesCache` via `db.beachesCache.bulkPut(enriched)`
- [ ] In `beachStore.fetchBeaches()`: for each beach where the forecast fetch succeeded, write the forecast to `db.forecastsCache` via `db.forecastsCache.put(forecast)` (where forecast includes `beachId`)
- [ ] In `beachStore.fetchBeachDetail(id)`: after successful API response, write the beach to `db.beachesCache.put(beach)` and forecast to `db.forecastsCache.put(forecast)`
- [ ] All IndexedDB writes are fire-and-forget (`.catch(console.error)`) — never block UI on cache writes
- [ ] Typecheck passes

### US-004: Network-first fetch with IndexedDB fallback
**Description:** As a user, I want the app to show cached data when I'm offline so I can still check conditions.

**Acceptance Criteria:**
- [ ] In `beachStore.fetchBeaches()`: wrap the existing network fetch in a try/catch; on network failure, read from `db.beachesCache.toArray()` and for each cached beach read its forecast from `db.forecastsCache.get(beach.id)`; enrich cached beaches the same way as network beaches (swell/wind/bestWindow extraction); set `this.beaches` from cache
- [ ] If both network and cache fail (no cached data), set `this.error` to a user-friendly message: "No internet connection and no cached data available"
- [ ] In `beachStore.fetchBeachDetail(id)`: on network failure, read from `db.beachesCache.get(id)` and `db.forecastsCache.get(id)`; set `selectedBeach` and `selectedForecast` from cache
- [ ] If detail cache miss, set `detailError` to "No internet connection and no cached data for this beach"
- [ ] When serving cached data, the existing staleness timestamps on each beach's `lastUpdated` field naturally show how old the data is (no extra work needed — Phase 6/7 staleness UX handles this)
- [ ] Typecheck passes

### US-005: Offline banner
**Description:** As a user, I want to know when I'm offline so I understand the data may be stale.

**Acceptance Criteria:**
- [ ] `ui/src/composables/useOnlineStatus.ts` created: exports a reactive `isOnline` ref that tracks `navigator.onLine` and listens to `online`/`offline` window events
- [ ] `App.vue` imports `useOnlineStatus` and renders a top banner when `!isOnline`: yellow/amber background (`--color-surf-maybe` or `#f59e0b`), white text, full-width, fixed to top (z-index above header), text: "You're offline — showing cached data"
- [ ] Banner has a subtle slide-down animation when appearing and slide-up when disappearing
- [ ] When the banner is visible, the page content below shifts down so the banner doesn't overlap the header
- [ ] Banner disappears immediately when connectivity returns
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Prompt-to-update banner for new service worker
**Description:** As a user, I want to know when a new version of the app is available so I can update.

**Acceptance Criteria:**
- [ ] `ui/src/composables/useServiceWorker.ts` created: imports `useRegisterSW` from `virtual:pwa-register/vue`, exposes `needRefresh` (boolean ref) and `updateServiceWorker` (function)
- [ ] `App.vue` imports `useServiceWorker` and renders a top banner when `needRefresh` is true: blue/primary background, white text, text: "New version available", with a `<surf-button>` labelled "Refresh" that calls `updateServiceWorker(true)`
- [ ] If both offline banner and update banner would show simultaneously, the offline banner takes priority (update banner hidden)
- [ ] Banner has the same slide-down animation style as the offline banner
- [ ] Page content shifts down when the banner is visible
- [ ] After clicking "Refresh", the page reloads with the new service worker active
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Notes:** `virtual:pwa-register/vue` is provided by `vite-plugin-pwa` — it requires `registerType: 'prompt'` in the config (set in US-001). Add the type reference `/// <reference types="vite-plugin-pwa/vue" />` in `env.d.ts` or `vite-env.d.ts` if needed for TypeScript.

---

## Functional Requirements

- FR-1: A service worker is registered via `vite-plugin-pwa` and caches the app shell (JS, CSS, HTML, fonts, icons)
- FR-2: IndexedDB tables `beachesCache` and `forecastsCache` store the latest API responses
- FR-3: Every successful API fetch writes to IndexedDB cache (fire-and-forget)
- FR-4: `fetchBeaches()` and `fetchBeachDetail(id)` fall back to IndexedDB when the network fails
- FR-5: A persistent yellow banner appears at the top when the device is offline
- FR-6: A blue "New version available" banner with a refresh button appears when a new service worker is waiting
- FR-7: The app is fully usable offline after one successful load (beaches list + detail views served from cache)
- FR-8: Staleness timestamps on cached data reflect when the data was originally fetched (existing UX from Phase 6/7)

---

## Non-Goals

- No background sync (pushing queued actions when back online)
- No app icons or full manifest polish (Phase 10)
- No pre-caching of map tiles for offline maps (MapLibre requires network; show "Map unavailable" offline — already handled by Phase 7 error state)
- No cache eviction strategy (with ~8 beaches the data is tiny)
- No offline indicator on the detail view (the top-level App.vue banner covers all views)
- No periodic cache refresh while the app is open — only on explicit user actions (pull-to-refresh, navigation)

---

## Design Considerations

- Offline banner: full-width, fixed to top, amber/yellow (`--color-surf-maybe`), bold text, z-index above everything
- Update banner: same position/animation, blue/primary color, includes a "Refresh" button
- Only one banner visible at a time (offline takes priority over update)
- Banners push page content down rather than overlapping it
- Subtle slide-down/slide-up CSS transitions (~200ms)

---

## Technical Considerations

- `vite-plugin-pwa` handles Workbox config generation — no manual service worker file needed
- `registerType: 'prompt'` means the new SW enters `waiting` state; `useRegisterSW` from `virtual:pwa-register/vue` provides the reactivity
- Dexie version bump from 1 to 2 adds the new tables; Dexie handles the IndexedDB upgrade automatically
- Fire-and-forget cache writes: always `.catch(console.error)` to avoid unhandled rejections
- `navigator.onLine` is not 100% reliable (can report online when behind a captive portal) but is sufficient for MVP offline detection
- The `fetchBeaches` enrichment logic (extracting swell/wind/bestWindow from forecast) must work identically for both network and cached data
- Service worker only works in production builds — dev mode (`yarn dev`) will not register the SW. Test with `yarn build && yarn preview`
- Add `/// <reference types="vite-plugin-pwa/vue" />` to the project's type declarations for `virtual:pwa-register/vue` imports
- `vue-tsc` typechecking via `cd ui && yarn typecheck`

---

## Success Metrics

- App loads and shows the beach listing when the device is airplane-mode (after one prior successful load)
- Beach detail view works offline with cached forecast data
- Offline banner appears within 1 second of losing connectivity
- Offline banner disappears within 1 second of regaining connectivity
- Update banner appears when a new build is deployed and the user revisits
- No console errors during offline operation (aside from expected network failures)

---

## Open Questions

- Should we show a brief toast when coming back online ("Back online — refreshing data")? (Defer — keep it simple)
- Should the service worker pre-cache the API responses too via Workbox runtime caching? (No — IndexedDB handles API data; SW handles app shell only)
