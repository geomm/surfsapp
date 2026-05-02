# PRD: Phase 10 — PWA Installation

## Introduction

Phase 10 makes surfsapp installable as a native-feeling app on desktop (Chrome, Edge), Android (Chrome), and iOS Safari. The Phase 9 service worker is already registered, but the manifest is minimal and no icons exist. This phase generates a placeholder icon asset set, expands the manifest, adds iOS-specific meta tags and splash screens, and adds a custom "Install app" prompt UI triggered via the `beforeinstallprompt` event.

---

## Goals

- Generate a full icon asset set: 192/512 standard, 192/512 maskable, favicon.ico, apple-touch-icon 180x180
- Expand the Vite PWA manifest with icons, description, scope, start_url, orientation, categories
- Add iOS-specific meta tags and splash screens for a polished standalone experience on iPhone/iPad
- Add an "Install app" button in the home header that triggers the native install prompt (where supported)
- App is installable on Chrome/Edge (desktop), Chrome (Android), and Safari (iOS) via "Add to Home Screen"

---

## User Stories

### US-001: Generate placeholder icon asset set

**Description:** As a developer, I need a consistent set of app icons so the manifest can reference real image files.

**Acceptance Criteria:**

- [ ] Install `@vite-pwa/assets-generator` as a dev dependency via `yarn add -D @vite-pwa/assets-generator` in `ui/`
- [ ] Create `ui/public/logo.svg` — a simple placeholder: a blue rounded-square background (`#65dfbf`) with a stylised white wave silhouette (3-line wave or single curve) centered, 512x512 viewBox; no text
- [ ] Create `ui/pwa-assets.config.ts` using the `createAppIconsOnlyPreset` from `@vite-pwa/assets-generator/config` with source image `public/logo.svg`
- [ ] Add script to `ui/package.json`: `"generate-pwa-assets": "pwa-assets-generator"`
- [ ] Run the generator (`yarn generate-pwa-assets`) to output into `ui/public/`: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-192x192.png`, `pwa-maskable-512x512.png`, `favicon.ico`, `apple-touch-icon-180x180.png`
- [ ] Generated PNG files committed to the repo
- [ ] Typecheck passes

**Notes:** Use a hand-written SVG source for the logo — keep it under 50 lines, no gradients, clean geometric shapes. The generator handles producing all PNG sizes and the maskable variants (with safe-area padding).

### US-002: Expand PWA manifest

**Description:** As a user, I want the installed app to show a proper icon, name, and metadata so it feels like a native app.

**Acceptance Criteria:**

- [ ] `ui/vite.config.ts` manifest config expanded with:
  - `name: 'surfsapp — Greek Surf Conditions'`
  - `short_name: 'surfsapp'`
  - `description: 'Surf conditions and forecasts for beaches across Greece. Offline-ready.'`
  - `theme_color: '#65dfbf'`
  - `background_color: '#ffffff'`
  - `display: 'standalone'`
  - `orientation: 'portrait'`
  - `scope: '/'`
  - `start_url: '/'`
  - `categories: ['sports', 'weather', 'travel']`
  - `lang: 'en'`
  - `icons` array with four entries: pwa-192x192.png (any purpose, 192x192, image/png), pwa-512x512.png (any, 512x512, image/png), pwa-maskable-192x192.png (maskable, 192x192, image/png), pwa-maskable-512x512.png (maskable, 512x512, image/png)
- [ ] Manifest validates in Chrome DevTools → Application → Manifest with no errors or warnings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (check Application tab shows all icons loaded and no manifest errors)

### US-003: Add iOS-specific meta tags and favicon

**Description:** As an iOS user, I want "Add to Home Screen" to use the correct icon and launch the app in standalone mode.

**Acceptance Criteria:**

- [ ] `ui/index.html` `<head>` updated with:
  - `<link rel="icon" href="/favicon.ico" sizes="48x48">`
  - `<link rel="icon" href="/logo.svg" type="image/svg+xml">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `<meta name="apple-mobile-web-app-title" content="surfsapp">`
  - `<meta name="theme-color" content="#65dfbf">`
  - `<meta name="description" content="Surf conditions and forecasts for beaches across Greece. Offline-ready.">`
- [ ] Existing `<title>` and viewport meta tags preserved
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (inspect `<head>` and confirm all meta tags are present)

### US-004: Generate iOS splash screens

**Description:** As an iOS user, I want a polished splash screen when launching the installed app so it feels native.

**Acceptance Criteria:**

- [ ] Update `ui/pwa-assets.config.ts` to use `createAppIconsAndSplashScreensPreset` (or equivalent) so the generator also produces iOS splash screens
- [ ] Re-run `yarn generate-pwa-assets` to output splash screen PNGs in `ui/public/` for at least: iPhone 14/15 (1170x2532), iPhone 14/15 Pro Max (1290x2796), iPad 10.9" (1640x2360), iPad Pro 12.9" (2048x2732) — both portrait orientation
- [ ] `ui/index.html` `<head>` updated with `<link rel="apple-touch-startup-image" ...>` entries for each generated splash screen size, each with a matching `media` query for the target device (e.g., `(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)`)
- [ ] Generated splash PNG files committed to the repo
- [ ] Typecheck passes
- [ ] Verify in browser: the generated splash files exist at the expected public paths

