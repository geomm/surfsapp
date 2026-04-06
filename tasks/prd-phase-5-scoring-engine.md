# PRD: Phase 5 — Backend: Scoring Engine

## Introduction

Implement the rule-based surfability scoring engine that evaluates each hourly forecast against a beach's profile and produces a 0–100 surf score, a human-readable label, reasons array, and confidence value. The scorer also computes daily summaries (best window per day). This replaces the placeholder `surfScore: 0 / label: 'poor'` values from Phase 4 with real computed scores.

The algorithm follows `docs/scoring-engine.md` exactly: hard gates → subscores → weighted sum → label → reasons. Each beach's weights and thresholds are read from its profile.

---

## Goals

- Score every hourly forecast entry for each beach using the beach's profile thresholds and weights
- Apply hard gates (swell direction, swell height, wave-generating-onshore) that short-circuit to `score: 0` when conditions are fundamentally broken
- Compute subscores for swell direction, swell period, swell height, and wind (0–100 each)
- Apply per-beach weights to produce a final weighted score (0–100)
- Map score to label: poor / maybe / good / very-good
- Generate human-readable reasons array per hour
- Compute confidence per hour: `1.0 - (hoursFromNow / 240)`
- Compute daily summaries with a variable 2–4 hour best-window search
- Strongly type `windScoringLogic` in the `IBeach` interface (replacing `Record<string, unknown>`)
- Wire scoring into the forecast fetcher pipeline so saved snapshots contain real scores

---

## User Stories

### US-001: Strongly type IWindScoringLogic and update IBeach
**Description:** As a developer, I want `windScoringLogic` to be a properly typed interface so the scorer can access its fields without casting or guessing.

**Acceptance Criteria:**
- [ ] `IWindScoringLogic` interface created in `backend/src/models/Beach.ts` with the following shape:
  ```
  {
    type: 'wave-generating-onshore'
    swellGeneratingWind: { directionDeg: number, directionLabel: string, minSpeedKmh: number, comment: string }
    qualityMultiplier: { triggerWind: string, triggerDirectionDeg: number, effect: 'increase' | 'decrease', comment: string }
    messinesspenalty: { triggerWind: string, thresholdSpeedKmh: number, effect: 'increase' | 'decrease', comment: string }
    optimalScenario: string
  }
  ```
- [ ] `IBeach.windScoringLogic` type changed from `Record<string, unknown>` to `IWindScoringLogic | undefined`
- [ ] `BeachSchema.windScoringLogic` updated with a nested sub-schema matching the interface (not `Schema.Types.Mixed`)
- [ ] `IHourlyForecast` in `ForecastSnapshot.ts` updated: add `confidence: number` field (required)
- [ ] `HourlyForecastSchema` updated: add `confidence: { type: Number, required: true }`
- [ ] Existing code still compiles — check `forecastFetcher.ts` (add `confidence: 0` to the placeholder object alongside existing `surfScore: 0`)
- [ ] Typecheck passes

**Notes:** The field name in beach_profiles.json is `messinesspenalty` (lowercase 'p') — match this exactly in the interface. Do NOT rename it to camelCase.

---

### US-002: Angular distance utility and hard gates
**Description:** As a developer, I want a scoring engine module with angular distance helpers and hard gate checks so the scorer can short-circuit on deal-breaker conditions.

**Acceptance Criteria:**
- [ ] `backend/src/services/scoringEngine.ts` created
- [ ] Exports `angularDistance(a: number, b: number): number` — returns the shortest angle between two compass bearings (0–180), handles 360° wraparound
- [ ] Exports `isAngleInRange(angle: number, range: [number, number]): boolean` — returns true if `angle` falls within the [from, to] range, handles ranges that cross 360° (e.g. [340, 20] includes 350 and 10)
- [ ] Exports `applyHardGates(beach: IBeach, rawData: Record<string, unknown>): { gated: boolean, score: number, label: string, reason: string } | null` — returns a gate result if any gate triggers, or null if all gates pass
- [ ] Gate 1 — Swell direction: if `swell_wave_direction` is outside `beach.acceptableSwellDirection`, return `{ gated: true, score: 0, label: 'poor', reason: 'Swell direction blocked by land/orientation' }`
- [ ] Gate 2 — Swell height: if `swell_wave_height` < `beach.minSwellHeightM`, return `{ gated: true, score: 0, label: 'poor', reason: 'Swell too small (<Xm, min Ym)' }` where X is actual height and Y is the beach minimum
- [ ] Gate 3 — Wave-generating-onshore absent: if `beach.idealWindDescription === 'wave-generating-onshore'` AND forecast wind direction is NOT within ±30° of `beach.windScoringLogic.swellGeneratingWind.directionDeg` AND `swell_wave_height < beach.minSwellHeightM * 1.5`, return `{ gated: true, score: 5, label: 'poor', reason: 'Generating wind absent, no residual swell' }`
- [ ] Typecheck passes

