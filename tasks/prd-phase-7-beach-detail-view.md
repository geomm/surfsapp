# PRD: Phase 7 — Beach Detail View

## Introduction

Phase 7 builds the beach detail screen — the page users land on after tapping a beach card on the home listing. It shows the current surf score prominently, a pros/cons reasons breakdown (inside a new expandable Lit component), a localised MapLibre map of the beach, a horizontally scrollable 10-day forecast strip, the favourite toggle, and a staleness indicator. Phase 7 also introduces MapLibre GL JS as a new UI dependency and a new `surf-disclosure` Lit component.

---

## Goals

- Add a `/beaches/:id` route and a real beach detail page
- Extend `useBeachStore` with `selectedBeach`, `selectedForecast`, and `fetchBeachDetail(id)`
- Build a new reusable `surf-disclosure` Lit component (expand/collapse block)
- Display scoring reasons grouped as pros/cons inside the disclosure component
- Install MapLibre GL JS and render a single-beach map with pin + surrounding coastline
- Render a horizontally scrollable 10-day forecast strip from `dailySummaries`
- Reuse the Phase 6 favourite toggle and staleness indicator on the detail page

---

## User Stories

### US-001: Add `/beaches/:id` route and detail view scaffold
**Description:** As a user, I want tapping a beach card to open a dedicated detail page so I can see more information about that beach.

**Acceptance Criteria:**
- [ ] `ui/src/router.ts` updated with route `{ path: '/beaches/:id', name: 'beach-detail', component: () => import('../views/BeachDetailView.vue') }`
- [ ] `ui/src/views/BeachDetailView.vue` created with a header bar containing a back button (`<surf-icon name='arrow-left'>`) on the left and the beach name centered/left-aligned
- [ ] Back button uses `router.back()` (or pushes `/` if no history)
- [ ] `HomeView.vue` cards wired so clicking a `<surf-card>` calls `router.push({ name: 'beach-detail', params: { id: beach.id } })`
- [ ] Page reads `route.params.id` and triggers `beachStore.fetchBeachDetail(id)` on mount
- [ ] Loading and error states handled (text + retry button)
- [ ] Layout is mobile-first, max-width 600px centered on desktop, var(--space-4) horizontal padding
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-002: Extend beachStore with selectedBeach + fetchBeachDetail
**Description:** As a developer, I want the beach store to manage the currently viewed beach so the detail page has a single source of truth.

**Acceptance Criteria:**
- [ ] `beachStore` state extended with: `selectedBeach: Beach | null`, `selectedForecast: ForecastSnapshot | null`, `detailLoading: boolean`, `detailError: string | null`
- [ ] `ForecastSnapshot` TypeScript interface added in `ui/src/types/beach.ts` matching the backend response: `{ beachId, fetchedAt, hourlyForecasts: HourlyForecast[], dailySummaries: DailySummary[] }`
- [ ] `HourlyForecast` and `DailySummary` interfaces also defined (timestamp, rawData, surfScore, label, reasons, confidence / date, bestWindowStart, bestWindowEnd, peakScore, overallLabel)
- [ ] New action `fetchBeachDetail(id: string)`: fetches `GET http://localhost:3000/beaches/${id}` and `GET http://localhost:3000/beaches/${id}/forecast` in parallel via `Promise.all`, sets `selectedBeach` and `selectedForecast`, manages `detailLoading` / `detailError`
- [ ] If the beach is already in `state.beaches`, populate `selectedBeach` immediately from cache while the network requests run, so the page renders fast
- [ ] Action `clearSelectedBeach()` resets `selectedBeach` and `selectedForecast` to null (called on detail view unmount)
- [ ] Typecheck passes

---

