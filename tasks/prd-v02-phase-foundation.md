# PRD: v0.2 Phase 1 — Foundation

## Introduction

Phase 1 of the v0.2 release lays the engineering foundation for every later phase: consistent dev tooling, a measured frontend performance baseline, and a backend that stays responsive while the cron-driven forecast fetcher runs. The work covers three theme-level stories from `docs/v0.2-design-brief.md` — **US-001 (Dev experience baseline)**, **US-002 (Frontend performance pass)**, **US-003 (Backend performance & resilience)** — and produces the linting, performance, and observability primitives the rest of v0.2 will be measured against.

Source documents:

- `docs/v0.2-plan.md` — Phase 1 section, deliverables and exit criteria
- `docs/v0.2-design-brief.md` — Theme 1 (US-001 / US-002 / US-003)

This PRD breaks those three theme stories into single-session implementable units while preserving traceability back to the brief.

## Goals

- Land a single, repo-wide lint + format + typecheck setup so contributors get instant feedback and CI/local results match.
- Add a pre-commit safety net (husky + lint-staged) that runs typecheck on staged files before they are committed.
- Capture an authoritative v0.2 performance baseline — Lighthouse mobile, bundle size, backend p50/p95 — and commit it to the repo so all later phases can be regressed against it.
- Lift Lighthouse mobile performance to **≥ 90** as a hard exit gate for Phase 1.
- Move the cron-triggered forecast fetcher off the HTTP request path so the API stays responsive during fetch cycles.
- Add structured request logging and verify MongoDB indexes that the API depends on.
- Document the Docker + HMR developer workflow in `README.md` so contributors don't rediscover the `usePolling` workaround on their own.

## User Stories

> Story IDs in this PRD (`US-001`…`US-008`) are PRD-local. The "Source" line maps each one back to the corresponding theme story in `docs/v0.2-design-brief.md`.

### US-001: ESLint + Prettier across `ui/` and `backend/`

**Source:** brief US-001
**Description:** As a contributor, I want a single lint + format setup across both packages so I get consistent feedback and the same rules apply everywhere.

**Acceptance Criteria:**

- [ ] `ui/`: ESLint flat config (`eslint.config.js`) with `eslint-plugin-vue` + `@typescript-eslint` + `@vue/eslint-config-typescript`, and Prettier wired via `eslint-config-prettier` (no rule conflicts)
- [ ] `backend/`: ESLint flat config with `@typescript-eslint` + Prettier integration
- [ ] Root `.prettierrc` shared between both packages (single source of truth for formatting rules); each package's lint config defers to it
- [ ] `ui/package.json` adds scripts: `"lint": "eslint . --max-warnings 0"` and `"format": "prettier --write ."`
- [ ] `backend/package.json` adds scripts: `"lint": "eslint . --max-warnings 0"` and `"format": "prettier --write ."`
- [ ] Both `yarn lint` (UI) and `npm run lint` (backend) pass clean on the current `main` after one autofix pass
- [ ] Typecheck still passes (`cd ui && yarn typecheck`, `cd backend && npm run typecheck`)

### US-002: Tighten TypeScript strictness in both packages

**Source:** brief US-001
**Description:** As a contributor, I want strict TypeScript so type errors surface at edit time, not in production.

**Acceptance Criteria:**

- [ ] `ui/tsconfig.json` (or referenced `tsconfig.app.json`) has `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noFallthroughCasesInSwitch": true`
- [ ] `backend/tsconfig.json` has the same three flags enabled
- [ ] `cd ui && yarn typecheck` passes
- [ ] `cd backend && npm run typecheck` passes
- [ ] Any new `// @ts-expect-error` or `any` casts added to make the build pass include a one-line comment explaining why and link the follow-up cleanup (no unexplained suppressions)

### US-003: Pre-commit hook running typecheck on staged files

**Source:** brief US-001
**Description:** As a contributor, I want broken types caught before commit so they never reach review.

**Acceptance Criteria:**

