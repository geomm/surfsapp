# PRD: Phase 1 — SCSS Design System

## Introduction

Establish the visual foundation for surfsapp by creating a token-based SCSS design system. All colours, spacing, typography, and z-index values are defined as CSS custom properties on `:root` so that every component — Vue templates and Lit Web Components alike — can reference them without hard-coding values. The system is built mobile-first with SCSS utility mixins for breakpoints and focus states. A `/design` preview route lets developers verify tokens visually inside the running app.

---

## Goals

- Define and expose all design tokens as CSS custom properties on `:root`
- Establish a surf-themed colour palette (ocean blues + warm sandy tones) with semantic aliases for surf score labels
- Create a base reset and sensible global defaults
- Provide reusable SCSS mixins for breakpoints and focus-visible states
- Wire everything into a single `main.scss` entry point imported by `main.ts`
- Provide a `/design` preview route for visual verification of all tokens

---

## Colour Palette (defined — not chosen by implementation)

The implementation must use these exact token values:

**Ocean blues (primary brand):**
```
--color-ocean-50:  #e8f4fd
--color-ocean-100: #c3dff8
--color-ocean-200: #90c3f0
--color-ocean-300: #5da7e8
--color-ocean-400: #3490de
--color-ocean-500: #1a72c4   ← primary brand
--color-ocean-600: #1560a8
--color-ocean-700: #0f4d8a
--color-ocean-800: #0a3a6b
--color-ocean-900: #062448
```

**Sandy/warm tones (accent):**
```
--color-sand-50:  #fdf8f0
--color-sand-100: #f8ecda
--color-sand-200: #f0d5ad
--color-sand-300: #e8bc7d
--color-sand-400: #dfa252
--color-sand-500: #c8873a   ← accent
--color-sand-600: #aa6f2c
--color-sand-700: #8a5620
--color-sand-800: #6a3f16
--color-sand-900: #4a2b0e
```

**Neutrals:**
```
--color-neutral-0:   #ffffff
--color-neutral-50:  #f8f9fa
--color-neutral-100: #f1f3f5
--color-neutral-200: #e9ecef
--color-neutral-300: #dee2e6
--color-neutral-400: #ced4da
--color-neutral-500: #adb5bd
--color-neutral-600: #868e96
--color-neutral-700: #495057
--color-neutral-800: #343a40
--color-neutral-900: #212529
```

**Semantic — surf score labels:**
```
--color-surf-very-good: #2d9e5f   (score 80–100, green)
--color-surf-good:      #1a72c4   (score 60–79, ocean blue)
--color-surf-maybe:     #d4a017   (score 40–59, amber)
--color-surf-poor:      #c0392b   (score 0–39, muted red)
```

**Semantic — UI aliases (reference palette tokens, do not hard-code hex):**
```
--color-background:    var(--color-neutral-50)
--color-surface:       var(--color-neutral-0)
--color-text-primary:  var(--color-neutral-900)
--color-text-secondary:var(--color-neutral-600)
--color-border:        var(--color-neutral-200)
--color-primary:       var(--color-ocean-500)
--color-accent:        var(--color-sand-500)
```

---

