# PRD: Phase 4 — Backend: Forecast Fetching

## Introduction

Integrate the Open-Meteo Marine API into the backend so that real forecast data is fetched for all 8 beach profiles, stored as `ForecastSnapshot` documents in MongoDB, and kept fresh automatically. Phase 4 stores raw hourly data with placeholder surf scores (`surfScore: 0`, `label: 'poor'`). Real scoring is implemented in Phase 5.

The backend uses native `fetch` (Node 18+), `node-cron` for scheduling, and the existing `ForecastSnapshot` Mongoose model from Phase 3.

---

## Goals

- Fetch 10-day hourly marine forecast for all 8 beaches from Open-Meteo
- Persist raw forecast data as `ForecastSnapshot` documents (one per beach per fetch run)
- Run fetches automatically on server startup and every N hours (configurable via `FORECAST_INTERVAL_HOURS`, default 6)
- Expose `POST /admin/fetch-forecasts` for manual triggering
- All existing endpoints (`GET /beaches`, `GET /beaches/:id`, `GET /beaches/:id/forecast`) continue to serve data correctly after Phase 4

---

## User Stories

### US-001: Open-Meteo fetch service
**Description:** As a developer, I want a service module that fetches hourly marine forecast data for a single beach from Open-Meteo so that it can be called by the scheduler.

**Acceptance Criteria:**
- [ ] `backend/src/services/forecastFetcher.ts` created
- [ ] Exports `fetchForecastForBeach(beach: IBeach): Promise<IHourlyForecast[]>` function
- [ ] Uses native `fetch` (no axios or node-fetch) to call Open-Meteo Marine API
- [ ] Uses `beach.offshoreCoords` if present, otherwise falls back to `beach.coords`
- [ ] Open-Meteo URL constructed with `latitude`, `longitude`, `hourly` param containing all 8 variables: `swell_wave_height,swell_wave_period,swell_wave_direction,swell_wave_height_2,swell_wave_direction_2,wind_speed_10m,wind_direction_10m,wave_height`
- [ ] Also includes `&forecast_days=10&timezone=UTC` in the URL
- [ ] Maps each hourly time slot to `IHourlyForecast`: `timestamp` (Date from ISO string), `rawData` (object with all 8 variable values keyed by variable name), `surfScore: 0`, `label: 'poor'`, `reasons: ['Placeholder — scoring not yet implemented']`
- [ ] Returns the array of `IHourlyForecast` objects (up to 240 entries for 10 days × 24 hours)
- [ ] Throws a descriptive error (including beach id and HTTP status) if the Open-Meteo request fails
- [ ] Typecheck passes

**Notes:** Open-Meteo Marine API base URL: `https://marine-api.open-meteo.com/v1/marine`. No API key required. The response shape is `{ hourly: { time: string[], swell_wave_height: number[], ... } }` where each array has the same length and index corresponds to the same hour.

---

### US-002: ForecastSnapshot persistence
**Description:** As a developer, I want a service function that saves a new `ForecastSnapshot` for a beach so that the latest forecast is always available via the API.

**Acceptance Criteria:**
- [ ] `backend/src/services/forecastFetcher.ts` exports `saveForecastSnapshot(beachId: string, hourlyForecasts: IHourlyForecast[]): Promise<void>` function
- [ ] Creates a new `ForecastSnapshot` document with `beachId`, `fetchedAt: new Date()`, `hourlyForecasts` (the full array), and `dailySummaries: []` (empty for Phase 4 — daily summaries computed in Phase 5)
- [ ] Saves the document using `ForecastSnapshot.create()`
- [ ] Does NOT delete or replace previous snapshots — each fetch run appends a new document (latest is always found by sorting `fetchedAt: -1`)
- [ ] Typecheck passes

---

### US-003: fetchAllBeaches orchestrator
**Description:** As a developer, I want an orchestrator function that fetches and saves forecasts for all 8 beaches so that the scheduler and manual trigger can call a single function.

**Acceptance Criteria:**
- [ ] `backend/src/services/forecastFetcher.ts` exports `fetchAllBeaches(): Promise<void>` function
- [ ] Loads all beaches from MongoDB using `Beach.find({})`
- [ ] Fetches each beach sequentially (not `Promise.all`) to avoid rate limiting Open-Meteo
- [ ] For each beach: calls `fetchForecastForBeach(beach)`, then `saveForecastSnapshot(beach.id, hourlyForecasts)`
- [ ] Logs `Fetched forecast for [beach.id]` after each successful beach
- [ ] Catches and logs per-beach errors without aborting the remaining beaches (`console.error('Failed to fetch [beach.id]:', err)`)
- [ ] Logs `Forecast fetch complete: N/8 beaches updated` at the end (N = successfully updated count)
- [ ] Typecheck passes

---

### US-004: Scheduler — startup fetch + recurring cron
**Description:** As a developer, I want the backend to automatically fetch forecasts on startup and then on a recurring interval so that forecast data is always fresh without manual intervention.

