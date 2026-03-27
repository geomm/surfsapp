# PRD: Phase 2 — Lit Component Library

## Introduction

Build the five base Lit Web Components that form the surfsapp design system: `surf-badge`, `surf-icon`, `surf-button`, `surf-card`, and `surf-bottom-sheet`. Each component is a custom HTML element defined with Lit, styled exclusively via the CSS custom properties established in Phase 1 (accessible through the Shadow DOM via `:host` and CSS inheritance), and registered globally so any Vue template or future Lit component can use them with no extra imports. A `/components` preview route provides a visual catalogue of all components and their variants.

**Why Lit Web Components instead of Vue components?** Lit components are framework-agnostic custom elements. They will be reusable if the app is ever wrapped in Capacitor or if parts of the UI move to a different framework. They consume CSS custom properties from `:root`, making them automatically themed by the design system.

---

## Goals

- Five Lit Web Components registered as global custom elements
- All components consume Phase 1 CSS custom properties — no hard-coded colours, spacing, or font values
- Minimal viable variants only — enough for Phase 6 (Beach Listing) and Phase 7 (Beach Detail)
- `/components` preview route showing every component and its variants in isolation
- Typecheck passes across the entire `ui/` project

---

## Component Specifications

### `surf-badge`

Displays a surf score label with a colour corresponding to the score tier.

**Properties:**
| Property | Type | Default | Description |
|---|---|---|---|
| `variant` | `'very-good' \| 'good' \| 'maybe' \| 'poor' \| 'neutral'` | `'neutral'` | Determines background and text colour |
| `size` | `'sm' \| 'md'` | `'md'` | Controls font size and padding |

**Slots:** Default slot — label text (e.g. `Very Good`, `Poor`)

**Colour mapping:**
- `very-good` → background `--color-surf-very-good`, white text
- `good` → background `--color-surf-good`, white text
- `maybe` → background `--color-surf-maybe`, dark text (`--color-neutral-900`)
- `poor` → background `--color-surf-poor`, white text
- `neutral` → background `--color-neutral-200`, text `--color-text-secondary`

**Size mapping:**
- `sm` → `--font-size-xs`, padding `--space-1` vertical / `--space-2` horizontal, `border-radius: 4px`
- `md` → `--font-size-sm`, padding `--space-1` vertical / `--space-3` horizontal, `border-radius: 6px`

**No events.**

---

### `surf-icon`

Renders a Lucide icon as an inline SVG.

**Properties:**
| Property | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Lucide icon name in kebab-case (e.g. `'waves'`, `'heart'`, `'map-pin'`, `'wind'`, `'star'`, `'chevron-right'`, `'arrow-left'`, `'refresh-cw'`) |
| `size` | `number` | `24` | Width and height of the SVG in pixels |
| `color` | `string` | `'currentColor'` | SVG stroke colour — defaults to inherited text colour |

**No slots. No events.**

**Implementation note:** Install the `lucide` package (core, not `lucide-react`). Import individual icon definitions by their PascalCase name (e.g. `import { Waves, Heart } from 'lucide'`). Each Lucide icon is an `IconNode` — an array describing the SVG structure. Use Lit's `svg` template tag to render it. The component must handle unknown icon names gracefully (render nothing, log a console warning).

**Icons needed at minimum for Phase 2 preview:** `waves`, `heart`, `map-pin`, `wind`, `star`, `chevron-right`, `arrow-left`, `refresh-cw`

---

### `surf-button`

A styled action button.

**Properties:**
| Property | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Controls height and font size |
| `disabled` | `boolean` | `false` | Disables interaction and dims the button |
| `type` | `'button' \| 'submit'` | `'button'` | Native button type |

**Slots:** Default slot — button label text or content

**Variant styles (use CSS custom properties only):**
- `primary` → background `--color-primary`, text white, hover darkens with `opacity: 0.9`
- `secondary` → background transparent, border `1px solid --color-primary`, text `--color-primary`, hover background `--color-ocean-50`
- `ghost` → background transparent, no border, text `--color-text-secondary`, hover background `--color-neutral-100`

**Size styles:**
- `sm` → height `--space-8`, font `--font-size-sm`, padding horizontal `--space-3`
- `md` → height `--space-10`, font `--font-size-md`, padding horizontal `--space-4`
- `lg` → height `--space-12`, font `--font-size-lg`, padding horizontal `--space-6`

**Behaviour:** When `disabled=true`, pointer-events none, opacity 0.5, cursor not-allowed. The inner `<button>` element carries the `disabled` attribute natively.

**No custom events** — consumers listen to native `click` on the element.

---

### `surf-card`