- [ ] `husky` and `lint-staged` added at the repo root (`package.json` or a root `package.json` if one needs to be introduced — call this out in the PR)
- [ ] `.husky/pre-commit` runs `lint-staged`
- [ ] `lint-staged` config runs `tsc --noEmit` (or `vue-tsc --noEmit` for `*.vue`) **scoped to staged files only**, plus `eslint --fix` and `prettier --write`
- [ ] Pre-commit completes in under ~5s for a typical 1–3 file change (slower full-project typecheck stays out of the hook)
- [ ] Hook can be bypassed in genuine emergencies via `git commit --no-verify` (default behaviour — do not block this)
- [ ] `README.md` adds a one-paragraph "Pre-commit hooks" section explaining what runs and how to skip in emergencies

### US-004: Document Docker + HMR developer workflow in `README.md`

**Source:** brief US-001
**Description:** As a new contributor, I want the dev workflow documented so I can boot the stack without trial and error.

**Acceptance Criteria:**

- [ ] `README.md` has a "Local development" section covering: clone → `docker compose up` (or equivalent) → ports exposed → where the UI and backend live
- [ ] Section explains the `usePolling: true` HMR workaround in `vite.config.ts` and _why_ it's needed (Docker bind-mount inotify limits on macOS)
- [ ] Section documents how to run the cloudflared tunnel for real-device testing (referenced by Phase 1 Definition of Done in `docs/v0.2-plan.md` line 215)
- [ ] Section lists the `lint`, `typecheck`, `format`, `build` commands for each package
- [ ] Manual smoke check: a contributor following only the README from a fresh clone can reach a running UI and backend

### US-005: Capture Lighthouse mobile baseline and lift score to ≥ 90

**Source:** brief US-002
**Description:** As a maintainer, I want a committed Lighthouse baseline and a mobile performance score of at least 90 so we have a concrete gate for v0.2.

**Acceptance Criteria:**

- [ ] `docs/perf-baseline.md` created, capturing for the production build (`yarn build` + `yarn preview` or equivalent):
  - Lighthouse mobile **Performance** score (target: **≥ 90**) — this is a hard gate
  - Lighthouse mobile **Accessibility**, **Best Practices**, **SEO** scores (recorded, not gated)
  - Date and commit SHA of the run
  - Device/throttling profile used (e.g. "Moto G4 / Slow 4G — Lighthouse default mobile preset")
- [ ] If the initial run is below 90, apply the wins listed in `docs/v0.2-design-brief.md` US-002 (route-level code-splitting, lazy-load MapLibre on `/map`, image lazy-loading on beach photos, font subsetting) until ≥ 90 is reached
- [ ] Lazy-loading of MapLibre is verified: `import('maplibre-gl')` only happens on the `/map` route — confirmed via the build's chunk graph
- [ ] Beach photos use `loading="lazy"` on `<img>` (or the equivalent for whatever image component is in use)
- [ ] Typecheck + lint pass after changes
- [ ] Verify in browser using dev-browser skill: home loads, list scrolls smoothly, `/map` route still works after lazy-loading MapLibre

### US-006: Bundle-size baseline and perf budget in `vite.config.ts`

**Source:** brief US-002
**Description:** As a maintainer, I want bundle growth to surface as a build warning so charts and other v0.2 additions don't silently bloat the app.

**Acceptance Criteria:**

- [ ] `yarn build` output (per-chunk gzipped sizes) recorded in `docs/perf-baseline.md` alongside the Lighthouse numbers
- [ ] `vite.config.ts` sets `build.chunkSizeWarningLimit` to **current largest chunk size + 10%**, rounded up to the nearest 10 KB
- [ ] A short comment in `vite.config.ts` next to the value explains it is the v0.2 baseline + 10% headroom and references `docs/perf-baseline.md`
- [ ] `yarn build` completes without warnings on the current `main`
- [ ] Typecheck + lint pass

### US-007: Backend latency baseline + offload forecast fetcher to a worker

**Source:** brief US-003
**Description:** As a user, I want the API to stay responsive even while the forecast fetcher runs, so list and detail views never stall during a cron cycle.

**Acceptance Criteria:**

