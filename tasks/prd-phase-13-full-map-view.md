# PRD: Phase 13 — Full Map View

## Introduction

Add a dedicated full-map view that plots every beach as a colour-coded marker, with clustering at low zoom, a bottom-sheet preview on tap, a "locate me" control, and persistent camera state. The map lives at its own route reached from a new floating action button (FAB) on HomeView. This is the first v2 feature after the MVP and gives users a geographic way to discover surf conditions across Greece.

## Goals

- Let users browse all beaches on a single map, not just a list
- Surface surfability visually at a glance (colour by label, score inside the marker)
- Keep marker density readable at country-level zoom via clustering
- Preserve the user's map camera between sessions (zoom + centre)
- Provide a one-tap path from marker → full beach detail

## User Stories

### US-001: Add /map route and a symmetric Map ⇄ List FAB
**Description:** As a user, I want a single FAB that toggles me between the list and the map so switching views feels like one obvious gesture in both directions.

**Acceptance Criteria:**
- [ ] New route `{ path: '/map', name: 'beach-map', component: () => import('./views/MapView.vue') }` added to `ui/src/router.ts`
- [ ] `ui/src/views/MapView.vue` created with a placeholder `<main>` containing an `<h1>Map</h1>` (real map comes in US-002)
- [ ] A shared FAB component `ui/src/components/ViewSwitcherFab.vue` is created, pinned bottom-right (fixed), 56px diameter, `--color-ocean-800` background, white icon, with a single dynamic icon/label based on the current route:
  - On `/` → lucide `map` icon, `aria-label="Open map view"`, navigates to `{ name: 'beach-map' }`
  - On `/map` → lucide `list` icon, `aria-label="Open list view"`, navigates to `/`
- [ ] Add `map` and `list` lucide icons to `ui/src/components/lit/surf-icon.ts` if missing
- [ ] FAB honours `env(safe-area-inset-bottom)` in its bottom offset so it clears the iOS home indicator
- [ ] FAB is mounted from BOTH HomeView and MapView (or once at the app-shell level if easier — justify either way in the PR)
- [ ] On HomeView, the FAB is hidden while `beachStore.loading` is true or `beachStore.error` is set (no beaches to plot yet); on MapView the FAB is always shown
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill (tap FAB on home → map opens, tap FAB on map → list returns)

### US-002: Render MapLibre map with all beaches and fit-to-bounds on first visit
**Description:** As a user opening the map for the first time, I want to see every beach on a map zoomed to fit them all so I get an overview without panning.

**Acceptance Criteria:**
- [ ] MapView.vue loads beaches via `beachStore.fetchBeaches()` if `beachStore.beaches.length === 0`
- [ ] Initialises a MapLibre map filling the viewport (`height: 100vh`, no persistent top header — the FAB from US-001 is the only nav affordance)
- [ ] Uses the same style URL currently in `BeachMap.vue` (`https://demotiles.maplibre.org/style.json`) — swap later is out of scope
- [ ] On first visit (no persisted camera — see US-005), calls `map.fitBounds(bounds, { padding: 48 })` over every beach's `[lon, lat]`
- [ ] Adds a simple native MapLibre `Marker` for each beach (styling comes in US-003)
- [ ] Map instance is cleaned up in `onBeforeUnmount` via `map.remove()`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Colour-coded circle markers with score number
**Description:** As a user scanning the map, I want each marker to show the beach's score inside a coloured circle so I can compare surfability visually without tapping.

**Acceptance Criteria:**
- [ ] Replace the default MapLibre markers from US-002 with custom HTML markers: a 36px circle `<div>` containing the score number (e.g. `72`) without `%` (space-constrained)
- [ ] Circle background colour comes from the label using existing tokens:
  - `very-good` → `--color-surf-very-good`
  - `good` → `--color-surf-good`
  - `maybe` → `--color-surf-maybe`
  - `poor` → `--color-surf-poor`
  - missing label or no data → `--color-neutral-300`
- [ ] Circle has a 2px white border and a subtle drop shadow so it reads on any tile colour
- [ ] Score text is white, bold, `font-size: var(--font-size-sm)`
- [ ] Beaches with `currentScore === null` render a neutral marker showing `—` (em dash)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Cluster markers below zoom 8
**Description:** As a user at a country-level zoom, I want clustered markers so the map isn't overwhelmed with overlapping pins.

