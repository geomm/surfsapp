# PRD: Phase 6 — Beach Listing View

## Introduction

Build the first real user-facing screen: a beach listing that shows all Greek beaches sorted by current surf score. Each beach card displays the name, region, score badge, swell/wind summary, today's best-window time, and a favourite toggle. Data is fetched from `GET /beaches` via a Pinia store. This is the app's home screen — the entry point users land on.

Phase 6 introduces Pinia as the data layer and transforms the temporary dev-nav HomeView into the real beach listing.

---

## Goals

- Install Pinia and create `useBeachStore` as the central data layer for beach data
- Replace the dev-nav HomeView with a real beach listing sorted by surf score (best first)
- Show rich beach cards using existing Lit components (`surf-card`, `surf-badge`, `surf-icon`)
- Display staleness indicator ("Last updated X ago") per card
- Add favourite toggle (heart icon) on each card, stored in-memory for now
- Implement pull-to-refresh gesture with loading state
- Provide a smooth, mobile-first layout

---

## User Stories

### US-001: Install Pinia and create beachStore
**Description:** As a developer, I want a Pinia store for beach data so the listing view and future views can share state.

**Acceptance Criteria:**
- [ ] `pinia` package installed in `ui/` via `yarn add pinia`
- [ ] Pinia instance created and registered in the Vue app entry point (`ui/src/main.ts`)
- [ ] `ui/src/stores/beachStore.ts` created, exporting `useBeachStore` via `defineStore`
- [ ] Store state: `beaches: Beach[]` (typed array), `loading: boolean`, `error: string | null`, `favourites: Set<string>` (beach IDs)
- [ ] `Beach` TypeScript interface defined in `ui/src/types/beach.ts`: `{ id: string, name: string, region: string, coords: { lat: number, lon: number }, skillLevel: string, tags: string[], currentScore: number | null, currentLabel: string | null, lastUpdated: string | null }`
- [ ] Store action `fetchBeaches()`: calls `GET http://localhost:3000/beaches` using native `fetch`, sets `beaches` on success, sets `error` on failure, manages `loading` flag
- [ ] Store action `toggleFavourite(beachId: string)`: adds or removes from `favourites` set
- [ ] Store getter `sortedBeaches`: returns beaches sorted by currentScore descending (nulls last) — same order the API returns, but available as a getter for future filtering
- [ ] Store getter `favouriteBeaches`: returns only beaches whose id is in `favourites`
- [ ] Typecheck passes

**Notes:** The API base URL should be a constant (e.g. `const API_BASE = 'http://localhost:3000'`) at the top of the store file. Favourites are in-memory only for Phase 6 — IndexedDB persistence comes in Phase 8.

---

### US-002: Beach listing page — layout and cards
**Description:** As a user, I want to see all beaches listed with their current surf conditions so I can decide where to surf.

**Acceptance Criteria:**
- [ ] `ui/src/views/HomeView.vue` replaced with the beach listing (remove dev-nav entirely)
- [ ] On mount, calls `beachStore.fetchBeaches()`
- [ ] Shows a loading spinner/skeleton while `loading` is true
- [ ] Shows an error message if `error` is set, with a retry button
- [ ] Renders each beach as a `<surf-card clickable>` in a vertical list with gap spacing
- [ ] Each card contains: beach name (bold, `--font-size-lg`), region text (secondary color, `--font-size-sm`), `<surf-badge>` with the `currentLabel` as variant and score number as text content (e.g. "74"), skill level tag
- [ ] Cards are sorted by score (best first) — uses `beachStore.sortedBeaches`
- [ ] Beaches with `currentScore === null` show `<surf-badge variant="neutral">No data</surf-badge>`
- [ ] Page has a header bar with the app title "surfsapp" and a refresh icon button
- [ ] Layout uses CSS custom properties from the design system (spacing, colors, typography)
- [ ] Mobile-first: cards stack vertically with appropriate padding and safe-area awareness
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-003: Rich card content — swell, wind, and best window
**Description:** As a user, I want to see current swell and wind conditions plus today's best surf window on each beach card so I have enough info without tapping through.

**Acceptance Criteria:**
- [ ] `Beach` interface in `ui/src/types/beach.ts` extended with optional forecast summary fields: `swellHeight: number | null`, `swellPeriod: number | null`, `swellDirection: number | null`, `windSpeed: number | null`, `windDirection: number | null`, `bestWindowStart: string | null`, `bestWindowEnd: string | null`
- [ ] `beachStore.fetchBeaches()` updated: after fetching `GET /beaches`, for each beach also fetches `GET /beaches/${id}/forecast` to extract the first hourly forecast's rawData (swell_wave_height, swell_wave_period, swell_wave_direction, wind_speed_10m, wind_direction_10m) and today's dailySummary (bestWindowStart, bestWindowEnd)
- [ ] Each beach card shows a conditions row below the name/region: swell info as "1.2m · 10s · SW" (height, period, compass direction) and wind info as "12 km/h NE" — using `<surf-icon name="waves">` and `<surf-icon name="wind">` as prefixes
- [ ] Compass direction derived from degrees: convert numeric degrees to 8-point compass (N, NE, E, SE, S, SW, W, NW)
- [ ] If today's daily summary exists, show "Best: 09:00–12:00" below the conditions row in secondary text
- [ ] If no forecast data exists for a beach, show "No forecast data" in muted text instead of conditions
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Notes:** Fetching individual forecasts for 8 beaches is acceptable for MVP (8 extra requests). This can be optimised with a batch endpoint later. The compass conversion helper should be a small utility function (e.g. `degreesToCompass(deg: number): string`).

---

### US-004: Staleness indicator
**Description:** As a user, I want to know how fresh the data is so I can trust what I'm seeing.

