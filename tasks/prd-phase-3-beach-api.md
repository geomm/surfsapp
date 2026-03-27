# PRD: Phase 3 — Backend: Beach Profiles + API Skeleton

## Introduction

Stand up the beach data layer on the backend: a curated `beach_profiles.json` file seeded into MongoDB via a manual seed script, two Mongoose models (`Beach` and `ForecastSnapshot`), and three REST endpoints that serve beach metadata and stub forecast data. By the end of Phase 3, the frontend can fetch a beach listing with scores and individual beach detail — even though real forecast computation doesn't happen until Phase 4.

---

## Goals

- All 8 curated Greek beach profiles stored in `beach_profiles.json` and seedable into MongoDB
- Mongoose models for `Beach` and `ForecastSnapshot` with full TypeScript types
- `npm run seed` script that upserts beaches and creates one stub `ForecastSnapshot` per beach for development
- Three REST endpoints:
  - `GET /beaches` — list all beaches with current score from latest snapshot
  - `GET /beaches/:id` — full beach profile + current score
  - `GET /beaches/:id/forecast` — latest ForecastSnapshot for that beach
- `npm run typecheck` passes with zero errors

---

## Data Shapes

### Beach document (stored in MongoDB `beaches` collection)

The Beach document stores the full profile. Field names match `docs/beach-profiles.md` exactly.

```typescript
interface IBeach {
  id: string                           // kebab-case unique identifier (e.g. "mesachti-ikaria")
  name: string                         // display name
  coords: { lat: number; lon: number }
  offshoreCoords?: { lat: number; lon: number }
  region: string
  description: string
  shorelineNormalDeg: number
  idealSwellDirection: [number, number]
  acceptableSwellDirection: [number, number]
  minSwellHeightM: number
  idealSwellHeightM: [number, number]
  minSwellPeriodS: number
  idealSwellPeriodS: [number, number]
  maxOnshoreWindKmh: number
  idealWindDescription: 'offshore-or-light' | 'any-light' | 'offshore-only' | 'wave-generating-onshore'
  windScoringLogic?: Record<string, unknown>  // typed loosely — scorer will parse in Phase 5
  weights: {
    swellDirection: number
    swellPeriod: number
    swellHeight: number
    wind: number
    tide: number
  }
  sheltered: boolean
  longPeriodSwellRefracts: boolean
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  notes?: string
}
```

### ForecastSnapshot document (stored in MongoDB `forecastsnapshots` collection)

```typescript
interface IHourlyForecast {
  timestamp: Date
  rawData: Record<string, unknown>
  surfScore: number                    // 0–100
  label: 'poor' | 'maybe' | 'good' | 'very-good'
  reasons: string[]
}

interface IDailySummary {
  date: string                         // ISO date string, e.g. "2026-03-27"
  bestWindowStart: string              // ISO datetime
  bestWindowEnd: string                // ISO datetime
  peakScore: number
  overallLabel: 'poor' | 'maybe' | 'good' | 'very-good'
}

interface IForecastSnapshot {
  beachId: string                      // references Beach.id
  fetchedAt: Date
  hourlyForecasts: IHourlyForecast[]
  dailySummaries: IDailySummary[]
}
```

### API response shapes

**GET /beaches** — array of beach summary objects:
```json
[
  {
    "id": "mesachti-ikaria",
    "name": "Mesachti, Ikaria",
    "region": "Aegean — Eastern (Ikaria)",
    "coords": { "lat": 37.6302, "lon": 26.0953 },
    "skillLevel": "intermediate",
    "tags": ["beach-break", "north-facing", "meltemi", "aegean", "surf-school"],
    "currentScore": 65,
    "currentLabel": "good",
    "lastUpdated": "2026-03-27T10:00:00.000Z"
  }
]
```
`currentScore`, `currentLabel`, and `lastUpdated` come from the first entry of `hourlyForecasts[]` in the latest `ForecastSnapshot` for that beach. If no snapshot exists, these fields are `null`.