**Acceptance Criteria:**
- [ ] Beaches loaded into a MapLibre GeoJSON source with `cluster: true`, `clusterMaxZoom: 8`, `clusterRadius: 50`
- [ ] Cluster bubble layer: circle radius scales by point count (e.g. `['step', ['get', 'point_count'], 18, 10, 22, 30, 28]`), fill `--color-ocean-700`, white 2px stroke
- [ ] Cluster count rendered via a `symbol` layer with white text
- [ ] Individual marker layer (non-clustered) uses the custom HTML markers from US-003 — rendered only when a feature is `!['has', 'point_count']`. (If HTML markers can't be combined with GeoJSON clustering cleanly, use a circle + symbol layer for individuals too, colour-coded by a `label` feature property via a `match` expression, with the score rendered in the symbol layer.)
- [ ] Tapping a cluster zooms the map using `map.easeTo({ center: clusterCenter, zoom: expansionZoom })` from `getClusterExpansionZoom`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Persist map centre and zoom in IndexedDB settings
**Description:** As a returning user, I want the map to open where I left it so I don't have to re-navigate to my area every time.

**Acceptance Criteria:**
- [ ] On `moveend`, write `{ key: 'mapCenter', value: [lng, lat] }` and `{ key: 'mapZoom', value: zoom }` to `db.settings` (same table used by filters)
- [ ] Writes are debounced ~400ms so rapid panning doesn't spam IndexedDB
- [ ] On MapView mount, read both keys before initialising the map; if both exist, pass them as `center` and `zoom` to `new maplibregl.Map({...})` and skip the `fitBounds` from US-002
- [ ] If either key is missing, fall back to the US-002 fit-to-bounds behaviour
- [ ] No TypeScript `any` — type the settings read via the existing pattern used by filter persistence in `beachStore.ts`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (pan/zoom, navigate away, return — camera is preserved)

### US-006: Bottom-sheet preview on marker tap
**Description:** As a user tapping a marker, I want a quick preview card with the beach's key info and a button to open full details, without losing my place on the map.

**Acceptance Criteria:**
- [ ] Tapping a non-clustered marker opens `surf-bottom-sheet` with `open` set to true
- [ ] Sheet content shows: beach name, region, `surf-badge` with score and label (same visual idiom as the HomeView card), swell/wind summary lines if `hasForecast` is true (reuse the same computed helpers from HomeView), staleness line
- [ ] Sheet footer contains a full-width `surf-button variant="primary"` labelled "View details" that calls `router.push({ name: 'beach-detail', params: { id: beach.id } })`
- [ ] Closing the sheet (backdrop tap / close gesture) returns focus to the map without navigation
- [ ] Sheet honours `env(safe-area-inset-bottom)` (already done in Phase 12 for surf-bottom-sheet)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: "Locate me" control that pans to user location
**Description:** As a user, I want to quickly centre the map on my current location to see beaches near me.

**Acceptance Criteria:**
- [ ] Circular "locate me" button overlaid top-right of the map, 44×44 px, `--color-ocean-800` border, white background, lucide `locate-fixed` icon (add to surf-icon registry if missing)
- [ ] Tapping calls `navigator.geolocation.getCurrentPosition`; on success, `map.easeTo({ center: [lng, lat], zoom: Math.max(current, 11) })`
- [ ] While awaiting a fix, button shows a subtle loading state (e.g. icon at `opacity: 0.5`, disabled pointer events) for max 10s
- [ ] On error or denial, show a transient toast-style message (aria-live polite): "Can't access your location" — reuse the existing offline-banner styling pattern or create a minimal inline notice
- [ ] Button honours safe-area insets on its top offset
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (DevTools → Sensors → override geolocation to a Greek coordinate)

### US-008: Offline notice when map opened without network
**Description:** As a user opening the map offline, I want to be told the tiles won't load so I'm not left staring at a blank grid.

**Acceptance Criteria:**
- [ ] MapView listens to `navigator.onLine` / online-status composable (`useOnlineStatus`)
- [ ] When offline on mount, a full-width banner at the top of the map reads "Map needs internet — tiles won't load. Your cached beach data is still available on the list view."
- [ ] Banner includes a "Back to list" secondary surf-button that navigates to `/`
- [ ] Banner uses `--color-surf-maybe` background (matches existing offline banner conventions) and is dismissible only by going online or navigating away
- [ ] Map itself is still rendered underneath — don't skip mount, just warn
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (DevTools Network → Offline, navigate to /map)

### US-009: Toggleable wind-arrow overlay
**Description:** As a user comparing beaches on the map, I want to see wind direction and relative strength at each beach so I can spot offshore-wind spots without opening each detail page.

**Acceptance Criteria:**
- [ ] Add a second MapLibre `symbol` layer `beach-wind-arrows` anchored to the same GeoJSON source as the beach markers (feature filter `!['has', 'point_count']` so arrows never render on clusters)
- [ ] Each beach feature carries `windSpeed` (km/h) and `windDirection` (degrees, 0 = from N) as properties; skip features with either missing (don't render an arrow for them)
- [ ] Layer uses a rotated arrow icon:
  - Register an `arrow` icon in MapLibre's sprite or load a simple SVG via `map.loadImage` + `map.addImage` once on map load
  - `icon-rotate: ['get', 'windDirection']` (wind direction is the compass bearing the wind is coming *from*, which matches the arrow tail-to-head convention — document this assumption next to the `loadImage` call)
  - `icon-size: ['interpolate', ['linear'], ['get', 'windSpeed'], 0, 0.5, 30, 1.0]` so arrows grow with wind strength
  - `icon-opacity: 0.85`, `icon-allow-overlap: true`, `icon-ignore-placement: true`
  - `icon-offset: [0, -28]` so arrows sit *above* the score circle rather than overlapping it
- [ ] A toggle button overlaid top-right of the map (below the locate-me button from US-007), 44×44 px, same visual treatment as the locate button, lucide `wind` icon
- [ ] Default: arrows hidden on first map visit; toggle state persists in `db.settings` under key `mapWindOverlay` (boolean)
- [ ] Active state: button background `--color-ocean-800`, icon white; inactive state: white background, icon `--color-ocean-800` (mirrors locate-me)
- [ ] Toggling flips `setLayoutProperty(layerId, 'visibility', 'visible' | 'none')` — no re-render
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (toggle on/off; check arrows rotate visibly differently for beaches with different wind directions)

## Functional Requirements

- FR-1: `/map` route renders a MapView component with a full-viewport MapLibre map
- FR-2: A shared FAB appears on both `/` and `/map`, swapping icon and destination based on the current route (Map ⇄ List)
- FR-3: All beaches from `beachStore.beaches` are rendered as markers; no backend changes required
- FR-4: Markers are colour-coded by `currentLabel` and display `currentScore`
- FR-5: Markers cluster via MapLibre's built-in clustering below zoom 8 (radius 50)
- FR-6: Tapping a cluster zooms into its expansion zoom; tapping a marker opens a bottom sheet
- FR-7: Bottom sheet mirrors the HomeView card's key info and offers a "View details" CTA that navigates to BeachDetailView
- FR-8: Map camera (centre + zoom) persists in `db.settings` under keys `mapCenter` and `mapZoom`, debounced
- FR-9: "Locate me" control pans to the user's geolocation on demand
- FR-10: When offline, MapView shows a banner explaining tiles won't load
- FR-11: A toggleable wind-arrow overlay renders rotated arrows per beach, sized by wind speed, persisted in `db.settings` under `mapWindOverlay`

## Non-Goals

- No filter integration — Phase 11 filters (region, difficulty, favourites-only) do NOT apply to the map; every beach is plotted regardless
- No tile precaching / PMTiles / offline tiles
- No heatmap or tide overlay (tide is on the MVP "do NOT build" list; heatmap over sparse beach points isn't informative)
- No marker animations (e.g. pulsing current-score marker)
- No in-map search bar
- No route from BeachDetailView to the map centred on that beach
- No map style swap (keep the demotiles style used by BeachMap.vue)

## Design Considerations

- Reuse existing tokens for marker colours: `--color-surf-very-good/good/maybe/poor`
- FAB colour matches the Phase 12 header accent (`--color-ocean-800`)
- Reuse `surf-bottom-sheet` and `surf-card` / `surf-badge` / `surf-button` for the preview
- Reuse `useOnlineStatus` composable for the offline banner
- `surf-icon` will need the `map-pin` and `locate-fixed` lucide icons registered if they aren't already
- Safe-area insets must be honoured on every overlay element: FAB, back button, locate-me button, top banner

## Technical Considerations

- MapLibre GL JS is already a dependency (`BeachMap.vue` uses it) — no new package
- For US-004 clustering, MapLibre's clustering needs a GeoJSON source; this is incompatible with per-feature HTML markers. The pragmatic pattern: use a `circle` + `symbol` layer for *both* individuals and clusters, driven by feature properties (`label`, `score`), and skip HTML markers for the map-layer path. If HTML markers are strongly preferred for individuals, render HTML markers only at `zoom >= clusterMaxZoom` and swap to the clustered GeoJSON layer below — but that adds complexity. Default to the `circle + symbol` approach.
- Persistence in `db.settings` already exists for filters — copy the same read/write pattern (see `beachStore.ts`).
- Geolocation is a user-gesture-gated permission; the "locate me" button must be the direct click origin.
- MapLibre's `on('click', layerId, ...)` needs the layer id after the source is loaded — use `map.on('load', ...)` as the setup entry point.

## Success Metrics

- Opening `/map` shows every beach as a coloured marker within 1 second of navigation (after beaches already loaded in the store)
- Returning to the map preserves camera state (verified manually)
- Marker colour matches the HomeView card badge colour for the same beach
- No regression in HomeView performance from adding the FAB
- App still builds and typechecks cleanly

## Open Questions

- Should the bottom-sheet preview (US-006) include the "Why this score" disclosure, or keep it minimal and push users to detail for reasons? (PRD assumes minimal.)
- Is the demotiles style acceptable for this phase, or should we switch to a free MapTiler / Stadia style with an API key? (PRD defers the swap.)
- Do we want haptic feedback on marker tap? (Phase 12 decision was "no haptics" — sticking with that.)