**Notes:** `rawData` keys match Open-Meteo variable names: `swell_wave_direction`, `swell_wave_height`, `wind_direction_10m`, `wind_speed_10m`, etc. Cast values from `unknown` to `number` inside the function. If a required rawData field is missing or NaN, treat the gate as triggered (fail safe).

---

### US-003: Swell subscores — direction, period, height
**Description:** As a developer, I want functions that compute swell direction, period, and height subscores (0–100) so they can be combined into the final weighted score.

**Acceptance Criteria:**
- [ ] `scoringEngine.ts` exports `scoreSwellDirection(beach: IBeach, swellDir: number): number` — returns 0–100 using the continuous gradient from `docs/scoring-engine.md`: angle from ideal centre → 100 at dead centre, linear decay to 80 at ideal edge, 79→40 through acceptable range, 0 outside (already gated, but defensive)
- [ ] `scoreSwellDirection` handles direction ranges crossing 360° correctly (e.g. idealSwellDirection [340, 20])
- [ ] `scoringEngine.ts` exports `scoreSwellPeriod(beach: IBeach, period: number): number` — returns 0–100: below minSwellPeriodS → 0–20, between min and idealSwellPeriodS[0] → 20–60, inside ideal range → 70–100, above idealSwellPeriodS[1] → 60–80
- [ ] `scoringEngine.ts` exports `scoreSwellHeight(beach: IBeach, height: number): number` — returns 0–100: below min → 0 (gated), between min and idealSwellHeightM[0] → 20–70, inside ideal → 80–100, above ideal → penalty scaled by skillLevel (advanced: 50–70, intermediate: 30–55, beginner: 0–30)
- [ ] All three functions use linear interpolation between boundary values (not discrete buckets)
- [ ] Typecheck passes

**Notes:** For direction scoring, the "ideal centre" is the midpoint of `idealSwellDirection`. Computing the midpoint of a range crossing 360° requires modular arithmetic — e.g. midpoint of [340, 20] is 0 (not 180).

---

### US-004: Wind subscore — standard and wave-generating-onshore
**Description:** As a developer, I want a wind scoring function that handles both standard beaches (offshore = good) and wave-generating-onshore beaches (complex conditional logic) so all 8 beaches are scored correctly.

**Acceptance Criteria:**
- [ ] `scoringEngine.ts` exports `scoreWind(beach: IBeach, windDir: number, windSpeed: number): number` — returns 0–100
- [ ] For standard beaches (`idealWindDescription !== 'wave-generating-onshore'`): compute `windAngle` as angular distance from `wind_direction_10m` to `beach.shorelineNormalDeg`. Apply the lookup from `docs/scoring-engine.md`: glassy (<5 km/h any dir) → 100, light offshore (<30° and <15 km/h) → 90–100, moderate offshore → 70–85, strong offshore → 40–60, cross-shore (30–70°) → 40–70, onshore (70–120°) → 20–45, strong onshore (>120° and >20 km/h) → 0–20. Use linear interpolation within each band, not hard cutoffs.
- [ ] For wave-generating-onshore beaches: start from 50 (neutral baseline). Add +20 if wind is within ±20° of `swellGeneratingWind.directionDeg` AND speed >= `swellGeneratingWind.minSpeedKmh`. Add +25 if wind is within ±20° of `qualityMultiplier.triggerDirectionDeg`. Subtract 35 if wind is within ±20° of `swellGeneratingWind.directionDeg` AND speed > `messinesspenalty.thresholdSpeedKmh`. Clamp result to 0–100.
- [ ] Side-onshore sub-variant: if `windAngle` (angle between wind dir and `shorelineNormalDeg`) > 45°, reduce the messiness penalty by 40% (i.e. subtract `35 * 0.6 = 21` instead of 35)
- [ ] Dual-mode: if beach has `windScoringLogic` AND wind is within ±30° of `swellGeneratingWind.directionDeg`, use wave-generating-onshore logic. Otherwise, use standard logic.
- [ ] Typecheck passes

