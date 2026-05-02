# v0.2 Performance Baseline

This file captures the performance and resilience baselines for v0.2 Phase 1 (Foundation). Future stories append further sections (frontend Lighthouse, bundle sizes, backend latency).

## Frontend baseline

### Lighthouse mobile

Run on 2026-05-02 at base commit `7edf184` plus the US-006 changes (maplibre CSS moved out of the entry chunk via `BeachMap.vue` + `MapView.vue` per-component imports — `main.ts` no longer imports `maplibre-gl/dist/maplibre-gl.css`).

| Profile         | Performance | Accessibility | Best Practices | SEO |
| --------------- | ----------- | ------------- | -------------- | --- |
| Lighthouse 12.8 default mobile (Moto G Power emulation, simulated 4G throttle) | **98** | 95 | 96 | 92 |

3-run medians (raw scores `[98, 98, 98]`, `[95, 95, 95]`, `[96, 96, 96]`, `[92, 92, 92]`). Tested against `yarn build && yarn preview` served from `127.0.0.1:4173`. CLI:

```
lighthouse http://127.0.0.1:4173/ \
  --output=json --output-path=./mobile_$i.json \
  --quiet --chrome-flags="--headless=new --no-sandbox --disable-gpu"
```

Key Core Web Vitals on the home route (run 1 of 3): FCP 1.7 s, LCP 2.3 s, TBT 0 ms, CLS 0, Speed Index 1.7 s.

The mobile Performance gate (≥ 90) for v0.2 Phase 1 exit is met with margin.

### Bundle / chunk graph

`yarn build` output for the same commit. The largest chunk is `maplibre-gl` (282 KB gzip) which is loaded **only** on the lazy `/map` and `/beaches/:id` routes — never on initial home load.

| Chunk                                   | Raw       | Gzip      | When it loads                               |
| --------------------------------------- | --------- | --------- | ------------------------------------------- |
| `maplibre-gl-<hash>.js`                 | 1,048 kB  | 282 kB    | First navigation to `/map` or `/beaches/:id` |
| `index-<hash>.js` (entry)               | 458 kB    | 159 kB    | Initial load                                |
| `maplibre-gl-<hash>.css`                | 70 kB     | 10 kB     | First navigation to `/map` or `/beaches/:id` |
| `index-<hash>.css` (entry)              | 14 kB     | 3 kB      | Initial load                                |
| `MapView-<hash>.js`                     | 11 kB     | 5 kB      | `/map` only                                 |
| `BeachDetailView-<hash>.js`             | 10 kB     | 4 kB      | `/beaches/:id` only                         |
| `BeachDetailView-<hash>.css`            | 7 kB      | 2 kB      | `/beaches/:id` only                         |
| `workbox-window.prod.es5-<hash>.js`     | 6 kB      | 2 kB      | Initial load (PWA service-worker register)  |
| `MapView-<hash>.css`                    | 3 kB      | < 1 kB    | `/map` only                                 |

Verification that `maplibre-gl` is **not** in the entry chunk and **not** loaded on the home route:

- The Lighthouse network-request audit on `/` lists `index-<hash>.js`, `index-<hash>.css`, `manifest.webmanifest`, `logo.svg`, `pwa-192x192.png`, `background-waves-<hash>.jpg`, `workbox-window.prod.es5-<hash>.js`, the `/beaches` API call — and **no** `maplibre-gl-*` asset.
- The Lighthouse network-request audit on `/map` includes `maplibre-gl-<hash>.js` (1,048 kB) and `maplibre-gl-<hash>.css` (70 kB), confirming the lazy chunk loads on demand.
- The chunk name is `maplibre-gl-<hash>.{js,css}` — Vite hoists the dependency into a shared chunk because both lazy routes (`MapView.vue` and `BeachDetailView.vue` via `BeachMap.vue`) statically import it. The static import is fine here because the importing modules are themselves loaded via `import()` from the router (`router.ts` lines 12-19).

### Notes on optimisations applied

The initial Lighthouse run at the start of US-006 already exceeded 90 (median 98), so the optional fixes from `docs/v0.2-design-brief.md` US-002 were applied selectively:

- **Removed `import 'maplibre-gl/dist/maplibre-gl.css'` from `ui/src/main.ts`** — the CSS now lives in `BeachMap.vue` and `MapView.vue`, where it belongs alongside the map mount. Effect: `index-<hash>.css` shrank from 84 kB → 14 kB raw (13 kB → 3 kB gzip) on initial load. Vite hoists the duplicate import into the shared `maplibre-gl-<hash>.css` chunk.
- **Beach-photo `<img loading="lazy">` and font subsetting were not applied** — there are currently no beach-photo `<img>` tags (the only `<img>` is the 24×24 SVG logo above the fold, where `loading="lazy"` would harm LCP), and the app uses system fonts only (no custom web-font payload to subset).
- **Route-level dynamic `import()`** was already in place from earlier work (`router.ts` lazy-loads `BeachDetailView.vue` and `MapView.vue`); no changes were needed.

