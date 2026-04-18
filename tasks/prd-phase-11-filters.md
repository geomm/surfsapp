# PRD: Phase 11 — Filters

## Introduction

Phase 11 adds filtering to the beach listing so users can narrow the list by **region** and **difficulty** (`skillLevel`) in addition to the existing favourites-only toggle. Filters live in a bottom sheet opened from a new header button, use multi-select checkboxes (OR within a filter, AND across filters), and persist to IndexedDB so they survive reloads. An empty state appears when active filters exclude every beach.

---

## Goals

- Let users filter the beach list by region and/or difficulty from a bottom sheet UI
- Multi-select within each filter (e.g., pick "Crete" and "Attica"); combine filters with AND (region AND difficulty AND favourites)
- Dynamically derive filter options from loaded beaches, plus an implicit "any" state when no options are selected
- Persist region, difficulty, and favourites-only selections to IndexedDB so they survive reloads
- Show a clear empty state with a "Clear filters" affordance when active filters match zero beaches

---

## User Stories

### US-001: Add region + difficulty filter state and persistence to beachStore
**Description:** As a developer, I need the store to manage region/difficulty selections and persist them to IndexedDB so filters survive reloads.

**Acceptance Criteria:**
- [ ] `beachStore` state extended with `selectedRegions: Set<string>` and `selectedDifficulties: Set<string>` (both initialised empty)
- [ ] New actions: `toggleRegion(region: string)`, `toggleDifficulty(level: string)`, `clearFilters()` (clears regions, difficulties, and `showFavouritesOnly`)
- [ ] `toggleRegion` / `toggleDifficulty` add or remove the value from the Set and persist to `db.settings` under keys `selectedRegions` and `selectedDifficulties` (stored as arrays)
- [ ] `toggleFavouritesFilter` updated to also persist the new value to `db.settings` under key `showFavouritesOnly`
- [ ] `displayedBeaches` getter updated to apply all three filters with AND semantics. Within each filter, OR: a beach matches if its `region` is in `selectedRegions` (or the set is empty) AND its `skillLevel` is in `selectedDifficulties` (or empty) AND it passes the favourites filter
- [ ] Empty Sets mean "no filter applied" (show everything) — they do NOT exclude all beaches
- [ ] New getter `activeFilterCount: number` returns the count of active filters (regions set non-empty counts 1, difficulties set non-empty counts 1, favouritesOnly true counts 1 → max 3)
- [ ] New getter `availableRegions: string[]` returns unique sorted list of `beach.region` from loaded beaches
- [ ] New getter `availableDifficulties: string[]` returns unique sorted list of `beach.skillLevel` from loaded beaches
- [ ] New action `hydrateSettings()` reads `selectedRegions`, `selectedDifficulties`, and `showFavouritesOnly` from `db.settings` and populates state (gracefully handles missing/invalid values — defaults to empty Sets / false)
- [ ] Typecheck passes (`cd ui && yarn typecheck`)

**Notes:** Use the existing `db.settings` table (already declared in `ui/src/db.ts`). Store Sets as arrays via `Array.from(set)` since IndexedDB does not serialise native `Set`. The filter logic lives entirely in the `displayedBeaches` getter — do not mutate `beaches`.

### US-002: Hydrate persisted filters on app startup
**Description:** As a user, I want my previously selected filters to still be applied when I reopen the app.

**Acceptance Criteria:**
- [ ] `App.vue` (or wherever `hydrateFavourites` is currently invoked) also calls `beachStore.hydrateSettings()` on mount, before or alongside `hydrateFavourites()`
- [ ] If no settings exist in IndexedDB yet, hydration silently succeeds with default empty filters
- [ ] Hydration errors are caught and logged to the console (do not break the app)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: toggle filters, reload the page, confirm filters remain applied

**Notes:** Find the existing `hydrateFavourites` call site (search `hydrateFavourites(` in the `ui/src` tree) and mirror the pattern.

### US-003: Build the filter bottom sheet UI
**Description:** As a user, I want a bottom sheet with clear checkboxes for each region and difficulty so I can pick multiple values.

**Acceptance Criteria:**
- [ ] New component `ui/src/components/FilterSheet.vue` (Vue SFC, NOT a Lit component) that wraps `<surf-bottom-sheet>` and accepts `:open` and `@close` via v-model or prop + event pattern consistent with the existing codebase
- [ ] Sheet has a title "Filters"
- [ ] Inside the sheet, two sections stacked vertically:
  1. "Region" — a list of checkbox rows, one per value in `beachStore.availableRegions`. Each checkbox reflects whether that region is in `beachStore.selectedRegions`; clicking calls `beachStore.toggleRegion(region)`
  2. "Difficulty" — same pattern against `availableDifficulties` / `toggleDifficulty` / `selectedDifficulties`. Values are lowercased from data; display them capitalised for UI (e.g., "Beginner" not "beginner")
- [ ] Each row is tappable (clicking the label toggles the checkbox) with a minimum 44px touch target
- [ ] Sheet has a footer with two buttons: "Clear all" (calls `beachStore.clearFilters()`, does NOT close the sheet) and "Done" (emits `close`)
- [ ] Sheet opens and closes smoothly using the existing `surf-bottom-sheet` transition
- [ ] When `beachStore.availableRegions` or `availableDifficulties` is empty (e.g., beaches not loaded yet), show a short "No options available" message in that section
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: open the sheet, toggle some checkboxes, confirm the list behind the sheet updates live

**Notes:** The favourites-only toggle stays in the header (as today) — it is NOT inside this sheet. Use native `<input type="checkbox">` with custom styling via scoped SCSS; no new Lit component.

### US-004: Add filter button to HomeView header with active-count indicator
**Description:** As a user, I want a clearly marked filter button in the header that shows when filters are active.