**Acceptance Criteria:**
- [ ] `node-cron` package installed (`npm install node-cron`) and `@types/node-cron` installed as devDependency
- [ ] `backend/src/scheduler.ts` created, exporting `startScheduler(): void`
- [ ] Reads `FORECAST_INTERVAL_HOURS` from `process.env`, defaults to `6` if absent or invalid
- [ ] Constructs a cron expression for every N hours: `0 */${hours} * * *`
- [ ] Schedules `fetchAllBeaches()` using `node-cron.schedule()`
- [ ] `startScheduler()` also calls `fetchAllBeaches()` immediately on invocation (so data is fresh on first boot without waiting for the first cron tick)
- [ ] `startScheduler()` is called in `backend/src/index.ts` after `connectDB()` resolves
- [ ] Logs `Scheduler started — fetching every ${hours}h` on startup
- [ ] `FORECAST_INTERVAL_HOURS=3` added to `.env.example` with a comment: `# How often to fetch forecasts (hours, default 6)`
- [ ] Typecheck passes

**Notes:** Call `startScheduler()` inside the `.then()` or `await` after `connectDB()` — not before, since `fetchAllBeaches()` needs the DB connection. The immediate call on startup means the Docker container fetches real data within seconds of starting, replacing stub snapshots.

---

### US-005: POST /admin/fetch-forecasts endpoint
**Description:** As a developer, I want a manual trigger endpoint so that I can force a forecast refresh during development or testing without restarting the server.

**Acceptance Criteria:**
- [ ] `backend/src/routes/admin.ts` created with an Express Router
- [ ] `POST /admin/fetch-forecasts` implemented: calls `fetchAllBeaches()` and returns `{ message: 'Forecast fetch triggered' }` immediately (does not wait for fetch to complete — fire and forget)
- [ ] Router mounted in `backend/src/index.ts`: `app.use('/admin', adminRouter)` — full endpoint path is `POST /admin/fetch-forecasts`
- [ ] `curl -X POST http://localhost:3000/admin/fetch-forecasts` returns HTTP 200 with `{ "message": "Forecast fetch triggered" }` while the background fetch runs
- [ ] Typecheck passes

---

## Functional Requirements

- FR-1: Use native Node.js `fetch` — no axios, got, or node-fetch
- FR-2: Open-Meteo Marine API base URL: `https://marine-api.open-meteo.com/v1/marine` — no API key needed
- FR-3: 8 hourly variables fetched per beach: `swell_wave_height`, `swell_wave_period`, `swell_wave_direction`, `swell_wave_height_2`, `swell_wave_direction_2`, `wind_speed_10m`, `wind_direction_10m`, `wave_height`
- FR-4: Use `beach.offshoreCoords` if present, else `beach.coords` for the API lat/lon
- FR-5: Each hourly entry stored with `surfScore: 0`, `label: 'poor'`, `reasons: ['Placeholder — scoring not yet implemented']`
- FR-6: `dailySummaries` stored as empty array `[]` — computed in Phase 5
- FR-7: Each fetch run creates a new `ForecastSnapshot` — old snapshots are not deleted
- FR-8: Beaches fetched sequentially to be polite to the free Open-Meteo API
- FR-9: Per-beach errors are logged but do not abort the run for remaining beaches
- FR-10: `FORECAST_INTERVAL_HOURS` env var controls cron interval (default: `6`)
- FR-11: Server fetches all beaches immediately on startup, then repeats on cron schedule
- FR-12: `POST /admin/fetch-forecasts` triggers a fire-and-forget fetch, returns 200 immediately

---

## Non-Goals

- No surf score computation (Phase 5)
- No daily summary computation (Phase 5)
- No per-beach fetch scheduling (all beaches on one schedule)
- No authentication on the admin endpoint
- No rate limiting or retry logic (future improvement)
- No tide data (not yet available from Open-Meteo Marine)

---

## Technical Considerations

- `node-cron` is the only new dependency — it's lightweight and widely used in Node.js
- `connectDB()` in `index.ts` currently returns `void` from a `.catch()` chain — the scheduler call needs to be placed after the connection succeeds, not at module load time. Refactor `connectDB()` call in `index.ts` to use `await` or `.then()` so `startScheduler()` runs only after the connection is established
- Open-Meteo `time` array contains ISO 8601 strings like `"2026-03-27T00:00"` (no Z suffix) — parse as UTC by appending `Z` or using `new Date(time + 'Z')`
- Forecast response has ~240 hourly entries (10 days × 24h). The `IHourlyForecast[]` array in each snapshot may be large — this is expected and acceptable for Phase 4

---

## Success Metrics

- After `docker compose up`, `GET /beaches` returns beaches with non-null `currentScore` within ~30 seconds (once the startup fetch completes)
- `GET /beaches/mesachti-ikaria/forecast` returns a snapshot with `hourlyForecasts` containing ~240 entries
- Each hourly entry has all 8 raw data fields populated with real numeric values from Open-Meteo
- `POST /admin/fetch-forecasts` returns 200 and a new snapshot appears in MongoDB within ~30 seconds

---

## Open Questions

- Should we add a `GET /admin/fetch-status` endpoint to check when the last fetch ran? (Nice-to-have, defer to Phase 5 if needed)
- Should old `ForecastSnapshot` documents be pruned after N days? (Defer — storage is not a concern in Phase 4)