**Acceptance Criteria:**
- [ ] Each beach card shows a staleness line: "Updated X minutes ago", "Updated X hours ago", or "Updated X days ago" based on `lastUpdated` timestamp
- [ ] Uses relative time formatting: <1 min → "Updated just now", 1–59 min → "Updated Xm ago", 1–23h → "Updated Xh ago", 1+ days → "Updated Xd ago"
- [ ] Staleness text uses `--font-size-xs` and `--color-text-secondary`
- [ ] If `lastUpdated` is null, show "No data yet" instead
- [ ] If data is older than 6 hours, staleness text turns to a warning color (`--color-surf-maybe`)
- [ ] Time helper function created in `ui/src/utils/time.ts`: `formatRelativeTime(dateString: string): string`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: Favourite toggle
**Description:** As a user, I want to favourite beaches so I can quickly find my preferred spots.

**Acceptance Criteria:**
- [ ] Each beach card has a heart icon button in the top-right corner using `<surf-icon name="heart">`
- [ ] Tapping the heart calls `beachStore.toggleFavourite(beachId)`
- [ ] Favourited beaches show a filled/highlighted heart (use `--color-surf-poor` red for the filled state via a CSS class, e.g. `.favourite surf-icon { color: var(--color-surf-poor) }`)
- [ ] Non-favourited beaches show an outlined heart (default `currentColor` in secondary text color)
- [ ] Heart icon has adequate touch target (minimum 44x44px tap area)
- [ ] Favourite state is reactive — toggling immediately updates the heart icon without re-fetching
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Notes:** Favourites are stored in the Pinia store's `favourites` Set (in-memory). They reset on page reload — persistence comes in Phase 8 with IndexedDB.

---

### US-006: Pull-to-refresh
**Description:** As a user, I want to pull down on the listing to refresh data so I can get the latest scores without navigating away.

**Acceptance Criteria:**
- [ ] Pull-to-refresh implemented on the beach listing: pulling down on the list triggers `beachStore.fetchBeaches()`
- [ ] A visual indicator appears during the pull gesture (e.g. a `<surf-icon name="refresh-cw">` that rotates or an animated loading bar at the top)
- [ ] While refreshing, the refresh icon in the header also shows a loading/spinning state
- [ ] After refresh completes, the indicator dismisses and the list updates with new data
- [ ] The pull gesture has a minimum threshold (e.g. 60px pull distance) to avoid accidental triggers
- [ ] On desktop, the header refresh button also triggers the same refresh action (pull gesture is mobile only)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Notes:** Implement the pull-to-refresh as a Vue composable (e.g. `usePullToRefresh`) that attaches touch event listeners. Keep it simple — a custom implementation is fine for 8 beaches. No need for a library.

---

## Functional Requirements

- FR-1: Pinia is the state management layer — all beach data flows through `useBeachStore`
- FR-2: `GET /beaches` provides the listing data; `GET /beaches/:id/forecast` provides per-beach swell/wind/best-window details
- FR-3: Beach cards use existing `surf-card`, `surf-badge`, and `surf-icon` Lit components
- FR-4: Score badge variant maps directly to `currentLabel` value ('very-good', 'good', 'maybe', 'poor')
- FR-5: Compass direction is 8-point (N, NE, E, SE, S, SW, W, NW) derived from forecast degrees
- FR-6: Staleness turns warning color after 6 hours
- FR-7: Favourites are in-memory (Pinia store Set) — no persistence yet
- FR-8: Pull-to-refresh has a 60px minimum threshold and visual feedback
- FR-9: Mobile-first responsive layout — cards are full-width on mobile, constrained max-width on desktop
- FR-10: Dev-nav links (/design, /components) remain accessible via the router but are removed from HomeView

---

## Non-Goals

- No beach detail view (Phase 7)
- No IndexedDB/Dexie persistence for favourites or offline cache (Phase 8/9)
- No filtering by region, skill level, or favourites-only toggle (Phase 11)
- No map view (Phase 13)
- No service worker or offline mode (Phase 9)
- No batch API endpoint for forecast summaries — individual fetches are fine for 8 beaches

---

## Design Considerations

- Reuse all 5 existing Lit components: `surf-card` (clickable cards), `surf-badge` (score labels), `surf-icon` (waves, heart, wind, refresh-cw), `surf-button` (retry), `surf-bottom-sheet` (not needed yet)
- Card layout: name + badge on the first row, region + skill on the second, conditions on the third, staleness + favourite on the fourth
- Use design system spacing tokens (`--space-3`, `--space-4`, `--space-6`) consistently
- Header should feel lightweight — app name on the left, refresh button on the right
- Touch targets for heart and refresh must be >= 44x44px

---

## Technical Considerations

- Pinia is the first new `ui/` dependency since Phase 2 — register it in `main.ts` before the app mounts
- The `GET /beaches` response shape: `{ id, name, region, coords, skillLevel, tags, currentScore, currentLabel, lastUpdated }`
- The `GET /beaches/:id/forecast` response contains `hourlyForecasts[0].rawData` and `dailySummaries[0]` for current/today data
- Dev routes (`/design`, `/components`) should remain in the router for development but are no longer linked from HomeView
- `vue-tsc` is used for typechecking — `yarn typecheck` in `ui/`

---

## Success Metrics

- Beach listing loads and displays 8 beach cards within 2 seconds of page load
- Each card shows score badge, swell/wind conditions, best window, and staleness
- Favourite toggle is immediately responsive (no flicker or delay)
- Pull-to-refresh updates all data and shows visual feedback
- Layout is clean and usable on a 375px-wide mobile viewport

---

## Open Questions

- Should the header eventually include a search bar or filters? (Defer to Phase 11)
- Should we add a "Favourites first" sort option now? (Defer — filtering comes in Phase 11)
