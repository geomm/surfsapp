# PRD: Phase 12 — Mobile Polish

## Introduction

Phase 12 is a focused polish pass to make surfsapp feel native on mobile — especially iOS Safari in standalone (installed) mode. It covers safe-area insets so content isn't cut off by the iOS notch/Dynamic Island or home indicator, tap/scroll behaviour tuning to eliminate browser quirks (tap highlight flash, tap delay, overscroll bounce), a standalone-mode CSS branch to handle the iOS status bar when the PWA is installed, skeleton loading states in place of plain "Loading…" text, clearer error states, and an audit of landscape layouts so rotating the phone before install doesn't break anything. Priority order: iOS Safari first, Android Chrome second. No haptic feedback; manifest stays portrait-locked.

---

## Goals

- Content (headers, scrollable regions, bottom sheets) respects iOS safe-area insets via `viewport-fit=cover` + `env(safe-area-inset-*)`
- Taps feel instantaneous: no tap highlight flash, no 300ms delay, no unintended text selection on rapid taps
- Scrolling feels native: no conflicting browser pull-to-refresh, no white-flash on overscroll in standalone mode
- Installed (PWA standalone) mode clears the iOS status bar cleanly without content overlap
- Loading states use animated skeleton placeholders that mirror the final layout rather than a bare "Loading…" string
- Error states show an icon, a friendly message, and a clear retry action — no more raw stack-trace-style strings
- Landscape layouts render without obvious breakage on iPhone/iPad landscape viewports

---

## User Stories

### US-001: Safe-area + global tap/scroll foundation
**Description:** As a developer, I need a baseline set of mobile-friendly CSS rules and a viewport config that enables safe-area insets, so every subsequent view can rely on them.

**Acceptance Criteria:**
- [ ] `ui/index.html` viewport meta tag updated to `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` — without this, `env(safe-area-inset-*)` always resolves to 0 on iOS
- [ ] `ui/src/styles/base/_base.scss` `body` selector gains: `-webkit-tap-highlight-color: transparent;`, `-webkit-text-size-adjust: 100%;`, `text-size-adjust: 100%;`, `overscroll-behavior-y: none;`
- [ ] `_base.scss` gains a `button` reset adding `-webkit-tap-highlight-color: transparent;` and `touch-action: manipulation;` (eliminates 300ms double-tap delay and the grey tap flash)
- [ ] Existing body rules (`font-family`, `font-size`, `background-color`, `color`) are preserved
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: open the app, tap a beach card rapidly — no grey flash, no zoom — and confirm the document root now has a viewport that supports safe-area (inspect `<meta name="viewport">`)

**Notes:** `touch-action: manipulation` is the right default on buttons (allows pan/zoom at the page level but kills double-tap zoom on the element itself). Do NOT put `touch-action: none` globally — that would break our custom pull-to-refresh gesture.

### US-002: Apply safe-area insets to HomeView and BeachDetailView
**Description:** As a user on iPhone with a notch, I want the app header and bottom content not to sit under the Dynamic Island/notch or home indicator.

**Acceptance Criteria:**
- [ ] `HomeView.vue` `.header` padding-top adjusted so it respects `env(safe-area-inset-top)` in addition to the existing `var(--space-4)` — use `padding-top: calc(var(--space-4) + env(safe-area-inset-top));`
- [ ] `HomeView.vue` `.content` padding-bottom adjusted to include `env(safe-area-inset-bottom)` — use `padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));`
- [ ] `HomeView.vue` `.header` also gains `padding-left: calc(var(--space-4) + env(safe-area-inset-left));` and `padding-right: calc(var(--space-4) + env(safe-area-inset-right));` for landscape notch safety
- [ ] Same three adjustments applied to `BeachDetailView.vue` `.header` and `.content`
- [ ] Existing max-width/margin/layout rules preserved — only padding values change
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: use Chrome DevTools to emulate an iPhone 14 Pro (has safe-area); confirm the header and content stay clear of the status bar area and the bottom of the viewport

**Notes:** Chrome DevTools' "Dimensions: Responsive" lets you toggle safe-area overlays — or test with `iPhone 14 Pro` preset which simulates the insets.

