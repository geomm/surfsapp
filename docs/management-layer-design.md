# Management Layer Design

Plan for adding a managerial / operational tier to surfsapp: an admin CRUD
panel, DB inspection tooling, and error monitoring across frontend + backend.

---

## Project snapshot

**Monorepo, three Docker services**

- `ui/` — Vue 3 + Vite + Pinia + Lit + Dexie + MapLibre, PWA via vite-plugin-pwa
- `backend/` — Express + Mongoose, `node-cron` scheduler, custom JSON logger
  with request-id `AsyncLocalStorage`, worker-thread fetcher
- `mongo` — vanilla `mongo:7` with an init script seeding `beaches`,
  `forecastsnapshots`, `settings` collections

**What already exists at the managerial layer**

- `backend/src/routes/admin.ts` — single `POST /admin/fetch-forecasts`
  endpoint, **no auth**
- `db/mongo-init.js` creates a `settings` collection that has no Mongoose
  model wired up yet
- Custom logger (`lib/log.ts`) with request-scoped `AsyncLocalStorage` —
  Sentry can hook into this for trace/log correlation
- Mongo port `27017` is already published on the host, so Compass works
  out of the box

**Gotchas to resolve before adding tools**

- `.env` is committed (the project-root `.gitignore` is only 89 bytes).
  Once we introduce Sentry DSNs and an AdminJS session secret we want
  `.env` ignored and a `.env.example` that lists the new vars.
- The existing `/admin` Express route will collide with AdminJS's default
  mount point — the trigger endpoint needs to move under `/admin/api/*`
  (or be renamed) before AdminJS lands.
- CORS is locked to `http://localhost:5173`. The AdminJS panel is served
  same-origin from the backend so it's unaffected; the Sentry browser SDK
  posts directly to its ingest host and is unaffected too.

---

## 1. AdminJS — `/admin` CRUD panel

**Packages**

- `adminjs`
- `@adminjs/express`
- `@adminjs/mongoose`
- `express-session`
- `express-formidable`

**Resources**

- `Beach` — full CRUD, with grouped editing for swell windows, weights,
  and skill level enums (validation comes for free from the Mongoose
  schema in `backend/src/models/Beach.ts`).
- `ForecastSnapshot` — read-only (this is derived data). Expose a custom
  action **"Regenerate"** that calls the existing `triggerForecastFetch`
  for the selected `beachId`.

**Auth**

- `AdminJS.buildAuthenticatedRouter` with `ADMIN_EMAIL` and a bcrypt-hashed
  `ADMIN_PASSWORD_HASH` from env.
- Session secret from env (`SESSION_SECRET`), backed by an in-memory
  store for MVP. Move to a Mongo-backed session store if/when the panel
  is exposed beyond localhost.

**Route reshuffle**

- Move the existing `adminRouter` mount from `/admin` →
  `/admin/api/fetch-forecasts`, freeing `/admin` for the AdminJS UI.

**New env vars**

| Var                   | Purpose                           |
| --------------------- | --------------------------------- |
| `ADMIN_EMAIL`         | Login email for the panel         |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the login password |
| `SESSION_SECRET`      | express-session signing secret    |

**Tradeoff**

AdminJS pulls in ~40 MB of deps and a React build for the panel. The
lighter alternative is **mongo-express** (separate Docker service,
generic CRUD, no app-aware validation). AdminJS wins when we want
validation that respects the `IBeach` schema (enums, weight bounds,
direction tuples). Pick AdminJS unless we're about to ship to a tiny
host where the dep weight matters.

---

## 2. MongoDB Compass — zero-code

No code changes required.

**Documentation only** — add a section to `README.md` under
"Where things live":

- Connection string: `mongodb://localhost:27017/surfsapp` (host port
  already exposed by `docker-compose.yml`).
- Suggested saved favourite scoped to the `surfsapp` DB.

**Optional follow-up**

- Add a read-only Mongo user by extending `backend/src/db/mongo-init.js`
  if we want a credentialed connection rather than the default no-auth
  setup. Useful before any non-localhost exposure.

---

## 3. Sentry — frontend + backend

**Backend**

- Add `@sentry/node`.
- Initialise in `backend/src/index.ts` **before** any other imports we
  want instrumented (Express, Mongoose, Morgan).
- Call `Sentry.setupExpressErrorHandler(app)` after routes are mounted.
- Tag spans/events with `requestId` pulled from the existing
  `requestContext` ALS in `backend/src/lib/log.ts` so JSON logs and
  Sentry events line up by request id.

**Frontend**

- Add `@sentry/vue`.
- Initialise in `ui/src/main.ts` before `app.mount('#app')`.
- Enable `browserTracingIntegration` and the Vue Router integration.
- Gate enablement on `import.meta.env.PROD` so dev noise doesn't ship.

**Source maps**

- UI: add `@sentry/vite-plugin` to `ui/vite.config.ts` to upload maps
  during a prod build.
- Backend: `tsx` runs source directly today, so no map upload step is
  required yet. Revisit when we move backend to a `tsc`-built artifact.

**New env vars**

| Var                  | Where used | Notes                               |
| -------------------- | ---------- | ----------------------------------- |
| `SENTRY_DSN_BACKEND` | backend    | DSN for the Node project            |
| `VITE_SENTRY_DSN`    | ui (build) | DSN for the Vue project             |
| `SENTRY_ENVIRONMENT` | both       | `development` / `production`        |
| `SENTRY_AUTH_TOKEN`  | build-time | Required only for source-map upload |

---

## Suggested order

1. **Compass first** — pure docs change, smallest blast radius, useful
   immediately for inspecting the data we'll be editing in step 3.
2. **`.env` / `.gitignore` hygiene** — ignore `.env`, commit a
   `.env.example` with the variables we have today plus the new ones
   from steps 3 and 4.
3. **Sentry** — additive, touches both apps but won't break existing
   behaviour.
4. **AdminJS** — biggest dep footprint, requires the `/admin` route
   reshuffle, depends on the `.env` hygiene from step 2.

---

## Out of scope (for now)

- Multi-user admin auth / RBAC — single shared admin account is enough
  until there's a second operator.
- Audit log of admin mutations — revisit once AdminJS is in and we have
  a feel for which collections get edited by hand.
- Exposing the panel beyond localhost — needs HTTPS, a proper session
  store, and rate limiting first.