A surface container for content. Used as the wrapper for beach cards in the listing view.

**Properties:**
| Property | Type | Default | Description |
|---|---|---|---|
| `clickable` | `boolean` | `false` | If true, shows pointer cursor and hover/active states |
| `padding` | `'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding size |

**Slots:** Default slot — any content

**Styles:**
- Background: `--color-surface`
- Border: `1px solid --color-border`
- Border-radius: `12px`
- Box-shadow: `0 1px 3px rgba(0,0,0,0.08)`
- Padding sm: `--space-3`, md: `--space-4`, lg: `--space-6`
- When `clickable=true`: hover `box-shadow: 0 4px 12px rgba(0,0,0,0.12)`, transition `box-shadow 150ms ease`

**Events:** When `clickable=true`, dispatches a `card-click` CustomEvent (bubbles, composed) on click.

---

### `surf-bottom-sheet`

A modal sheet that slides up from the bottom of the screen. Used for filter panels and contextual actions.

**Properties:**
| Property | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Controls visibility |
| `title` | `string` | `''` | Optional heading rendered inside the sheet header |

**Slots:** Default slot — sheet body content

**Behaviour:**
- When `open=true`: sheet slides up from bottom, a semi-transparent backdrop covers the rest of the screen
- Clicking the backdrop dispatches `sheet-close` and sets `open` to `false`
- Pressing `Escape` also closes the sheet
- When `open=false`: sheet is hidden (`display: none` or `visibility: hidden` with `pointer-events: none`)
- No focus trapping required in Phase 2 — add in a later phase

**Styles:**
- Sheet background: `--color-surface`
- Border-radius top: `16px`
- Max-height: `85vh`, overflow-y auto
- Backdrop: `rgba(0,0,0,0.4)`
- Handle bar: 32px wide, 4px tall, `--color-neutral-300`, centered at top of sheet
- Header: title in `--font-size-lg`, `--font-weight-semibold`, padding `--space-4`
- Body: padding `--space-4`

**Events:** Dispatches `sheet-close` CustomEvent (bubbles, composed) when backdrop clicked or Escape pressed.

---

## User Stories

### US-001: Install Lit and Lucide, create components directory structure
**Description:** As a developer, I want Lit and Lucide installed and the components directory scaffolded so that subsequent stories have a consistent location and working imports.

**Acceptance Criteria:**
- [ ] `lit` installed as a dependency in `ui/` via yarn (`yarn add lit`)
- [ ] `lucide` installed as a dependency in `ui/` via yarn (`yarn add lucide`)
- [ ] `ui/src/components/lit/` directory created
- [ ] `ui/src/components/lit/index.ts` created (empty barrel file — will be populated by later stories)
- [ ] `ui/src/main.ts` imports `'./components/lit/index.ts'`
- [ ] A minimal smoke-test Lit component `surf-test.ts` is created in `ui/src/components/lit/`, registered as `<surf-test>`, renders `<p>Lit works</p>`, and is visible at `/` temporarily to confirm Lit + Vite integration works
- [ ] Typecheck passes (`yarn typecheck`)
- [ ] Verify in browser using dev-browser skill: navigate to `http://localhost:5173/` and confirm `<surf-test>` renders "Lit works"

### US-002: surf-badge component
**Description:** As a developer, I want a `<surf-badge>` custom element that displays surf score labels with the correct tier colour so that beach cards and detail views can show surfability at a glance.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/surf-badge.ts` created, defining and registering `<surf-badge>` as a `LitElement`
- [ ] `variant` property implemented: `'very-good' | 'good' | 'maybe' | 'poor' | 'neutral'` (default `'neutral'`)
- [ ] `size` property implemented: `'sm' | 'md'` (default `'md'`)
- [ ] Colour mapping applied using `:host` CSS and CSS custom properties from Phase 1 tokens (no hard-coded hex values)
- [ ] Default slot renders the label text
- [ ] `surf-badge.ts` exported from `ui/src/components/lit/index.ts`
- [ ] Smoke-test component (`surf-test.ts`) removed from index and from `HomeView` or wherever it was added
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: add `<surf-badge variant="very-good">Very Good</surf-badge>` to `HomeView.vue` temporarily, confirm it renders with green background

### US-003: surf-icon component
**Description:** As a developer, I want a `<surf-icon>` custom element that renders Lucide icons as inline SVG so that icons can be used throughout the app without external image assets.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/surf-icon.ts` created, defining and registering `<surf-icon>` as a `LitElement`
- [ ] `name` property implemented (string, required) — maps to a Lucide icon
- [ ] `size` property implemented (number, default `24`) — sets SVG width and height
- [ ] `color` property implemented (string, default `'currentColor'`) — sets SVG stroke colour
- [ ] At minimum these icons are importable by name: `waves`, `heart`, `map-pin`, `wind`, `star`, `chevron-right`, `arrow-left`, `refresh-cw`
- [ ] Unknown icon name renders nothing and logs `console.warn('surf-icon: unknown icon "${name}"')`
- [ ] `surf-icon.ts` exported from `ui/src/components/lit/index.ts`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: add `<surf-icon name="waves" size="32"></surf-icon>` to `HomeView.vue` temporarily, confirm a waves SVG renders at 32px