- [ ] Baseline p50 / p95 response times for `GET /beaches` and `GET /beaches/:id/forecast` measured with the cron fetcher idle, recorded in `docs/perf-baseline.md` under a "Backend baseline" section
- [ ] Same p50 / p95 measured _during_ an active forecast fetch cycle, recorded alongside the idle numbers
- [ ] Forecast fetcher is offloaded so it does not block the HTTP server's event loop. Implementation: prefer `worker_threads` with a small message-passing wrapper; if a separate process makes more sense for this codebase, document the rationale in the PR
- [ ] Existing cron entry point + the existing `POST /admin/fetch-forecasts` endpoint both route through the worker (single code path)
- [ ] After the offload: re-measure during-fetch p95 and record it; it must be no worse than the idle p95 plus a small variance margin (≤ 10%)
- [ ] Typecheck + lint pass on backend
- [ ] Manual smoke check: trigger `POST /admin/fetch-forecasts` and concurrently hit `GET /beaches` — list endpoint stays responsive

### US-008: Structured request logging + MongoDB index verification

**Source:** brief US-003
**Description:** As a maintainer, I want structured request logs and confirmed indexes so I can diagnose latency issues with real data.

**Acceptance Criteria:**

- [ ] `morgan` added to the backend with a JSON-shaped format string emitting at minimum: `requestId`, `method`, `path`, `status`, `durationMs`, `timestamp`
- [ ] Request id middleware generates a `requestId` (e.g. `crypto.randomUUID()`) on every incoming request, attaches it to `req`, and is included in the morgan output
- [ ] A small JSON-log wrapper module in `backend/` (e.g. `backend/src/lib/log.ts`) exposes `log.info / log.warn / log.error` that emit one-line JSON with the same `requestId` when called from request scope
- [ ] At least one existing app log call site (forecast fetcher start/finish) is migrated to the new wrapper to prove integration
- [ ] MongoDB indexes on `forecastSnapshots.beachId` and `forecastSnapshots.fetchedAt` confirmed present via `db.forecastSnapshots.getIndexes()`; if missing, added in code (e.g. `schema.index({ beachId: 1 })`, `schema.index({ fetchedAt: -1 })`)
- [ ] Index existence is captured in `docs/perf-baseline.md` under the "Backend baseline" section
- [ ] Typecheck + lint pass on backend

## Functional Requirements

- **FR-1** Both packages MUST expose `lint`, `format`, and `typecheck` scripts that exit non-zero on failure, suitable for CI use.
- **FR-2** A repo-root pre-commit hook MUST run `lint-staged`, which runs `eslint --fix`, `prettier --write`, and a staged-file-scoped `tsc --noEmit` (and `vue-tsc --noEmit` for `*.vue` files).
- **FR-3** `vue-tsc` and backend `tsc` MUST run with `strict: true`, `noUncheckedIndexedAccess: true`, `noFallthroughCasesInSwitch: true`.
- **FR-4** A production build MUST achieve a Lighthouse mobile **Performance** score of **≥ 90**. This is a hard gate; Phase 1 cannot exit if it is not met.
- **FR-5** `vite.config.ts` MUST set `build.chunkSizeWarningLimit` to the v0.2 baseline largest-chunk size + 10%, with the value referenced from `docs/perf-baseline.md`.
- **FR-6** MapLibre MUST be loaded only on the `/map` route (verified by the chunk graph showing `maplibre-gl` in a route-specific chunk, not in the main entry chunk).
- **FR-7** `docs/perf-baseline.md` MUST exist and contain: Lighthouse mobile scores, gzipped per-chunk bundle sizes, backend p50/p95 latencies for `/beaches` and `/beaches/:id/forecast` (idle and during-fetch), and the date + commit SHA of the run.
- **FR-8** The forecast fetcher MUST run off the HTTP server's main thread/process so that during-fetch p95 latency on `/beaches` and `/beaches/:id/forecast` does not regress more than 10% versus the idle baseline.
- **FR-9** The backend MUST emit one structured JSON log line per HTTP request via `morgan`, including a generated `requestId`, `method`, `path`, `status`, and `durationMs`.
- **FR-10** App-level logs from request scope MUST include the same `requestId` so a single request can be traced end-to-end.
- **FR-11** MongoDB indexes on `forecastSnapshots.beachId` and `forecastSnapshots.fetchedAt` MUST be defined in the Mongoose schema (not just at the live DB level).
- **FR-12** `README.md` MUST document local Docker + HMR setup, the cloudflared tunnel workflow for real-device smoke checks, and the `lint` / `typecheck` / `format` / `build` scripts for both packages.