**GET /beaches/:id** — full beach profile + current score:
```json
{
  "id": "mesachti-ikaria",
  "name": "Mesachti, Ikaria",
  "region": "Aegean — Eastern (Ikaria)",
  "coords": { "lat": 37.6302, "lon": 26.0953 },
  "description": "...",
  "shorelineNormalDeg": 0,
  "idealSwellDirection": [340, 20],
  "acceptableSwellDirection": [310, 50],
  "minSwellHeightM": 0.5,
  "idealSwellHeightM": [0.8, 2.0],
  "minSwellPeriodS": 5,
  "idealSwellPeriodS": [6, 10],
  "maxOnshoreWindKmh": 25,
  "idealWindDescription": "wave-generating-onshore",
  "skillLevel": "intermediate",
  "tags": ["beach-break", "north-facing", "meltemi"],
  "currentScore": 65,
  "currentLabel": "good",
  "lastUpdated": "2026-03-27T10:00:00.000Z"
}
```
Returns HTTP 404 `{ error: 'Beach not found' }` if `:id` does not exist.

**GET /beaches/:id/forecast** — latest ForecastSnapshot:
```json
{
  "beachId": "mesachti-ikaria",
  "fetchedAt": "2026-03-27T10:00:00.000Z",
  "hourlyForecasts": [
    {
      "timestamp": "2026-03-27T10:00:00.000Z",
      "rawData": {},
      "surfScore": 65,
      "label": "good",
      "reasons": ["Stub data — real forecast available after Phase 4"]
    }
  ],
  "dailySummaries": [
    {
      "date": "2026-03-27",
      "bestWindowStart": "2026-03-27T09:00:00.000Z",
      "bestWindowEnd": "2026-03-27T13:00:00.000Z",
      "peakScore": 65,
      "overallLabel": "good"
    }
  ]
}
```
Returns HTTP 404 `{ error: 'No forecast data for this beach' }` if no snapshot exists.

---

## Stub Score Generation (seed script)

The seed script creates one `ForecastSnapshot` per beach for development. Stub score values must be deterministic (not random) so that repeated seeding produces the same output. Use this mapping by beach ID:

```
vouliagmeni-athens      → score: 42,  label: "maybe"
mesachti-ikaria         → score: 71,  label: "good"
langouvardos-filiatra   → score: 58,  label: "maybe"
falasarna-crete         → score: 83,  label: "very-good"
palaiohora-crete        → score: 35,  label: "poor"
agios-georgios-naxos    → score: 61,  label: "good"
kokkino-limanaki-rafina → score: 48,  label: "maybe"
kolimpithra-tinos       → score: 77,  label: "good"
```

The stub snapshot sets `fetchedAt` to the time the seed script runs and creates one `hourlyForecast` entry at that timestamp and one `dailySummary` for today's date.

---

## User Stories

### US-001: beach_profiles.json
**Description:** As a developer, I want the curated beach profiles stored as a JSON file in the backend so that the seed script and any future tooling can read them without hitting the database.

**Acceptance Criteria:**
- [ ] `backend/src/data/beach_profiles.json` created containing a JSON array of exactly 8 beach objects
- [ ] The 8 beaches (in order): `vouliagmeni-athens`, `mesachti-ikaria`, `langouvardos-filiatra`, `falasarna-crete`, `palaiohora-crete`, `agios-georgios-naxos`, `kokkino-limanaki-rafina`, `kolimpithra-tinos`
- [ ] Each beach object matches the schema in `docs/beach-profiles.md` exactly — field names, types, and values are copied verbatim from the profiles documented there
- [ ] The file is valid JSON (parseable with `JSON.parse`)
- [ ] Typecheck passes (`npm run typecheck`)

### US-002: Mongoose models — Beach and ForecastSnapshot
**Description:** As a developer, I want Mongoose schemas and TypeScript interfaces for Beach and ForecastSnapshot so that all database operations are type-safe.