## Spacing Scale (4px base grid, steps 1–12)

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-7:  28px
--space-8:  32px
--space-9:  36px
--space-10: 40px
--space-11: 44px
--space-12: 48px
```

---

## Typography Scale (system font stack)

**Font family:**
```
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
```

**Font sizes:**
```
--font-size-xs:   0.75rem   (12px)
--font-size-sm:   0.875rem  (14px)
--font-size-md:   1rem      (16px)
--font-size-lg:   1.125rem  (18px)
--font-size-xl:   1.25rem   (20px)
--font-size-2xl:  1.5rem    (24px)
--font-size-3xl:  1.875rem  (30px)
--font-size-4xl:  2.25rem   (36px)
```

**Font weights:**
```
--font-weight-regular:  400
--font-weight-medium:   500
--font-weight-semibold: 600
--font-weight-bold:     700
```

**Line heights:**
```
--line-height-tight:   1.2
--line-height-normal:  1.5
--line-height-relaxed: 1.75
```

---

## Z-Index Scale

```
--z-below:    -1
--z-base:      0
--z-raised:   10
--z-dropdown: 100
--z-overlay:  200
--z-modal:    300
--z-toast:    400
```

---

## Breakpoints (mobile-first)

```
sm:  480px
md:  768px
lg:  1024px
xl:  1280px
```

These are SCSS variables used inside mixins — not CSS custom properties (custom properties cannot be used in `@media` queries).

---

## User Stories

### US-001: SCSS scaffolding and colour tokens
**Description:** As a developer, I want the SCSS directory structure created and colour tokens defined so that all other token and base files have a consistent home.

**Acceptance Criteria:**
- [ ] `sass` package installed as a dev dependency in `ui/` (yarn)
- [ ] `ui/src/styles/` directory created with subdirectories: `tokens/`, `mixins/`, `base/`, `utilities/`
- [ ] `ui/src/styles/tokens/_colors.scss` created, defining all palette tokens (ocean, sand, neutral, surf score semantics, UI aliases) as CSS custom properties inside a `:root {}` block using the exact hex values specified in this PRD
- [ ] No hard-coded hex values appear outside `_colors.scss`
- [ ] Typecheck passes (`yarn typecheck`)

### US-002: Spacing, typography, and z-index tokens
**Description:** As a developer, I want spacing, typography, and z-index values available as CSS custom properties so that all layout and text decisions reference a shared scale.

**Acceptance Criteria:**
- [ ] `ui/src/styles/tokens/_spacing.scss` created, defining `--space-1` through `--space-12` inside `:root {}`
- [ ] `ui/src/styles/tokens/_typography.scss` created, defining `--font-family-base`, all `--font-size-*`, `--font-weight-*`, and `--line-height-*` tokens inside `:root {}`
- [ ] `ui/src/styles/tokens/_z-index.scss` created, defining `--z-below` through `--z-toast` inside `:root {}`
- [ ] Typecheck passes

### US-003: Base reset and global base styles
**Description:** As a developer, I want a CSS reset and sensible global defaults applied so that the browser's user-agent stylesheet does not interfere with the design system.

**Acceptance Criteria:**
- [ ] `ui/src/styles/base/_reset.scss` created with a modern CSS reset: box-sizing border-box on all elements, margin/padding zeroed, `img` and `video` set to `max-width: 100%`
- [ ] `ui/src/styles/base/_base.scss` created with global defaults: `body` uses `--font-family-base`, `--font-size-md`, `--line-height-normal`, `--color-background`, and `--color-text-primary`; `html` sets `font-size: 16px`; `a` inherits colour by default
- [ ] No component-specific styles in these files — only element-level defaults
- [ ] Typecheck passes

### US-004: Utility mixins — breakpoints and focus-visible
**Description:** As a developer, I want reusable SCSS mixins for responsive breakpoints and focus states so I can apply them consistently throughout the codebase.

**Acceptance Criteria:**
- [ ] `ui/src/styles/mixins/_breakpoints.scss` created with a `breakpoint($size)` mixin using mobile-first `min-width` media queries for `sm` (480px), `md` (768px), `lg` (1024px), `xl` (1280px); throws a `@error` for unknown size names
- [ ] `ui/src/styles/mixins/_focus.scss` created with a `focus-visible-ring` mixin that applies a 2px offset outline using `--color-primary` on `:focus-visible`, and removes the outline on `:focus:not(:focus-visible)`
- [ ] Both mixins are implemented as `@mixin` (not output any CSS when imported — only output when `@include`d)
- [ ] Typecheck passes

### US-005: main.scss entry point
**Description:** As a developer, I want a single `main.scss` that imports all token and base files so that one import in `main.ts` loads the entire design system.

**Acceptance Criteria:**
- [ ] `ui/src/styles/main.scss` created, importing in this order: all token files (`_colors`, `_spacing`, `_typography`, `_z-index`), then base files (`_reset`, `_base`)
- [ ] `ui/src/main.ts` imports `'./styles/main.scss'`
- [ ] All CSS custom properties from all token files are visible on `:root` in the browser after this import
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: open DevTools → Elements → `:root` and confirm `--color-primary`, `--space-4`, `--font-size-md` are present

### US-006: Vue Router setup and /design preview route
**Description:** As a developer, I want a `/design` route that renders all design tokens visually so I can verify the system is wired correctly at a glance.

**Acceptance Criteria:**
- [ ] `vue-router` installed as a dependency in `ui/` (yarn add vue-router)
- [ ] `ui/src/router.ts` created, defining two routes: `/` → placeholder `HomeView.vue` (empty shell, just `<div>Home</div>`), `/design` → `DesignPreview.vue`
- [ ] `ui/src/main.ts` uses the router via `app.use(router)`
- [ ] `App.vue` renders `<RouterView />`
- [ ] `ui/src/views/DesignPreview.vue` created with clearly labelled sections for:
  - **Colour palette** — one swatch per token (ocean, sand, neutral, surf score, UI aliases), each showing the token name and a filled box in that colour
  - **Spacing scale** — a horizontal bar per step (`--space-1` through `--space-12`) with its name and pixel value
  - **Typography** — each `--font-size-*` rendered as sample text "The quick brown fox", labelled with its token name
  - **Z-index** — a simple table of token name → value
- [ ] Navigating to `http://localhost:5173/design` renders the preview page with all token sections visible
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: navigate to `/design` and confirm all four sections (colours, spacing, typography, z-index) render correctly