**Notes:** `windAngle` is always computed relative to `shorelineNormalDeg`. For wave-generating-onshore, the three modifiers (+20, +25, -35) can all apply simultaneously — they are additive, not exclusive.

---

### US-005: Weighted final score, label, reasons, and confidence
**Description:** As a developer, I want a function that combines subscores with beach weights, maps to a label, generates reasons, and computes confidence so each hourly forecast has a complete score result.

**Acceptance Criteria:**
- [ ] `scoringEngine.ts` exports `scoreHour(beach: IBeach, rawData: Record<string, unknown>, forecastTimestamp: Date, fetchedAt: Date): { surfScore: number, label: string, reasons: string[], confidence: number }`
- [ ] `scoreHour` first calls `applyHardGates` — if gated, returns the gate result immediately (with confidence computed, reasons = [gate reason])
- [ ] If not gated, computes all four subscores: `scoreSwellDirection`, `scoreSwellPeriod`, `scoreSwellHeight`, `scoreWind`
- [ ] Computes secondary swell modifier: +5 if `swell_wave_direction_2` is within the same `acceptableSwellDirection` window as primary, -10 if it's from the opposing direction (±180° ± 30°), 0 if no secondary swell or `swell_wave_height_2` is null/0
- [ ] Final score = `swellDirection * w.swellDirection + swellPeriod * w.swellPeriod + swellHeight * w.swellHeight + windScore * w.wind + 0 * w.tide + secondaryModifier`, clamped to 0–100
- [ ] Label mapping: 0–39 = 'poor', 40–59 = 'maybe', 60–79 = 'good', 80–100 = 'very-good'
- [ ] Reasons array: 3–6 human-readable strings describing what's helping and hurting the score. Examples: "Swell direction matches beach exposure", "Wind is light offshore — clean conditions", "Swell too short (5s, ideal 9–15s)", "Secondary swell from opposing direction"
- [ ] Confidence = `Math.max(0, 1.0 - (hoursFromNow / 240))` where `hoursFromNow` = difference in hours between `forecastTimestamp` and `fetchedAt`
- [ ] Typecheck passes

**Notes:** The `reasons` array should read like a surf report. Each reason should state what is observed (positive or negative), not a score value. Include the most impactful factors first. Generate at least one reason per dimension (swell direction, period, height, wind) and optionally one for secondary swell.

---

### US-006: Daily summaries — variable best-window search
**Description:** As a developer, I want daily summaries computed from hourly scores so the frontend can display a 10-day forecast strip with the best window per day.

**Acceptance Criteria:**
- [ ] `scoringEngine.ts` exports `computeDailySummaries(hourlyForecasts: Array<{ timestamp: Date, surfScore: number, label: string }>): IDailySummary[]`
- [ ] Groups hourly forecasts by calendar date (UTC)
- [ ] For each day: tries window sizes of 2, 3, and 4 consecutive hours. For each window size, slides across all hours in that day and computes the average score. Picks the window (any size) with the highest average score.
- [ ] Returns one `IDailySummary` per day: `date` (ISO date string YYYY-MM-DD), `bestWindowStart` (ISO datetime string), `bestWindowEnd` (ISO datetime string), `peakScore` (the highest single-hour score in that day), `overallLabel` (label mapped from the best-window average score using the same 0–39/40–59/60–79/80–100 thresholds)
- [ ] If a day has fewer than 2 forecast hours, use the single hour as the window
- [ ] Typecheck passes

**Notes:** `bestWindowStart` and `bestWindowEnd` are the timestamps of the first and last hour in the chosen best window. `peakScore` is the single highest hourly score in the day (not the window average). `overallLabel` is derived from the window average, not the peak.

---

### US-007: Wire scoring into forecast fetcher pipeline
**Description:** As a developer, I want the scoring engine called during the forecast fetch pipeline so that saved ForecastSnapshot documents contain real scores, labels, reasons, confidence, and daily summaries instead of placeholders.