**Acceptance Criteria:**
- [ ] `backend/src/models/Beach.ts` created, exporting:
  - `IBeach` TypeScript interface matching the schema defined in this PRD
  - `BeachSchema` Mongoose schema with all fields typed
  - `Beach` Mongoose model (`mongoose.model<IBeach>('Beach', BeachSchema)`)
  - Schema uses `id` (string, required, unique) as the primary identifier — NOT MongoDB's `_id`
- [ ] `backend/src/models/ForecastSnapshot.ts` created, exporting:
  - `IHourlyForecast`, `IDailySummary`, `IForecastSnapshot` TypeScript interfaces
  - `ForecastSnapshotSchema` Mongoose schema
  - `ForecastSnapshot` Mongoose model
  - Schema indexes `beachId` for fast lookup; indexes `fetchedAt` descending for latest-first queries
- [ ] Both model files are importable from `backend/src/index.ts` without errors
- [ ] Typecheck passes

### US-003: Seed script — upsert beaches and stub forecasts
**Description:** As a developer, I want an `npm run seed` script that populates MongoDB with all 8 beach profiles and one stub ForecastSnapshot per beach so that the API returns meaningful data immediately after setup.

**Acceptance Criteria:**
- [ ] `backend/src/scripts/seed.ts` created
- [ ] Script reads `beach_profiles.json`, upserts all 8 beaches into the `beaches` collection using `Beach.findOneAndUpdate({ id: beach.id }, beach, { upsert: true, new: true })`
- [ ] Script creates one `ForecastSnapshot` per beach using the deterministic stub scores defined in this PRD — skips if a snapshot for that `beachId` already exists (idempotent)
- [ ] `"seed": "tsx src/scripts/seed.ts"` added to `backend/package.json` scripts
- [ ] Script connects to MongoDB using the same `connectDB()` function from `backend/src/db/connection.ts`, runs its operations, then exits cleanly (process.exit(0) on success)
- [ ] Running `npm run seed` twice in a row does not create duplicate documents
- [ ] Script logs: `Seeded N beaches` and `Created M snapshots (K already existed)` to stdout
- [ ] Typecheck passes

### US-004: GET /beaches endpoint
**Description:** As a developer, I want a `GET /beaches` endpoint that returns all beaches with their current surf score so that the frontend beach listing has data to display.

**Acceptance Criteria:**
- [ ] `backend/src/routes/beaches.ts` created with an Express router
- [ ] `GET /beaches` implemented: queries all beaches from MongoDB, for each beach fetches the latest ForecastSnapshot (sort `fetchedAt: -1`, limit 1), assembles the summary response shape defined in this PRD
- [ ] Response is a JSON array sorted by `currentScore` descending (best surf first); beaches with no snapshot sort to the end with `currentScore: null`
- [ ] Router mounted in `backend/src/index.ts` at `/` — full path is `GET /beaches`
- [ ] `curl http://localhost:3000/beaches` returns HTTP 200 with a JSON array of 8 beach summaries after `npm run seed` has been run
- [ ] Typecheck passes

### US-005: GET /beaches/:id endpoint
**Description:** As a developer, I want a `GET /beaches/:id` endpoint that returns a single beach's full profile plus current score so that the frontend detail view has all the data it needs.

**Acceptance Criteria:**
- [ ] `GET /beaches/:id` implemented in `backend/src/routes/beaches.ts`
- [ ] Returns the full beach document (all profile fields) plus `currentScore`, `currentLabel`, and `lastUpdated` from the latest ForecastSnapshot
- [ ] Returns HTTP 404 `{ "error": "Beach not found" }` if `:id` does not match any beach
- [ ] `curl http://localhost:3000/beaches/mesachti-ikaria` returns HTTP 200 with the full Mesachti profile and `currentScore: 71, currentLabel: "good"`
- [ ] `curl http://localhost:3000/beaches/nonexistent` returns HTTP 404
- [ ] Typecheck passes

### US-006: GET /beaches/:id/forecast endpoint
**Description:** As a developer, I want a `GET /beaches/:id/forecast` endpoint that returns the latest ForecastSnapshot for a beach so that the frontend can display forecast data (stub in Phase 3, real data in Phase 4+).