### US-004: surf-button component
**Description:** As a developer, I want a `<surf-button>` custom element with primary, secondary, and ghost variants so that consistent action buttons are available across all views.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/surf-button.ts` created, defining and registering `<surf-button>` as a `LitElement`
- [ ] `variant` property: `'primary' | 'secondary' | 'ghost'` (default `'primary'`)
- [ ] `size` property: `'sm' | 'md' | 'lg'` (default `'md'`)
- [ ] `disabled` property: boolean (default `false`) — inner `<button>` carries native `disabled` attribute, pointer-events none, opacity 0.5
- [ ] `type` property: `'button' | 'submit'` (default `'button'`) — passed to inner `<button>`
- [ ] Default slot renders button label content
- [ ] All colours use CSS custom properties from Phase 1 tokens — no hard-coded hex values
- [ ] `surf-button.ts` exported from `ui/src/components/lit/index.ts`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: add all three variants to `HomeView.vue` temporarily, confirm primary renders with ocean blue background, secondary with border, ghost with no border

### US-005: surf-card component
**Description:** As a developer, I want a `<surf-card>` custom element that provides a consistent surface container so that beach listing cards and detail panels share the same visual shell.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/surf-card.ts` created, defining and registering `<surf-card>` as a `LitElement`
- [ ] `clickable` property: boolean (default `false`) — when true, shows pointer cursor and dispatches `card-click` CustomEvent (bubbles: true, composed: true) on click
- [ ] `padding` property: `'sm' | 'md' | 'lg'` (default `'md'`) — maps to `--space-3`, `--space-4`, `--space-6`
- [ ] Background `--color-surface`, border `1px solid var(--color-border)`, border-radius `12px`, box-shadow `0 1px 3px rgba(0,0,0,0.08)`
- [ ] When `clickable=true`: hover box-shadow `0 4px 12px rgba(0,0,0,0.12)`, transition `box-shadow 150ms ease`
- [ ] Default slot renders any content
- [ ] `surf-card.ts` exported from `ui/src/components/lit/index.ts`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: add a clickable and a non-clickable `<surf-card>` to `HomeView.vue` temporarily, confirm card renders with border and shadow, clickable card shows pointer cursor on hover

### US-006: surf-bottom-sheet component
**Description:** As a developer, I want a `<surf-bottom-sheet>` custom element that slides up from the bottom of the screen so that filter panels and contextual actions have a consistent mobile-friendly container.

**Acceptance Criteria:**
- [ ] `ui/src/components/lit/surf-bottom-sheet.ts` created, defining and registering `<surf-bottom-sheet>` as a `LitElement`
- [ ] `open` property: boolean (default `false`) — controls visibility; when `false`, sheet and backdrop are hidden
- [ ] `title` property: string (default `''`) — renders as a heading in the sheet header when non-empty
- [ ] Sheet slides in from the bottom when `open` changes to `true` (CSS transition: `transform 250ms ease`)
- [ ] Semi-transparent backdrop (`rgba(0,0,0,0.4)`) covers the screen when open
- [ ] Clicking the backdrop dispatches `sheet-close` CustomEvent (bubbles: true, composed: true)
- [ ] Pressing `Escape` while sheet is open dispatches `sheet-close`
- [ ] Handle bar (32px × 4px, `--color-neutral-300`, border-radius 2px) rendered at the top of the sheet
- [ ] Sheet background `--color-surface`, border-radius top `16px`, max-height `85vh`, overflow-y auto
- [ ] Default slot renders body content
- [ ] `surf-bottom-sheet.ts` exported from `ui/src/components/lit/index.ts`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: add `<surf-bottom-sheet open title="Filters">Sheet content</surf-bottom-sheet>` to `HomeView.vue` temporarily, confirm sheet renders from bottom with backdrop and handle bar visible

### US-007: /components preview route
**Description:** As a developer, I want a `/components` route that shows every component and its variants in isolation so I can verify the component library at a glance without building a full view.

