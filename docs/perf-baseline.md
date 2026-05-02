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