### US-003: Build `surf-disclosure` Lit component
**Description:** As a developer, I want a reusable expand/collapse block component so the detail view (and future views) can hide secondary content behind a tap.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/SurfDisclosure.ts` created, registered as `<surf-disclosure>`
- [ ] Properties: `summary: string` (the always-visible header label), `open: boolean` (default false)
- [ ] Slot `default` renders the collapsible body content
- [ ] Optional named slot `summary` allows rich header content (overrides the `summary` string property when present)
- [ ] Header row shows the summary text plus a `<surf-icon name='chevron-right'>` that rotates 90° when open (CSS transform transition)
- [ ] Clicking the header toggles `open` and dispatches a `toggle` CustomEvent with `{ open }` detail
- [ ] Body uses `max-height` + opacity transition for a smooth open/close animation
- [ ] Header has min-height 44px (touch target) and uses `--space-3` padding, `--font-size-md` text
- [ ] Component added to `/components` dev gallery with at least one closed and one open example
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-004: Reasons displayed as pros/cons inside disclosure
**Description:** As a user, I want to understand why a beach has its current score by seeing what's working for and against the conditions.

**Acceptance Criteria:**
- [ ] Reasons come from `selectedForecast.hourlyForecasts[0].reasons` (current hour)
- [ ] Utility `classifyReason(reason: string): 'pro' | 'con'` created in `ui/src/utils/reasons.ts` — heuristic: reasons starting with `+`, containing "ideal", "good", "favourable" are pros; reasons starting with `-`, containing "too", "wrong", "off", "weak" are cons; default to `con` if score < 50, otherwise `pro`
- [ ] Detail view renders a `<surf-disclosure summary="Why this score">` block beneath the main score
- [ ] Inside the disclosure, two grouped lists: "Working for you" (pros, green checkmark `<surf-icon name='waves'>` placeholder is fine — use whatever check-style icon is available; if none, use a unicode ✓ wrapped in a span styled with `--color-surf-very-good`) and "Working against you" (cons, red ✕ in `--color-surf-poor`)
- [ ] Each list item shows the icon + reason text in a row with `--space-2` gap
- [ ] If a group is empty, hide its heading entirely
- [ ] If there are no reasons at all, the disclosure shows "No detailed reasons available"
- [ ] Disclosure starts collapsed by default
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Notes:** Lucide does not currently expose `check` or `x` in the surf-icon registry. Either extend `SurfIcon.ts` to add `check` and `x` from lucide, or use plain unicode characters (✓ / ✕) styled with the surf colors. Pick whichever is simpler — extending the icon registry is preferred and one-line.

---

### US-005: Install MapLibre GL JS and render beach map
**Description:** As a user, I want to see where the beach is on a map with the surrounding coastline so I have geographic context.

**Acceptance Criteria:**
- [ ] `maplibre-gl` installed via `yarn add maplibre-gl` in `ui/`
- [ ] `maplibre-gl/dist/maplibre-gl.css` imported once in `ui/src/main.ts`
- [ ] `ui/src/components/BeachMap.vue` created — a Vue component that takes `coords: { lat: number, lon: number }` and `name: string` as props
- [ ] On mount, initialises a MapLibre map with a free demo style (`https://demotiles.maplibre.org/style.json` for MVP; document the choice in a code comment so it can be swapped later)
- [ ] Map centers on the beach coords with zoom 12
- [ ] A single marker is placed at the beach coords with a popup showing the beach name on click
- [ ] Map container has fixed height 240px, full-width, rounded corners (`border-radius: var(--radius-md)`), and respects mobile padding
- [ ] Map cleanly destroys itself in `onBeforeUnmount` to avoid leaks
- [ ] If the browser cannot initialise the map, show "Map unavailable" text in `--color-text-secondary`
- [ ] Beach detail view renders `<BeachMap>` between the score block and the forecast strip
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Notes:** demotiles is fine for MVP — Phase 13 will introduce a proper hosted style or PMTiles. Do not block Phase 7 on tile-provider decisions.

---

### US-006: 10-day horizontal forecast strip
**Description:** As a user, I want to scan the next 10 days of conditions at a glance so I can plan ahead.

**Acceptance Criteria:**
- [ ] New component `ui/src/components/ForecastStrip.vue` takes `dailySummaries: DailySummary[]` as a prop
- [ ] Renders a horizontally scrollable row of small day cards (one per `dailySummary`), wrapped in a `display: flex; overflow-x: auto; gap: var(--space-3); scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;` container
- [ ] Each day card uses `<surf-card padding>` with min-width 96px, scroll-snap-align start, and shows: weekday short label (e.g. "Mon") in `--font-size-xs`, day-of-month number in `--font-size-md` bold, `<surf-badge>` with `peakScore` as text and `overallLabel` as variant, and best window time as "HH:MM–HH:MM" in `--font-size-xs --color-text-secondary`
- [ ] Date helpers added to `ui/src/utils/time.ts`: `formatWeekday(dateString: string): string` (e.g. "Mon"), `formatDayOfMonth(dateString: string): string` (e.g. "14")
- [ ] If a daily summary lacks `bestWindowStart`/`bestWindowEnd`, the card shows "—" in place of the time range
- [ ] Strip is rendered on the detail view beneath the map
- [ ] Strip horizontal padding aligns with the page's content padding so the first card edge matches the rest of the content
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-007: Detail page header — score, favourite, staleness
**Description:** As a user, I want the most important information (current score, freshness, favourite toggle) at the top of the detail page.

