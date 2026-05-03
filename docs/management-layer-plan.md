# Management Layer — Phased Implementation Plan

Phased execution plan for `docs/management-layer-design.md`. Each phase is
self-contained, ships independently, and has explicit verification steps.

Ordering rationale: ship the lowest-risk and lowest-dep-footprint changes
first so the higher-risk pieces (AdminJS) land on a clean base.

---

## Phase 1 — MongoDB Compass enablement (docs only)

**Goal:** make Compass the documented way to inspect the local DB so
phases 2–4 can be visually verified.

**Scope**

- No code changes. Mongo port `27017` is already published in
  `docker-compose.yml`.

**Tasks**

- [ ] Add a "DB inspection" subsection to `README.md` under
      "Where things live" with:
  - Connection string `mongodb://localhost:27017/surfsapp`
  - Brief note that no auth is configured locally
  - Suggested saved favourite scoped to the `surfsapp` DB
- [ ] Optional: link to the `Beach` and `ForecastSnapshot` collections
      so a new contributor knows where to look.

**Verification**

- [ ] Open Compass with the documented connection string, confirm
      `beaches`, `forecastsnapshots`, `settings` collections appear.
- [ ] `docker compose exec backend yarn seed` repopulates `beaches`
      and Compass shows the rows after a refresh.

**Exit criteria**

- A new contributor can connect Compass to the local stack using only
  the README. No follow-up questions needed.

---

## Phase 2 — Env hygiene

**Goal:** stop committing `.env`, document required variables, prepare
for AdminJS secrets in Phase 4.

**Scope**

- Project root `.gitignore`, new `.env.example`, README update.

**Tasks**

- [ ] Add `.env` (and `.env.local`, `.env.*.local`) to root `.gitignore`.
- [ ] Run `git rm --cached .env` so the existing tracked file leaves
      the index without being deleted on disk.
- [ ] Create `.env.example` at the repo root listing every variable
      currently in `.env` plus placeholders for the variables introduced
      in Phase 4: - `MONGO_URI`, `PORT`, `NODE_ENV` - `FORECAST_INTERVAL_HOURS` (already read by `scheduler.ts`) - Reserved (filled in Phase 4): `ADMIN_EMAIL`,
      `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
- [ ] Update README "First-time setup" to reference `.env.example`
      (`cp .env.example .env`) instead of the old `backend/.env.example`
      path.

**Verification**

- [ ] `git status` shows `.env` as untracked after the cache removal.
- [ ] `docker compose up` still boots cleanly with the developer's
      local `.env`.
- [ ] Fresh clone walkthrough using only README + `.env.example`
      reaches a running stack.

**Exit criteria**

- `.env` is not in the repo tree.
- `.env.example` documents every variable any service reads.

---

## Phase 3 — Error capture hygiene (no third-party SDK)

**Goal:** make sure no error goes silently to the floor — funnel
backend process-level errors and frontend window-level errors into the
existing JSON logger so they're greppable in `docker compose logs`.
Defer aggregation/alerting/source-maps until traffic justifies it.

### Phase 3a — Backend process-level handlers

**Packages**

- None.

**Tasks**

- [ ] In `backend/src/index.ts`, register handlers for
      `process.on('uncaughtException', …)` and
      `process.on('unhandledRejection', …)` that call
      `log.error('uncaught', { err })` (and `log.error('unhandledRejection', { reason })`)
      before letting the process exit on `uncaughtException`.
      Register them before `app.listen` so early-boot crashes are caught.
- [ ] Add a final Express error-handling middleware
      (`(err, req, res, next) => …`) mounted **after** all routes that
      logs via `log.error('http_error', { err, requestId: req.requestId })`
      and returns a generic 500 JSON body. Without this, route-thrown
      errors leak through Express's default HTML handler.
- [ ] On `SIGTERM`, log a structured `shutdown` line so graceful
      shutdowns are distinguishable from crashes in log scrapes.

**Verification**

- [ ] Add a temporary `/__boom` route that throws → confirm a JSON
      `level:"error"` line with `requestId` and the stack appears in
      `docker compose logs backend`. Remove the route after verifying.
- [ ] `Promise.reject(new Error('test'))` in a worker triggers a
      `level:"error"` line via `unhandledRejection`.
- [ ] `health` endpoint still returns `{status: "ok"}`.

### Phase 3b — Frontend `/client-errors` ingest

**Packages**

- None (uses `fetch` and existing logger).

**Tasks**

- [ ] Add `POST /client-errors` to a new `backend/src/routes/clientErrors.ts`
      that accepts `{ message, stack?, url?, userAgent?, ts }`,
      truncates `message` and `stack` (e.g. 4 KB each) to bound payload
      size, and logs via `log.error('client_error', { …payload, requestId: req.requestId })`.
      Use `express.json({ limit: '16kb' })` on this route specifically.
- [ ] Mount the new router in `backend/src/index.ts`. Keep the
      existing CORS origin (`http://localhost:5173`) — no change needed.
- [ ] Create `ui/src/utils/clientErrorReporter.ts` that: - Listens to `window.addEventListener('error', …)` and
      `window.addEventListener('unhandledrejection', …)` - POSTs a JSON payload to `${import.meta.env.VITE_API_URL}/client-errors`
      with `keepalive: true` so reports survive page unload - Swallows its own failures silently (never recursive-loop) - Throttles to e.g. 5 reports / 30 s to defend against runaway loops
- [ ] Wire the reporter from `ui/src/main.ts` before `app.mount('#app')`.
      No env gating — leave it on in dev too; structured logs are
      cheap and dev errors are useful to see.
- [ ] Optional: add a global Vue `app.config.errorHandler` that
      forwards Vue render errors into the same reporter so they're
      not lost to the console.

**Verification**