## Non-Goals (Out of Scope)

- New CI pipeline or GitHub Actions workflow — Phase 1 establishes the scripts; CI integration is a separate task.
- A monorepo tool (Turbo / Nx / pnpm workspaces) — keep the current two-package layout. (Note: Phase 1 originally listed "package manager unification" as out of scope; that was reversed post-merge — the backend was migrated from npm to yarn for parity with the UI.)
- Replacing `morgan` with a heavier observability stack (pino + transports, OpenTelemetry, hosted log aggregation).
- Adding any frontend perf wins beyond what is needed to clear the Lighthouse ≥ 90 gate (e.g. a service-worker pre-cache strategy beyond what's already shipped).
- Tuning MongoDB beyond verifying the two indexes called out in the brief.
- Any work from Phases 2–7 of `docs/v0.2-plan.md` (admin auth, validation tooling, profile editor, charts, map upgrades).

## Design Considerations

- Reuse the existing `vite.config.ts` rather than introducing a second config file; the perf budget should sit alongside the existing PWA + plugin config.
- The pre-commit hook is for _fast feedback_, not full correctness. Full lint + typecheck remain available as `yarn lint` / `yarn typecheck` and should be the gate enforced in CI later.
- Logging output goes to stdout in JSON line format — the host (Docker) handles aggregation. Don't add file-based logging.

## Technical Considerations

- **Worker offload (US-007):** `worker_threads` is preferred over a separate Node process because the fetcher already shares Mongoose models with the API; a worker thread can re-use the connection setup with less ceremony than IPC. If shared mutable state forces a separate process, document the trade-off in the PR.
- **Strictness migration (US-002):** turning on `noUncheckedIndexedAccess` will surface real undefined-access bugs. Fix them rather than suppressing — an unexpected wave of `as` casts is a smell to push back on in review.
- **Bundle budget (US-006):** `+10%` is intentionally a _warning_, not an error, so Phase 4 (charts) can land and we make a deliberate decision when the budget is exceeded rather than blocking the build outright.
- **Lighthouse run environment:** Lighthouse scores are noisy. Take the median of three runs against `yarn build && yarn preview` on the local machine and record the device/network profile so future comparisons are apples-to-apples.

## Success Metrics

- `yarn lint` and `npm run lint` exit clean on `main` immediately after Phase 1 lands.
- Lighthouse mobile **Performance** ≥ 90 recorded in `docs/perf-baseline.md`.
- `vite.config.ts` warns (not errors) when a new chunk pushes past the v0.2 baseline + 10%.
- Backend `/beaches` and `/beaches/:id/forecast` p95 during a forecast fetch is within 10% of idle p95.
- Every HTTP request produces exactly one structured JSON log line with a `requestId` that can be grepped against app logs.
- A new contributor can boot the stack from `README.md` instructions alone, without asking.

## Open Questions

1. **Worker vs. separate process for the fetcher (US-007):** does anything in the current fetcher rely on a Mongoose connection / global state that doesn't survive a `worker_threads` boundary cleanly? Resolve during implementation; record the call in the PR description.
2. **Husky setup at repo root:** the repo currently has two package directories (`ui/`, `backend/`) and no root `package.json`. Introduce a minimal root `package.json` solely to host husky + lint-staged, or install husky inside one of the existing packages? Recommendation: minimal root `package.json` so the hook isn't tied to either package's lifecycle. Confirm in the PR.
3. **CI integration:** out of scope for this PRD, but worth flagging — once Phase 1 lands, a follow-up should wire `lint` + `typecheck` + `build` into CI so the local gates are enforced on every PR.