**Acceptance Criteria:**
- [ ] New button added to `HomeView.vue` header, placed **between** the favourites toggle (`.fav-filter-btn`) and the install button (`.install-btn`)
- [ ] Button uses `<surf-icon name="sliders-horizontal">` (or `"filter"` if `sliders-horizontal` is not available in lucide — check and pick one)
- [ ] Button has `aria-label="Open filters"` and minimum 44px touch target, matching the style of the adjacent header buttons
- [ ] When `beachStore.activeFilterCount > 0`, a small badge (a coloured dot OR a numeric badge showing the count) is rendered over the icon. Use an existing accent colour token (e.g., `--color-surf-very-good` or `--color-primary` if defined) — pick whichever reads clearly against the header
- [ ] Clicking the button sets a local `ref` `filterSheetOpen = ref(false)` to `true`, rendering the `<FilterSheet>` from US-003 with `:open="filterSheetOpen"` and `@close="filterSheetOpen = false"`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: click the button, sheet opens; select a region; close the sheet; badge appears on the filter button; list is filtered

**Notes:** Do not restyle the other header buttons — only add the new one using a consistent pattern. The favourites-only toggle continues to count toward `activeFilterCount` even though its control lives outside the sheet.

### US-005: Empty state when filters exclude every beach
**Description:** As a user, when my filters match no beaches, I want a clear message and a one-tap way to clear filters.

**Acceptance Criteria:**
- [ ] In `HomeView.vue`, when `beachStore.beaches.length > 0` AND `beachStore.displayedBeaches.length === 0` AND `beachStore.activeFilterCount > 0` AND the list is NOT in the existing favourites-only-empty state, render a new empty state block
- [ ] Empty state matches the visual pattern of the existing favourites empty state: centred `<surf-icon name="sliders-horizontal">` (or same icon as the filter button), an `<h2>` reading "No beaches match your filters", a `<p>` reading "Try removing a filter or clearing them all", and a `<surf-button variant="secondary">` labelled "Clear filters" that calls `beachStore.clearFilters()`
- [ ] The existing favourites-only empty state continues to take precedence when only the favourites filter is active and it alone produces zero results (no regression)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: enable a region filter that excludes all beaches (e.g., pick a region, then also pick a difficulty that no beach in that region has); confirm the empty state shows; click "Clear filters"; full list returns

**Notes:** The condition ordering matters — favourites-only empty state should still fire on its own as today; the new state fires when any OTHER filter contributes to the emptiness.

---

## Functional Requirements

- FR-1: `beachStore` exposes `selectedRegions`, `selectedDifficulties`, `showFavouritesOnly` state with persistence to `db.settings`
- FR-2: `displayedBeaches` applies region, difficulty, and favourites filters with AND across filters and OR within each filter
- FR-3: `beachStore.hydrateSettings()` restores persisted filters on app startup
- FR-4: A `FilterSheet.vue` component, built on `<surf-bottom-sheet>`, renders multi-select checkboxes for region and difficulty with a "Clear all" and "Done" footer
- FR-5: A filter button in the HomeView header opens the sheet and displays an indicator when any filter is active
- FR-6: A dedicated empty state appears when active filters exclude all beaches, with a "Clear filters" action

---

## Non-Goals

- No sort controls (sorting by score remains the default and only option in MVP)
- No filter by tag, orientation, swell window, or any other beach attribute
- No URL-state syncing for filters (persistence is IndexedDB only)
- No filter for "online/offline data staleness"
- No search-by-name input
- No filter presets ("Good for today", "Beginner-friendly", etc.)
- No analytics / tracking of filter usage
- No multi-region grouping (e.g., "Aegean Islands" as a super-region)
- No redesign of the favourites-only toggle or its placement
- No new Lit components — `FilterSheet` is a Vue SFC that uses existing Lit primitives

---

## Design Considerations

- Reuse existing primitives: `surf-bottom-sheet`, `surf-button`, `surf-icon`, `surf-badge`, native checkboxes with scoped SCSS
- Match the header button style already established for the favourites toggle, install button, and refresh button (transparent background, `var(--space-2)` padding, 44x44 touch target)
- Active-filter indicator should be visually subtle — a small coloured dot in the top-right of the icon reads well on mobile; a numeric pill is acceptable if it matches existing patterns
- Checkboxes in the sheet should capitalise the first letter of values for display even when stored lowercased (`beginner` → `Beginner`)
- Empty state styling should mirror the existing favourites empty state for visual consistency

---

## Technical Considerations

- `db.settings` (Dexie table with `key` primary key) is already declared — no schema migration required
- Sets are not serialisable to IndexedDB; always store as arrays and convert on hydrate
- `hydrateSettings` must be defensive: the stored value might be missing, null, or (from a prior bad write) not an array — default to empty Set in any non-array case
- Filter options are derived from `beachStore.beaches`, so the sheet must handle the "beaches not yet loaded" case gracefully
- `vue-tsc` typechecking via `cd ui && yarn typecheck`
- To test in browser during dev mode: `docker compose up`, open http://localhost:5173

---

## Success Metrics

- User can apply region and difficulty filters, reload the page, and see the same filters still active
- User can clear all filters in one tap from either the sheet footer or the empty-state button
- No regression: favourites-only toggle continues to work and combines correctly with region/difficulty filters
- Typecheck passes; no console errors on filter interactions or app startup

---

## Open Questions

- Should the filter button show the active count as a number ("2") or just a dot? (Default: dot for MVP; revisit if users want more information at a glance)
- Should "Clear all" in the sheet also close the sheet automatically? (Default: no — user may want to immediately re-pick different filters)
- Should we add a "recently used" section to the sheet? (Defer — overkill for 8 beaches)
