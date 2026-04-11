# PRD: Phase 8 — Favourites (Persistent + Filter)

## Introduction

Phase 8 makes favourites persistent and filterable. Currently, favourites live in an in-memory Pinia `Set<string>` and are lost on page refresh. This phase introduces Dexie (IndexedDB wrapper) to persist favourites and a general settings table, adds a toggle/switch in the home header to filter the listing to favourites only, and provides an illustrated empty state when no favourites are saved.

---

## Goals

- Install Dexie and create the app's IndexedDB database with `favourites` and `settings` tables
- Persist favourite beach IDs across sessions via IndexedDB
- Hydrate Pinia favourites from IndexedDB on app startup
- Add a "Favourites only" toggle in the home view header bar
- Show an illustrated empty state when the favourites filter is active but no favourites exist
- Keep Pinia as the single source of truth — Dexie syncs in the background

---

## User Stories

### US-001: Install Dexie and create database schema
**Description:** As a developer, I need an IndexedDB database so the app can persist data across sessions.

**Acceptance Criteria:**
- [ ] `dexie` installed via `yarn add dexie` in `ui/`
- [ ] `ui/src/db.ts` created, exporting a Dexie subclass instance named `db`
- [ ] Database name: `surfsapp`
- [ ] Version 1 schema with two tables: `favourites` (primary key `beachId: string`) and `settings` (primary key `key: string`, value field `value: any`)
- [ ] TypeScript interfaces defined: `FavouriteRecord { beachId: string }` and `SettingRecord { key: string; value: unknown }`
- [ ] Tables typed on the Dexie subclass so `db.favourites` and `db.settings` are fully typed
- [ ] Typecheck passes

### US-002: Persist favourites to IndexedDB on toggle
**Description:** As a user, I want my favourite beaches to be remembered so they survive page refreshes and app restarts.

**Acceptance Criteria:**
- [ ] `beachStore.toggleFavourite(beachId)` updated: after toggling the in-memory Set, write to IndexedDB — `db.favourites.put({ beachId })` on add, `db.favourites.delete(beachId)` on remove
- [ ] IndexedDB write is fire-and-forget (no `await` blocking the UI) but errors are caught and logged via `console.error`
- [ ] Pinia remains the immediate source of truth — UI reacts to the Set, not to IndexedDB directly
- [ ] Typecheck passes

### US-003: Hydrate favourites from IndexedDB on app startup
**Description:** As a user, I want my previously saved favourites to appear immediately when I open the app.

**Acceptance Criteria:**
- [ ] New action `hydrateFavourites()` added to `beachStore`: reads all records from `db.favourites`, populates the in-memory `favourites` Set
- [ ] `hydrateFavourites()` called in `App.vue` `onMounted` (or in the store's initialization) so it runs once on app startup before the first render completes
- [ ] If IndexedDB read fails, log the error and continue with an empty Set (graceful degradation)
- [ ] After hydration, favourited hearts on both HomeView and BeachDetailView show as filled immediately
- [ ] Typecheck passes
- [ ] Verify in browser: favourite a beach, refresh the page, confirm the heart is still filled

### US-004: Favourites-only toggle in home header
**Description:** As a user, I want a quick toggle to filter the beach listing to only my favourites so I can focus on the beaches I care about.

**Acceptance Criteria:**
- [ ] A toggle/switch added to the home header bar, between the title and the refresh button
- [ ] Toggle uses a `<surf-icon name="heart">` with a label "Favs" (or just the icon if space is tight) — ≥44x44px touch target
- [ ] Toggle has two visual states: inactive (default, `--color-text-secondary`) and active (filled, `--color-surf-poor` red)
- [ ] New state `showFavouritesOnly: boolean` (default `false`) added to `beachStore`
- [ ] New getter `displayedBeaches` added to `beachStore`: returns `sortedBeaches` filtered to only favourites when `showFavouritesOnly` is true, otherwise returns all `sortedBeaches`
- [ ] New action `toggleFavouritesFilter()` toggles `showFavouritesOnly`
- [ ] HomeView `v-for` updated to iterate over `beachStore.displayedBeaches` instead of `beachStore.sortedBeaches`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Empty state for favourites filter
**Description:** As a user, I want a helpful message when I filter to favourites but haven't saved any yet, so I know what to do.

**Acceptance Criteria:**
- [ ] When `showFavouritesOnly` is true and `displayedBeaches` is empty, show an empty state block instead of the beach list
- [ ] Empty state contains: a `<surf-icon name="heart">` rendered large (48px, `--color-text-secondary`), a heading "No favourites yet" (`--font-size-lg`, `--font-weight-semibold`), a subtext "Tap the heart on any beach to save it here" (`--font-size-sm`, `--color-text-secondary`), and a `<surf-button>` labelled "Show all beaches" that calls `beachStore.toggleFavouritesFilter()` to deactivate the filter
- [ ] Empty state is vertically centered in the content area with `--space-6` padding
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- FR-1: Dexie database `surfsapp` with `favourites` and `settings` tables exists and is typed
- FR-2: Toggling a favourite writes/deletes the beach ID in IndexedDB without blocking the UI
- FR-3: On app startup, favourites are hydrated from IndexedDB into the Pinia store
- FR-4: A toggle in the home header filters the beach listing to favourites only
- FR-5: The `displayedBeaches` getter is the single source for the home listing iteration
- FR-6: An illustrated empty state appears when the favourites filter is active with no saved favourites
- FR-7: Favouriting on the detail view is immediately reflected on the home listing (Pinia reactivity)
- FR-8: If IndexedDB is unavailable, the app degrades gracefully to in-memory-only favourites

---

## Non-Goals

- No syncing favourites to a backend or user account (no accounts in MVP)
- No persisting the `showFavouritesOnly` filter state across sessions (Phase 11 will persist filters via the `settings` table)
- No caching beaches or forecasts in IndexedDB (Phase 9 offline work)
- No Dexie live queries or `useLiveQuery` — Pinia is the reactive layer, Dexie is persistence only
- No migration from any prior storage mechanism (there is none)

---

## Design Considerations

- Reuse `surf-icon`, `surf-button` from existing Lit components
- The toggle in the header should feel like a filter chip — subtle when off, prominent when on
- Empty state should be warm and encouraging, not an error state
- Keep the header compact — the toggle sits between the "surfsapp" title and the refresh button

---

## Technical Considerations

- Dexie v4 is the current stable — use `dexie` (not `dexie@next`)
- Dexie adds ~15KB gzipped — acceptable
- Fire-and-forget IndexedDB writes: wrap in `.catch(console.error)` to avoid unhandled rejections
- `hydrateFavourites()` must complete before the first render to avoid a flash of unfavourited hearts — call it early in the app lifecycle (e.g., `App.vue onMounted` with `await`)
- The `settings` table is created now but not used until Phase 11 — creating it early avoids a Dexie version bump later
- `vue-tsc` typechecking via `cd ui && yarn typecheck`

---

## Success Metrics

- Favourites survive a full page refresh (IndexedDB persistence verified)
- Toggle filter responds instantly (<50ms, no network call)
- Empty state is shown correctly when filtering with no favourites
- No console errors from IndexedDB operations under normal usage

---

## Open Questions

- Should the favourites filter state persist across sessions via the `settings` table? (Deferred to Phase 11)
- Should there be a maximum number of favourites? (No — with 8 MVP beaches it's irrelevant)