### US-003: Safe-area for bottom sheets and FilterSheet footer
**Description:** As a user, I want bottom sheets not to bury their footer buttons under the iOS home indicator.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/surf-bottom-sheet.ts` `.sheet` padding adjusted so the bottom padding includes `env(safe-area-inset-bottom)` — use `padding: var(--space-4);` then `padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));`
- [ ] `ui/src/components/FilterSheet.vue` — verify its Done/Clear-all footer does NOT get obscured; if the sheet itself now pads correctly, no further change is needed. If the footer is absolutely positioned, it must also honour `env(safe-area-inset-bottom)`
- [ ] Backdrop full-screen styling unchanged
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: emulate iPhone 14 Pro, open the filter sheet; the Done/Clear all buttons sit above the simulated home indicator area, not under it

**Notes:** Depends on US-001 (viewport-fit=cover must be in place for env() to return non-zero values).

### US-004: Standalone-mode CSS for iOS status bar clearance
**Description:** As a user who installed surfsapp on iOS, I want the header to clear the iOS status bar cleanly instead of sitting under it when launching the installed app.

**Acceptance Criteria:**
- [ ] `_base.scss` (or a new dedicated partial imported from `main.scss`) adds an `@media all and (display-mode: standalone)` block
- [ ] Inside the block, the `.header` class (or a shared `header` element selector, depending on the existing cascade) gets extra top padding sufficient to clear the iOS status bar. Since US-002 already adds `env(safe-area-inset-top)`, the standalone branch should ADD a small additional `var(--space-2)` buffer so the header content sits visually centred below the status bar, not flush against it
- [ ] The standalone block must only apply when the app is launched from the home screen (in standalone mode) — confirmed by inspecting the computed style in regular Safari/Chrome where the extra padding is NOT applied
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: open Chrome DevTools Rendering panel → "Emulate CSS media feature display-mode" → set to `standalone`; confirm the extra header padding applies. Toggle back to `browser`; confirm it does NOT apply

**Notes:** iOS Safari doesn't expose a "standalone" preview inside the browser, but the CSS media query works in any Chromium browser when emulated. On real iOS, this only kicks in after the user taps Add to Home Screen.

### US-005: Skeleton loading states for HomeView and BeachDetailView
**Description:** As a user waiting for data, I want a skeleton that mirrors the final layout so the screen feels responsive and intentional, not blank.

**Acceptance Criteria:**
- [ ] `HomeView.vue` loading state (currently `<div v-if="beachStore.loading" class="state">Loading…</div>`) replaced with a list of 4 skeleton cards that approximate the real beach-card layout: a title-width bar, a region-width bar, a badge-sized bar, and a conditions-line bar
- [ ] `BeachDetailView.vue` loading state replaced with a hero skeleton: a name-width bar, a region-width bar, a score-width bar, and 2-3 lines for the reasons section
- [ ] Skeleton bars animate with a subtle pulse or shimmer (CSS `@keyframes`, roughly 1.5s loop) using existing tokens — `var(--color-neutral-200)` and `var(--color-neutral-300)` are likely candidates (check `ui/src/styles/tokens/_colors.scss` for available neutrals)
- [ ] Skeletons use `aria-busy="true"` and `aria-live="polite"` on their container, with the visible bars marked `aria-hidden="true"`, so screen readers don't read the placeholders
- [ ] No new Lit component needed — skeletons are inline Vue markup with scoped styles
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: throttle the network to Slow 3G in DevTools → reload the home page; the skeleton cards appear until data arrives, then are replaced by real cards. Repeat for a beach detail page

**Notes:** Keep the animation subtle — a gentle opacity or background-position shimmer is enough. Heavy animation is distracting on mobile.

### US-006: Polished error states for HomeView and BeachDetailView
**Description:** As a user who hits a network or data error, I want a clear visual and a one-tap retry rather than a raw error string.

**Acceptance Criteria:**
- [ ] `HomeView.vue` error state (the `<div v-else-if="beachStore.error" class="state">` block) restructured to mirror the existing `.empty-state` visual pattern: a centred `<surf-icon name="cloud-off">` (register this icon in `surf-icon.ts` if missing, importing from lucide), an `<h2>` reading "Can't load beaches", a `<p>` reading a shortened, user-friendly version of the error (e.g. `beachStore.error` if it's a string — but do not show "Error:" prefixes or stack traces), and the existing Retry `surf-button`
- [ ] `BeachDetailView.vue` error state (`<div v-else-if="beachStore.detailError">`) restructured with the same pattern: `cloud-off` icon, "Can't load this beach" heading, the friendly error line, and a Retry button
- [ ] The raw error string remains accessible — it is still rendered but inside the paragraph rather than a top-level `<p class="error">`; any styling should de-emphasise it (smaller font, secondary colour)
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: stop the backend (`docker compose stop backend`); reload the home page; confirm the new error state appears with icon + message + Retry button. Restart backend, tap Retry; list loads. Repeat for a beach detail page

**Notes:** The lucide icon name is `cloud-off`. If it's not already registered, add it to `surf-icon.ts`'s icon map.

### US-007: Landscape audit and fixes
**Description:** As a user who rotates their phone before installing, I want the app not to break obviously in landscape.

**Acceptance Criteria:**
- [ ] Using Chrome DevTools device mode, verify HomeView at 812x375 (iPhone X landscape) and 926x428 (iPhone 14 Pro Max landscape): header stays on one row, cards flow correctly, scroll works, filter sheet opens without clipping
- [ ] Verify BeachDetailView at the same viewports: hero layout doesn't clip, reasons disclosure expands correctly, the map renders at a sensible height (may need `max-height: 40vh` on `.beach-map-wrap` if it currently explodes in landscape — add this rule only if a break is observed), ForecastStrip remains horizontally scrollable
- [ ] Verify FilterSheet at the same viewports: sheet still renders with a reasonable max-height (`max-height: 85vh` already set on `surf-bottom-sheet`); if checkbox rows become cramped, add a small `max-width: 480px; margin: 0 auto;` on the inner container
- [ ] Fix any obvious breakage uncovered by the checks above. Document every fix in the commit with a one-line reason
- [ ] If no breakage is found, the commit message should say "Phase 12 landscape audit — no changes required"
- [ ] Typecheck passes (`cd ui && yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: toggle DevTools device mode to landscape for both iPhone X and iPhone 14 Pro Max; visually confirm all three surfaces render sensibly

