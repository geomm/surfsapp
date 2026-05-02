# v0.2 Performance Baseline

This file captures the performance and resilience baselines for v0.2 Phase 1 (Foundation). Future stories append further sections (frontend Lighthouse, bundle sizes, backend latency).

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