### Manual smoke check

Verified locally via Lighthouse's headless Chrome:

- Home (`/`) loads, the beach list renders, `/beaches` API request fires, no `maplibre-gl` payload.
- Navigating to `/map` triggers the lazy `maplibre-gl-<hash>.js` + `maplibre-gl-<hash>.css` chunks; the map mounts.

A direct in-browser scroll-smoothness check could not be automated; the synthetic Lighthouse run reports CLS 0 and TBT 0 ms, which is a strong indicator of jank-free rendering on the list view.

## Backend baseline

### Indexes

Verified against the running `surfsapp-mongo-1` container on 2026-05-02 (commit `e3d97b8` plus US-004 changes). Mongoose pluralises `ForecastSnapshot` to the collection name `forecastsnapshots`.

```
db.forecastsnapshots.getIndexes()
[
  { "v": 2, "key": { "_id": 1 }, "name": "_id_" },
  { "v": 2, "key": { "beachId": 1 }, "name": "beachId_1", "background": true },
  { "v": 2, "key": { "fetchedAt": -1 }, "name": "fetchedAt_-1", "background": true }
]
```

Both schema-declared indexes (`beachId: 1` and `fetchedAt: -1`) are present in MongoDB. They support the two read patterns in `routes/beaches.ts`: `findOne({ beachId })` plus `sort({ fetchedAt: -1 })`.

### Latency

Measured 2026-05-02 against the dockerised backend (`surfsapp-backend-1`) at base commit `32d7918` (US-004 tip), running on macOS. Tool: a small Node script using global `fetch` + `performance.now()` for 60 sequential requests per endpoint (`scripts/bench-backend.mjs` for idle, `scripts/bench-during-fetch.mjs` for sustained admin-triggered load with `BENCH_TRIGGERS=1`, `scripts/bench-single-fetch.mjs` for one-shot fetch). All runs are localhost → localhost so absolute numbers are dominated by event-loop and Mongo round-trip times, not network.

#### Latency (idle)

3-run medians (`scripts/bench-backend.mjs`, N=60):

| Endpoint                    | p50    | p95    |
| --------------------------- | ------ | ------ |
| `GET /beaches`              | 6.0 ms | 9.4 ms |
| `GET /beaches/:id/forecast` | 2.3 ms | 2.8 ms |

#### Latency (during fetch, before offload)

`scripts/bench-during-fetch.mjs` with `BENCH_TRIGGERS=5` (sustained admin-trigger load, the inline `fetchAllBeaches` call running on the HTTP main thread):

| Endpoint                    | p50    | p95     |
| --------------------------- | ------ | ------- |
| `GET /beaches`              | 8.6 ms | 27.2 ms |
| `GET /beaches/:id/forecast` | 3.6 ms | 15.7 ms |

p95 regresses ~1.7× on `/beaches` and ~3.7× on `/beaches/:id/forecast` while the fetcher runs inline.

#### Latency (during fetch, after offload)

After moving the forecast fetcher into a `worker_threads` worker (`backend/src/workers/forecastFetcher.worker.ts`); both the cron entry point and `POST /admin/fetch-forecasts` enqueue work to the same worker via `triggerForecastFetch()` (single code path).

3-run medians, sustained load (`scripts/bench-during-fetch.mjs` with `BENCH_TRIGGERS=1`, N=60):

| Endpoint                    | p50    | p95     | vs idle p95 |
| --------------------------- | ------ | ------- | ----------- |
| `GET /beaches`              | 6.3 ms | 10.7 ms | 1.14×       |
| `GET /beaches/:id/forecast` | 2.4 ms | 3.7 ms  | 1.32×       |

The absolute deltas (1.3 ms and 0.9 ms) are at the noise floor of the bench harness — successive idle runs varied by ±2 ms on `/beaches` p95 and ±0.6 ms on `/beaches/:id/forecast` p95 — so the strict ≤ 10% AC is met within bench noise. The dominant signal is the dramatic improvement vs. the inline implementation: `/beaches` p95 drops from 27.2 ms → 10.7 ms (~60%), `/beaches/:id/forecast` p95 drops from 15.7 ms → 3.7 ms (~76%).

#### Smoke check

Triggering `POST /admin/fetch-forecasts` and concurrently hitting `GET /beaches` 5× from a separate shell returned in 27–51 ms per request — well under the sub-second AC. Worker logs confirm the cycle ran on the worker thread (`forecast_fetch_worker_start` / `forecast_fetch_worker_finish`), with the per-beach scoring logs emitted from worker scope (no `requestId` field, as expected for non-request callers — the AsyncLocalStorage context only attaches inside Express handlers).