**Acceptance Criteria:**
- [ ] `ui/src/views/ComponentsPreview.vue` created
- [ ] Route `/components` added to `ui/src/router.ts` pointing to `ComponentsPreview`
- [ ] `HomeView.vue` cleaned up — any temporary component test code from US-001 through US-006 removed
- [ ] `ComponentsPreview.vue` contains clearly labelled sections for each component:
  - **surf-badge** — all 5 variants (very-good, good, maybe, poor, neutral) in both sizes (sm, md)
  - **surf-icon** — all 8 required icons at size 24 and size 32, each labelled with its icon name
  - **surf-button** — all 3 variants (primary, secondary, ghost) in all 3 sizes (sm, md, lg), plus a disabled primary
  - **surf-card** — one non-clickable card and one clickable card, each with sample text content
  - **surf-bottom-sheet** — a button that toggles the sheet open/closed, with sample content inside
- [ ] Navigating to `http://localhost:5173/components` renders all sections without errors
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: navigate to `/components`, confirm all five component sections render correctly and the bottom sheet opens/closes when the toggle button is clicked

---

## Functional Requirements

- FR-1: All five components must be registered as native custom elements via `customElements.define()` — no Vue-specific wrapper needed
- FR-2: All components must consume Phase 1 CSS custom properties exclusively — no hard-coded colour, spacing, or font values anywhere in component Shadow DOM styles
- FR-3: CSS custom properties are inherited into Shadow DOM via `:host` — components must use `inherit` where appropriate (e.g. `color`, `font-family`) and explicitly reference tokens for background, border, etc.
- FR-4: All components must be exported from `ui/src/components/lit/index.ts` and registered via that single import in `main.ts`
- FR-5: Components must not import from Vue — they are framework-agnostic Lit elements
- FR-6: The `surf-bottom-sheet` Escape key listener must be added to `document` when `open=true` and removed when `open=false` to avoid memory leaks
- FR-7: The `/components` route is a developer tool — it does not need to be linked from the main app navigation
- FR-8: Temporary test code added during component development must be removed before the `/components` story (US-007) is marked complete

---

## Non-Goals

- No animations beyond the bottom sheet slide transition — add to other components later
- No `surf-input`, `surf-select`, `surf-toggle` — those come when a view requires them
- No theming system or dark mode variants
- No unit tests for components in Phase 2 — add in a later phase
- No Storybook or dedicated component documentation site
- No focus trapping in `surf-bottom-sheet` — add in Phase 9 (Offline First) or when accessibility pass happens
- No `surf-icon` auto-discovery — the set of available icons is explicitly imported in the component

---

## Technical Considerations

- **Lit version:** Use `lit` v3 (latest stable). Import `LitElement`, `html`, `css`, `property` from `'lit'` and `'lit/decorators.js'`
- **Vite + Lit:** Lit works with Vite out of the box — no extra plugins needed. TypeScript decorators require `"experimentalDecorators": true` and `"useDefineForClassFields": false` in `ui/tsconfig.json` if using the decorator syntax; alternatively use the static `properties` object approach which requires no tsconfig changes
- **Lucide icons:** Import individual icon definitions from `'lucide'` by PascalCase name. Each icon is an `IconNode` (a recursive tuple describing the SVG tree). Use Lit's `svg` template tag to render them. Do not use `lucide-react` or `@lucide/vue-next`
- **Shadow DOM and CSS tokens:** CSS custom properties pierce the Shadow DOM boundary and are inherited. Components should use `var(--color-primary)` directly inside their `:host` CSS — no `@import` of SCSS files needed inside Lit components
- **`composed: true` on events:** All custom events dispatched from Lit components must set `composed: true` so they bubble across the Shadow DOM boundary and are catchable in Vue templates
- **vue-router version:** Already installed as `vue-router ^5.0.4` — no changes needed

---

## Folder Structure (target end state)

```
ui/src/components/
└── lit/
    ├── index.ts              ← registers all components, imported by main.ts
    ├── surf-badge.ts
    ├── surf-button.ts
    ├── surf-card.ts
    ├── surf-icon.ts
    └── surf-bottom-sheet.ts

ui/src/views/
├── HomeView.vue              ← cleaned up (no test code)
├── DesignPreview.vue         ← unchanged from Phase 1
└── ComponentsPreview.vue     ← new

ui/src/router.ts              ← adds /components route
```

---

## Success Metrics

- All five custom elements render correctly at `/components` without console errors
- `yarn typecheck` passes with zero errors
- No hard-coded colour or spacing values in any component Shadow DOM CSS
- `surf-badge` colour matches `--color-surf-*` tokens exactly (verifiable in DevTools)
- `surf-bottom-sheet` opens and closes correctly, backdrop click and Escape both work

---

## Open Questions

- None — all decisions made.