**Acceptance Criteria:**
- [ ] Below the page header bar, a hero block shows: beach name (`--font-size-xl` bold), region (`--font-size-sm --color-text-secondary`), and a large score display — score number in `--font-size-2xl` (or the largest available token) next to a `<surf-badge>` with the `currentLabel` variant
- [ ] Favourite heart button (`<surf-icon name='heart'>`) reused from Phase 6 patterns, positioned in the top-right of the hero block, ≥44x44px touch target, calls `beachStore.toggleFavourite(beach.id)`, filled-red when favourited
- [ ] Staleness line under the score uses `formatRelativeTime(lastUpdated)` from `ui/src/utils/time.ts` and turns `--color-surf-maybe` if older than 6 hours (matches Phase 6 behaviour)
- [ ] If `currentScore === null`, show `<surf-badge variant='neutral'>No data</surf-badge>` and "No data yet" instead of the score number and staleness
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- FR-1: A `/beaches/:id` route exists and renders `BeachDetailView.vue`
- FR-2: `useBeachStore` exposes `selectedBeach`, `selectedForecast`, `detailLoading`, `detailError`, `fetchBeachDetail(id)`, and `clearSelectedBeach()`
- FR-3: Tapping a beach card on the home view navigates to its detail page
- FR-4: A new `<surf-disclosure>` Lit component provides a reusable expand/collapse block with a `summary` property and toggle event
- FR-5: Reasons are split into pros and cons via a `classifyReason` helper and rendered inside the disclosure
- FR-6: MapLibre GL JS is installed and a `<BeachMap>` component renders a single-pin map for the beach
- FR-7: A `<ForecastStrip>` component renders the 10-day `dailySummaries` as a horizontally scrollable row of day cards
- FR-8: The detail page reuses the favourite toggle and staleness indicator behaviours from Phase 6
- FR-9: Loading and error states are handled at the page level with a retry button
- FR-10: The detail page is mobile-first, max-width 600px on desktop, with consistent design system spacing tokens

---

## Non-Goals

- No alternate map styles or PMTiles offline tile bundling (Phase 13)
- No multi-day reasons drilldown (only the current hour's reasons are shown)
- No tide, water-temperature, or air-temperature display (future phases)
- No share-beach or deep-link preview metadata (future)
- No persistent favourites — still in-memory Pinia only (Phase 8 will add Dexie)
- No detail view for non-current hours of the forecast (no per-hour drilldown)
- No animations beyond the disclosure expand and chevron rotation

---

## Design Considerations

- Reuse `surf-card`, `surf-badge`, `surf-icon`, `surf-button` from the existing Lit library
- New component: `surf-disclosure` — keep it minimal (header + body slot, single toggle event)
- Map height fixed at 240px to avoid jank during load
- Forecast strip uses scroll-snap so the cards feel native on touch devices
- Hero block layout: name/region/favourite on row 1, big score + badge on row 2, staleness on row 3
- Icon for pros/cons: extend SurfIcon registry with `check` and `x` from lucide if trivial; otherwise unicode ✓/✕ in surf colors

---

## Technical Considerations

- MapLibre GL JS adds ~200KB gzipped — acceptable for the detail view; lazy-load the route component (already done via dynamic `import()` in router) so the home view stays light
- MapLibre needs its CSS imported once at the app level (`main.ts`)
- Use the `demotiles` style for MVP and document the eventual swap in a code comment
- `vue-tsc` typechecking via `cd ui && yarn typecheck`
- Always destroy the MapLibre instance in `onBeforeUnmount` to prevent WebGL context leaks
- Disclosure animation should use `max-height` (not `height: auto`) so the CSS transition works

---

## Success Metrics

- Tapping a beach card opens the detail page in under 500ms (cached beach renders instantly, forecast hydrates after)
- Map renders within 2 seconds on a 4G connection
- Disclosure expand/collapse feels snappy (≤200ms transition)
- 10-day strip is horizontally scrollable on mobile with snap behaviour
- Layout is clean on a 375px viewport with no horizontal page scroll

---

## Open Questions

- Should the disclosure remember its open state across navigations? (Defer — start collapsed each visit)
- Should the map support tap-to-fullscreen? (Defer to Phase 13 map view)
- Should we prefetch detail data on card hover (desktop)? (Defer — premature optimisation for 8 beaches)