**Notes:** Manifest stays `orientation: 'portrait'` — landscape is a soft-support scenario for pre-install users only. Don't over-invest here.

---

## Functional Requirements

- FR-1: `index.html` includes `viewport-fit=cover` in the viewport meta tag
- FR-2: Global CSS sets `-webkit-tap-highlight-color: transparent`, `text-size-adjust: 100%`, `overscroll-behavior-y: none`, and `touch-action: manipulation` on buttons
- FR-3: `HomeView` and `BeachDetailView` headers and content containers apply `env(safe-area-inset-*)` to their padding
- FR-4: `surf-bottom-sheet` reserves `env(safe-area-inset-bottom)` in its bottom padding
- FR-5: A `@media (display-mode: standalone)` block adds extra top padding to headers so the iOS status bar is visually cleared
- FR-6: `HomeView` and `BeachDetailView` loading states render animated skeleton placeholders that match the final layout
- FR-7: `HomeView` and `BeachDetailView` error states render an icon, a friendly message, the error detail, and a Retry button
- FR-8: The app layouts do not visibly break at iPhone landscape viewports (812x375 and 926x428)

---

## Non-Goals

- No haptic feedback (`navigator.vibrate`) — unreliable on iOS, skipped intentionally
- No orientation change beyond the existing portrait lock in the manifest
- No change to the pull-to-refresh gesture (it stays as is — only ensure CSS doesn't conflict)
- No new Lit components
- No redesign of navigation structure (no bottom nav, no tabs)
- No performance optimisation (lazy loading the map, code splitting, etc.) — separate phase
- No dark mode toggle or theme changes
- No accessibility audit beyond what safe-area and aria-busy already require — covered in a later phase
- No animated page transitions between home and detail
- No iOS splash-screen regeneration (already done in Phase 10)

---

## Design Considerations

- Skeleton placeholders should use `var(--color-neutral-200)` (base) and `var(--color-neutral-300)` (shimmer) — verify token names in `ui/src/styles/tokens/_colors.scss`; fall back to the closest neutrals if those exact tokens don't exist
- Error state icon: `cloud-off` (a disconnected cloud, reads as "no network" or "no data"); keep icon size 48px to match the favourites empty-state icon
- Header extra padding in standalone mode: `var(--space-2)` above the safe-area inset is enough — more would waste screen real estate
- Do NOT introduce a new design token for the skeleton pulse colour — compose from existing neutrals

---

## Technical Considerations

- `env(safe-area-inset-*)` returns 0 unless `viewport-fit=cover` is set in the viewport meta — US-001 must land first
- The `display-mode: standalone` media query is a browser-supported CSS feature and does not require JS
- `overscroll-behavior-y: none` on `body` prevents iOS "rubber-band" overscroll that reveals a blank area — essential in standalone mode where the body background is visible
- `touch-action: manipulation` is correct on buttons; never apply `touch-action: none` globally — breaks the custom pull-to-refresh
- Test with DevTools' Emulate CSS media feature for `display-mode` and with iPhone preset for safe-area insets
- `vue-tsc` typechecking via `cd ui && yarn typecheck`
- Dev testing: `docker compose up`; production PWA testing (required to install and see real standalone mode on a device): `docker compose run --rm --service-ports ui sh -c "yarn build && yarn preview"`; mobile HTTPS testing: `cloudflared tunnel --url http://localhost:5173`

---

## Success Metrics

- On a notched iOS device (real or emulated), header content clears the Dynamic Island / status bar; bottom-sheet footer clears the home indicator
- Tapping a button does not flash the grey iOS/Android tap highlight
- Double-tapping a button does not zoom the page
- Loading a slow network shows a skeleton instead of "Loading…"
- Stopping the backend then loading a page shows the new error state with icon + Retry
- No layout clipping at iPhone X landscape (812x375) or iPhone 14 Pro Max landscape (926x428)
- Typecheck remains clean

---

## Open Questions

- Should the skeleton animation respect `prefers-reduced-motion`? (Default: yes — add a `@media (prefers-reduced-motion: reduce)` branch that disables the animation if we're already touching the file; revisit if it adds scope)
- Should the error state message be localised / i18n-ready? (Defer — English-only MVP)
- Should we add a visible "offline" indicator banner to the error state when `navigator.onLine === false`? (Defer — Phase 9 already handles offline caching; one layer of offline UX is enough for MVP)