**Acceptance Criteria:**
- [ ] `forecastFetcher.ts` imports `scoreHour` and `computeDailySummaries` from `scoringEngine.ts`
- [ ] In `fetchForecastForBeach`: after mapping raw data to `IHourlyForecast[]`, iterate over each entry and call `scoreHour(beach, entry.rawData, entry.timestamp, new Date())` to replace `surfScore`, `label`, `reasons`, and `confidence` with real computed values
- [ ] In `saveForecastSnapshot`: before saving, call `computeDailySummaries(hourlyForecasts)` and set the result as `dailySummaries` (replacing the empty `[]`)
- [ ] The function signature of `saveForecastSnapshot` may need to accept `hourlyForecasts` that already have scores populated — no additional scoring inside save
- [ ] After `docker compose up`, `GET /beaches` returns beaches with real computed `currentScore` values (not 0)
- [ ] `GET /beaches/mesachti-ikaria/forecast` returns a snapshot where `hourlyForecasts[0]` has a non-zero `surfScore`, a meaningful `label`, a `reasons` array with descriptive strings (not 'Placeholder...'), and a `confidence` value between 0 and 1
- [ ] `dailySummaries` array has ~10 entries (one per forecast day), each with `bestWindowStart`, `bestWindowEnd`, `peakScore`, and `overallLabel`
- [ ] Typecheck passes

---

## Functional Requirements

- FR-1: Hard gates short-circuit the scorer — a failed gate returns score 0 immediately, no weighted averaging can recover
- FR-2: All direction comparisons handle 360° wraparound using modular arithmetic
- FR-3: Subscores use linear interpolation between boundary values, not discrete buckets
- FR-4: Wave-generating-onshore wind logic is conditional and additive (+20, +25, -35 modifiers from a 50 baseline)
- FR-5: Side-onshore beaches reduce the messiness penalty by 40%
- FR-6: Dual-mode beaches (with windScoringLogic) switch between wave-generating-onshore and standard wind scoring based on current wind direction
- FR-7: Secondary swell modifier is ±5/10 points, additive on the final score
- FR-8: Per-beach weights from `beach.weights` drive the weighted sum — weights sum to 1.0
- FR-9: Tide subscore is always 0 (no tide data yet) — the tide weight still exists but contributes nothing
- FR-10: Confidence is a linear decay from 1.0 (now) to 0.0 (240 hours out)
- FR-11: Daily summaries use a variable 2–4 hour window search for the best consecutive period
- FR-12: Reasons are human-readable surf observations, not numeric score dumps

---

## Non-Goals

- No wave energy bonus subscore (documented as future improvement in scoring-engine.md)
- No tide integration (no data source yet)
- No confidence calibration against real observations (Phase 2 of evolution path)
- No ML or statistical weight tuning
- No user feedback loop
- No multi-grid-point averaging (single offshore point per beach)

---

## Technical Considerations

- `windScoringLogic` in `beach_profiles.json` uses `messinesspenalty` (lowercase 'p') — the interface must match this exact casing
- `rawData` values come from Open-Meteo as numbers but are typed as `Record<string, unknown>` — the scorer must safely cast to `number` and handle null/undefined/NaN
- The scorer is a pure computation module (no DB access, no side effects) — it takes a beach profile and raw data, returns scores. This makes it testable in isolation.
- Direction ranges crossing 360° appear in 3 of 8 beaches (Mesachti [340,20], Kolimpithra [340,30], Kokkino Limanaki [75,135]) — every direction comparison must handle this correctly
- The `IHourlyForecast` interface gains a `confidence` field — this is a schema change. Existing seed data snapshots will lack this field; they will be replaced on the next forecast fetch.

---

## Success Metrics

- After `docker compose up` and automatic forecast fetch, `GET /beaches` returns beaches sorted by real computed scores (not all 0)
- Langouvardos (open beach break, offshore-or-light) and Vouliagmeni (wave-generating-onshore) produce different scoring paths for the same wind conditions — verifiable by checking `reasons` arrays
- Hard gates work: a beach with swell direction outside its acceptable range shows `score: 0, label: 'poor', reason: 'Swell direction blocked...'`
- Daily summaries show 10 entries per beach with realistic best-window times
- Confidence values range from ~1.0 (first hour) to ~0.0 (hour 240)

---

## Open Questions

- Should the wave energy bonus subscore (`height² × period`) be added as a future enhancement? (Documented in scoring-engine.md but deferred)
- Should we log subscore breakdowns for debugging? (Useful for calibration in Phase 2 of the evolution path)