---

## Functional Requirements

- FR-1: All colour, spacing, typography, and z-index values must be defined as CSS custom properties on `:root` — no magic numbers in component files
- FR-2: Hex values must only appear in `_colors.scss` — everywhere else references `var(--color-*)` tokens
- FR-3: Breakpoint values must be SCSS variables (not CSS custom properties) used exclusively inside the `breakpoint()` mixin
- FR-4: `main.scss` must be the sole import needed to load the full design system — one line in `main.ts`
- FR-5: Surf score semantic colours (`--color-surf-very-good/good/maybe/poor`) must be standalone hex values — not aliased to the palette (they must remain stable even if the palette changes)
- FR-6: The `/design` preview route must be accessible only in development — it is a developer tool, not a user-facing screen
- FR-7: All SCSS files must be free of unused imports or dead code

---

## Non-Goals

- No dark mode or theme switching in Phase 1
- No component-level SCSS — tokens only; component styles come in Phase 2+
- No animation or transition tokens (defer to when components need them)
- No custom web fonts — system font stack only
- No production build optimisation — dev tooling only in Phase 1
- No Lit Web Components — those come in Phase 2

---

## Technical Considerations

- SCSS `@use` and `@forward` syntax is preferred over `@import` (which is deprecated in modern Sass)
- Mixins must use `@use` to import other partials they depend on, not rely on cascade from `main.scss`
- CSS custom properties on `:root` are accessible to Lit Web Components via the Shadow DOM — no extra configuration needed
- `vue-router` v4 required (compatible with Vue 3)
- The `/design` route only needs to exist in the dev build; no guard is required for Phase 1

---

## Folder Structure (target end state)

```
ui/src/styles/
├── main.scss
├── tokens/
│   ├── _colors.scss
│   ├── _spacing.scss
│   ├── _typography.scss
│   └── _z-index.scss
├── mixins/
│   ├── _breakpoints.scss
│   └── _focus.scss
├── base/
│   ├── _reset.scss
│   └── _base.scss
└── utilities/        ← empty for now, reserved for Phase 2+

ui/src/
├── main.ts           ← imports styles/main.scss, uses router
├── router.ts         ← / and /design routes
├── App.vue           ← <RouterView />
└── views/
    ├── HomeView.vue  ← empty shell
    └── DesignPreview.vue ← token preview page
```

---

## Success Metrics

- All CSS custom properties visible on `:root` in DevTools after `docker compose up`
- `/design` route renders all four token sections without layout errors
- `yarn typecheck` passes with zero errors
- No hard-coded colour hex values outside `_colors.scss`
- Editing a token value in `_colors.scss` updates all usages immediately via Vite HMR

---

## Open Questions

- None — all decisions made.