- [ ] In the running UI, run `throw new Error('ui boom')` from the
      DevTools console → backend logs a `level:"error"` line with
      `event:"client_error"` and the stack.
- [ ] An `unhandledrejection` (e.g. `Promise.reject('oops')`) shows
      up the same way.
- [ ] Throttle works: spamming 50 errors in a tight loop produces ≤5
      log lines in the first window.

**Exit criteria**

- No backend route-thrown error or unhandled promise leaves the
  process unlogged.
- No frontend `Error` or unhandled rejection escapes without landing
  in the backend's JSON logs.
- Zero new third-party dependencies, zero new accounts/secrets.

---

## Phase 4 — AdminJS panel

**Goal:** replace the ad-hoc `POST /admin/fetch-forecasts` with a real
admin panel offering CRUD on beaches and read-only views with custom
actions on forecast snapshots.

### Phase 4a — Route reshuffle

**Tasks**

- [ ] Move the existing `adminRouter` mount in `backend/src/index.ts`
      from `/admin` to `/admin/api`.
- [ ] If the UI calls `POST /admin/fetch-forecasts` anywhere, update
      callers to `POST /admin/api/fetch-forecasts` (grep
      `ui/src` for `/admin/`).
- [ ] Confirm nothing else in the codebase depends on the old path.

**Verification**

- [ ] `curl -XPOST localhost:3000/admin/api/fetch-forecasts` returns
      the existing `{message: 'Forecast fetch triggered'}` response
      and a worker run is logged.
- [ ] The old path `/admin/fetch-forecasts` returns 404.

### Phase 4b — AdminJS install + auth

**Packages**

- `adminjs`
- `@adminjs/express`
- `@adminjs/mongoose`
- `express-session`
- `express-formidable`
- `bcrypt` (for verifying `ADMIN_PASSWORD_HASH`)

**Tasks**

- [ ] Create `backend/src/admin/index.ts` that: - Registers `@adminjs/mongoose` adapter - Builds an `AdminJS` instance with `Beach` and
      `ForecastSnapshot` resources (see Phase 4c for resource config) - Uses `buildAuthenticatedRouter` with an `authenticate`
      callback comparing `ADMIN_EMAIL` and `bcrypt.compare` against
      `ADMIN_PASSWORD_HASH` - Mounts under `/admin` on the app passed in
- [ ] In `backend/src/index.ts`, after `connectDB()` resolves, mount
      the admin panel. Order matters: AdminJS must mount **after**
      Mongoose has connected so the adapter sees the registered models.
- [ ] Add `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` to
      `.env.example` and the developer's local `.env`.

**Verification**

- [ ] Visit `http://localhost:3000/admin` → login screen renders.
- [ ] Wrong credentials → login fails. Correct credentials → panel
      renders and lists beaches.
- [ ] Visiting `/admin/api/fetch-forecasts` (POST) still works
      independently of the panel session.

### Phase 4c — Resource configuration

**`Beach` resource**

- [ ] Full CRUD enabled.
- [ ] Group fields in the editor: - "Location": `coords`, `offshoreCoords`, `region`,
      `shorelineNormalDeg` - "Swell windows": `idealSwellDirection`,
      `acceptableSwellDirection`, `idealSwellHeightM`,
      `idealSwellPeriodS`, `minSwellHeightM`, `minSwellPeriodS` - "Wind": `maxOnshoreWindKmh`, `idealWindDescription`,
      `windScoringLogic` - "Weights": `weights.*` - "Profile": `skillLevel`, `tags`, `sheltered`,
      `longPeriodSwellRefracts`, `notes`
- [ ] Validate the five `weights.*` numbers sum to 1.0 (custom action
      hook or a `before` hook on save).

**`ForecastSnapshot` resource**

- [ ] Mark all fields read-only (`isVisible.edit = false`).
- [ ] Add a record-level custom action **"Regenerate"** that calls
      `triggerForecastFetch` for the selected snapshot's `beachId`
      and returns success/failure.
- [ ] Default sort: `fetchedAt` descending.

**Verification**

- [ ] Edit a beach via the panel, observe the change in Compass and in
      the next scoring run.
- [ ] Trigger "Regenerate" on a snapshot, confirm a new snapshot row
      appears within ~30s.
- [ ] Attempting to set `weights` that don't sum to 1.0 is rejected.

**Exit criteria**

- Single login covers panel access, with the trigger endpoint still
  reachable for any future scripted use.
- Beaches can be edited from the panel without touching JSON files or
  the seed script.
- Forecast snapshots are inspectable but not directly editable.

---

## Cross-cutting checks (run after each phase)

- [ ] `docker compose up` boots all three services without errors.
- [ ] `yarn --cwd backend typecheck && yarn --cwd ui typecheck` pass.
- [ ] Pre-commit hook (`yarn` root) runs lint-staged cleanly.
- [ ] `health` endpoint reports `mongo: connected`.

---

## Out of scope (deferred, per the design doc)

- Multi-user admin auth / RBAC.
- Audit log of admin mutations.
- Exposing the admin panel beyond localhost (needs HTTPS, persistent
  session store, rate limiting).
- **Error aggregation / alerting / source-maps.** Phase 3 only captures
  errors into the JSON log stream — there's no dashboard, no email/
  Slack alert, no minified-stack symbolication. Revisit when traffic
  or a second operator makes log-tailing insufficient. Likely options
  in priority order:
  - **Sentry** (hosted SaaS, generous free tier, ~2 SDK calls + a
    Vite plugin to add)
  - **GlitchTip** (open-source, Sentry-API-compatible, self-host as a
    Docker service if SaaS is the friction)
  - **Hosted log shippers** (Better Stack / Axiom / Logtail) — point
    the existing JSON logs at them; weaker for frontend stack traces.