**Acceptance Criteria:**
- [ ] `GET /beaches/:id/forecast` implemented in `backend/src/routes/beaches.ts`
- [ ] Returns the latest `ForecastSnapshot` document for the given `beachId` (sort `fetchedAt: -1`, limit 1)
- [ ] Returns HTTP 404 `{ "error": "No forecast data for this beach" }` if no snapshot exists
- [ ] Returns HTTP 404 `{ "error": "Beach not found" }` if the beach ID itself does not exist in the `beaches` collection
- [ ] `curl http://localhost:3000/beaches/mesachti-ikaria/forecast` returns HTTP 200 with a ForecastSnapshot containing one hourlyForecast entry and one dailySummary
- [ ] Typecheck passes

---

## Functional Requirements

- FR-1: `beach_profiles.json` must be read at seed time — not at server startup. The server does not load beach profiles from disk on boot; it reads from MongoDB
- FR-2: The `beaches` collection uses the string `id` field (not MongoDB `_id`) as the primary business key for all queries and URL parameters
- FR-3: All three endpoints must return `Content-Type: application/json`
- FR-4: The seed script must be safe to run multiple times without creating duplicates (upsert for beaches, skip-if-exists for snapshots)
- FR-5: `GET /beaches` response must be sorted by `currentScore` descending — beaches with the best current conditions appear first
- FR-6: The beaches router is mounted in `index.ts` — no existing endpoints (`GET /health`) are changed or removed
- FR-7: All Mongoose queries must be `await`ed — no unhandled promise rejections
- FR-8: Mongoose model files must not import from `index.ts` (no circular dependencies)

---

## Non-Goals

- No real forecast data in Phase 3 — stub scores only
- No scoring engine in Phase 3 — scoring computation comes in Phase 5
- No frontend changes in Phase 3 — API only
- No cron job in Phase 3 — forecast fetching comes in Phase 4
- No authentication or rate limiting
- No pagination on `GET /beaches` — 8 beaches fits in one response
- No filtering or sorting options on the API — Phase 11

---

## Technical Considerations

- **Package manager:** backend uses `npm` (not yarn)
- **TypeScript execution:** `tsx` for dev, `tsc` for build — `npm run seed` uses `tsx` directly
- **Mongoose version:** already installed as `^8.0.0` — use Mongoose v8 API
- **MongoDB connection:** the seed script must call `connectDB()` from `backend/src/db/connection.ts` before any DB operations and disconnect after
- **`_id` vs `id`:** Mongoose adds `_id` automatically. The business identifier is `id` (string). API responses should omit `_id` and `__v` — use `.select('-_id -__v')` or `lean()` + manual projection
- **Direction ranges crossing 360°:** `idealSwellDirection: [340, 20]` is valid JSON — do not "fix" these values
- **`windScoringLogic` field:** stored as a flexible `Record<string, unknown>` in Mongoose — the Phase 5 scorer will parse the structure

---

## Folder Structure (target end state)

```
backend/src/
├── index.ts              ← mounts /beaches router
├── db/
│   ├── connection.ts     ← unchanged
│   └── mongo-init.js     ← unchanged
├── models/
│   ├── Beach.ts          ← new
│   └── ForecastSnapshot.ts ← new
├── routes/
│   └── beaches.ts        ← new (all 3 endpoints)
├── scripts/
│   └── seed.ts           ← new
└── data/
    └── beach_profiles.json ← new
```

---

## Success Metrics

- `curl http://localhost:3000/beaches` returns 8 beaches sorted by score after `npm run seed`
- `curl http://localhost:3000/beaches/falasarna-crete` returns score 83 / label "very-good"
- `curl http://localhost:3000/beaches/falasarna-crete/forecast` returns one hourly entry
- Running `npm run seed` twice produces no duplicate documents in MongoDB
- `npm run typecheck` passes with zero errors

---

## Open Questions

- None — all decisions made.