**Notes:** The `@vite-pwa/assets-generator` output includes an HTML snippet for the splash `<link>` tags — copy it verbatim into `index.html` rather than hand-writing. Splash screens only activate when the app is launched from the home screen on iOS.

### US-005: Install prompt composable and "Install app" button

**Description:** As a user, I want a clear "Install app" button so I can add surfsapp to my home screen without hunting through the browser menu.

**Acceptance Criteria:**

- [ ] `ui/src/composables/useInstallPrompt.ts` created:
  - Exports `canInstall` (reactive boolean ref, true when a `beforeinstallprompt` event has been captured)
  - Exports `promptInstall` (function that calls `prompt()` on the captured event, awaits `userChoice`, then clears the captured event)
  - Listens for `beforeinstallprompt` on `window` and prevents default to stash the event
  - Listens for `appinstalled` event to clear `canInstall`
  - Cleans up listeners via `onScopeDispose`
- [ ] `HomeView.vue` header gets a new button: `<surf-icon name="download">` (or `plus` if download not available) in a `surf-button` style, visible only when `canInstall.value === true`, placed between the favourites toggle and the refresh button
- [ ] Button has `aria-label="Install app"` and a text tooltip on hover
- [ ] Clicking the button calls `promptInstall()`; after user choice the button is hidden (since the event is single-use)
- [ ] Button is NOT shown when the app is already running in standalone mode (`window.matchMedia('(display-mode: standalone)').matches === true`)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill (in Chrome DevTools use Application → Manifest → "Add to homescreen" link to test)

**Notes:** `beforeinstallprompt` only fires in Chromium browsers (Chrome, Edge, Samsung Internet). Safari/iOS don't fire it — users must use the browser share menu. That's expected; the button simply won't appear on iOS.

---

## Functional Requirements

- FR-1: Full icon asset set exists in `ui/public/` (standard + maskable PNGs, favicon, apple-touch-icon)
- FR-2: PWA manifest includes name, description, icons, theme, scope, start_url, orientation, categories
- FR-3: `index.html` `<head>` includes iOS-specific meta tags, favicon links, and apple-touch-icon link
- FR-4: iOS splash screens exist for major device sizes and are referenced in `index.html`
- FR-5: A reactive `useInstallPrompt` composable captures `beforeinstallprompt` and exposes `canInstall` + `promptInstall`
- FR-6: HomeView header shows an "Install app" button only when the event has been captured and the app is not already installed
- FR-7: App passes Chrome Lighthouse PWA "Installable" audit

---

## Non-Goals

- No app store submission (Capacitor wrapping comes in a later phase)
- No custom app store assets (screenshots, promotional graphics)
- No deep linking or URL handlers beyond the default `scope: '/'`
- No web share target or file handlers (future)
- No custom splash screen on Android (manifest `background_color` + `theme_color` + icon handle this automatically)
- No user-facing first-install onboarding flow
- No tracking of install rate (no analytics in MVP)
- No dynamic icon variants (light/dark mode icons)

---

## Design Considerations

- Placeholder icon: blue rounded-square background with white wave silhouette — clean, recognisable, swappable later
- Install button: use `surf-icon name="download"` inside a `surf-button` (or plain icon button matching the favourites toggle style) — don't introduce a new component
- Install button placement: between favourites toggle and refresh button in the home header
- Splash screen: use default preset from `@vite-pwa/assets-generator` (logo centered on `background_color`)

---

## Technical Considerations

- `@vite-pwa/assets-generator` handles both icons and splash screens via presets — avoid hand-crafting PNG sizes
- Commit generated PNGs to the repo (don't regenerate at build time) — they rarely change and keeping them in git makes reviews easier
- `beforeinstallprompt` fires once per page session; the captured event is single-use (calling `prompt()` consumes it)
- `display: 'standalone'` hides browser chrome; `display_override` with `['window-controls-overlay']` could enable custom title bars later
- PWA install is only triggered when the site meets Chrome's install criteria: served over HTTPS (or localhost), valid manifest with required icons, registered service worker — all satisfied by Phase 9
- iOS Safari only honours `apple-touch-icon` and splash `<link>` tags — not the manifest icons array (until iOS 16.4+ which partially supports manifests)
- `vue-tsc` typechecking via `cd ui && yarn typecheck`
- Test the install flow locally with `yarn build && yarn preview` since the service worker requires a production build

---

## Success Metrics

- Chrome DevTools Lighthouse PWA audit: "Installable" passes with no errors
- Chrome desktop install prompt works (install icon appears in address bar; clicking the in-app Install button triggers the native prompt)
- Android Chrome "Add to Home Screen" banner works; launched app runs in standalone mode with the app icon
- iOS Safari "Add to Home Screen" produces an icon with the correct image and launches the app in standalone mode (no browser chrome)
- No manifest validation warnings in Chrome DevTools → Application → Manifest

---

## Open Questions

- Should the install prompt button be dismissible (hide for N days after dismissal)? (Defer — just a single session-level button)
- Should we add dark-mode icon variants? (Defer — single icon works for MVP)
- Should we add `display_override` for window controls overlay on desktop? (Defer — standalone is fine for MVP)
