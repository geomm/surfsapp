# Scoring Engine Design

The scoring engine runs on the backend and computes a surfability score for each beach based on its profile and the current marine forecast.

---

## Input Variables (from Open-Meteo Marine API)

Core variables consumed per forecast hour:

| Variable | Why it matters |
|---|---|
| `swell_wave_height` | Primary swell size |
| `swell_wave_period` | Swell energy and organisation |
| `swell_wave_direction` | Whether swell hits the beach correctly |
| `swell_wave_height_2` | Secondary swell (bonus/penalty) |
| `swell_wave_direction_2` | Secondary swell direction |
| `wind_speed_10m` | Wind strength |
| `wind_direction_10m` | Offshore / onshore relative to beach |
| `wave_height` | Total sea state (blend of swell + wind-sea) |

> Note: `significant_wave_height` = average of the top 1/3 of waves, not maximum. Avoid presenting this as "wave size" in the UI.

Optionally later:
- `sea_level` / tide window
- `ocean_current_speed` / direction

---

## Beach Profile

Each beach has a profile in `beach_profiles.json`. The scorer reads these to determine what "good" means for each specific beach.

See `docs/beach-profiles.md` for the full schema.

---

## Scoring Algorithm

### Step 1 — Fetch forecast point

Query Open-Meteo Marine API at the beach's offshore coordinates.
Optionally query 2–3 nearby grid points and average (future improvement).

### Step 2 — Compute subscores (0–100 each)

#### Swell Direction Score

Compare forecast swell direction to the beach's preferred window.

```
if swell_dir inside beach.idealSwellDirection     → 90–100
if swell_dir inside beach.acceptableSwellDirection → 50–89
if swell_dir outside acceptable                    → 0–30
```

#### Swell Period Score

Period scoring is **relative to the beach profile**, not a fixed global table. Use `beach.minSwellPeriodS` and `beach.idealSwellPeriodS` as anchors:

```
below beach.minSwellPeriodS              → 0–20
between min and idealSwellPeriodS[0]     → 20–60
inside beach.idealSwellPeriodS range     → 70–100
above idealSwellPeriodS[1]               → 60–80 (powerful but may exceed beach tolerance)
```

**Why:** A confined-gulf beach (e.g. Kokkino Limanaki, min 3s) should score well at 5s period wind chop. The same 5s period at Langouvardos (min 8s) should score poorly. Global tables would penalise appropriate conditions for low-period beaches.

**Reference baseline** (for context, not for scoring):
```
< 5s   → pure local wind chop, very short fetch
5–7s   → short-period wind swell, typical for enclosed seas
8–10s  → organised swell, moderate fetch or storm origin
11–14s → powerful organised swell, storm or long fetch
15s+   → long-period groundswell (rare in Mediterranean)
```

#### Swell Height Score

Per beach `minSwellHeightM` and `idealSwellHeightM` range:

```
below minimum       → 0–20
approaching minimum → 20–50
inside ideal range  → 80–100
above ideal max     → penalty based on beach skill level
  - advanced beach  → smaller penalty
  - beginner beach  → large penalty
```

#### Wind Score

Wind direction relative to beach `shorelineNormalDeg`:

```
offshore + light/moderate (< 15 km/h)  → 90–100
offshore + strong (15–25 km/h)         → 70–85
glassy / calm (< 5 km/h any direction) → 100
cross-shore                            → 40–65
onshore + light                        → 30–45
onshore + moderate/strong (> 20 km/h)  → 0–25
```

Wind direction scoring uses the difference between forecast wind direction and the beach shoreline normal (negative = offshore, positive = onshore).

**Exception — `wave-generating-onshore` beaches:**
Some enclosed-water beaches (e.g. Vouliagmeni) rely on onshore wind to generate swell. Standard offshore-good / onshore-bad logic does not apply. These beaches define a `windScoringLogic` block in their profile. The scorer must check `windScoringLogic.type` and apply the following conditional tree instead of the standard wind score:

```
IF windScoringLogic.type == "wave-generating-onshore":

  swellGeneratingWind = profile.windScoringLogic.swellGeneratingWind

  IF forecast wind direction ≈ swellGeneratingWind.directionDeg (±20°)
     AND forecast wind speed ≥ swellGeneratingWind.minSpeedKmh:
       → swell generation confirmed → swell score contribution is valid

  IF forecast wind direction ≈ offshore (north for this beach):
       → apply quality multiplier ↑ (clean surface bonus)

  IF forecast wind direction ≈ swellGeneratingWind.directionDeg (±20°)
     AND forecast wind speed > messinessPenalty.thresholdSpeedKmh:
       → apply messiness penalty ↓ (choppy surface)

  Optimal scenario: SSE built the swell AND wind is now easing or shifting north
```

This pattern applies to the majority of Greek surf beaches. Always check `windScoringLogic.type` before applying standard wind scoring.

**Sub-variant — side-onshore generating wind (e.g. Palaiohora):**
Some beaches have a generating wind that is side-onshore (~45–70° off the beach normal) rather than dead onshore. The wave generation is effective but surface quality is less degraded than a direct onshore wind.

```
IF generating wind angle to beach normal > 45°:
  → apply reduced messiness penalty (side-onshore is less destructive)
  → swell generation still valid if wind speed ≥ minSpeedKmh
```

Use `windAngleToBenchNormal = abs(forecastWindDir - shorelineNormalDeg)` to determine this at runtime — do not hardcode per beach.

**Dual-mode beaches (e.g. Falasarna):**
Some beaches have `windScoringLogic` defined but also receive organised swell in a different season where standard scoring is more appropriate. The scorer should determine which mode applies based on the current wind direction:

```
IF beach has windScoringLogic AND forecast wind direction ≈ swellGeneratingWind.directionDeg (±30°):
  → apply wave-generating-onshore scoring
ELSE IF swell is arriving from beach's idealSwellDirection:
  → apply standard scoring (offshore = good, onshore = bad)
```

This allows a dual-mode beach to score correctly in both seasons without separate profile entries.

#### Secondary Swell Score (bonus/penalty)

```
secondary swell from same window as primary → +5
secondary swell from opposing direction     → -10
no secondary swell                          → 0
```

### Step 3 — Weighted final score

```
surf_score =
  0.30 * swell_direction_score +
  0.25 * swell_period_score +
  0.20 * swell_height_score +
  0.20 * wind_score +
  0.05 * secondary_swell_bonus

surf_score = clamp(surf_score, 0, 100)
```

### Step 4 — Map to label

```
0–39   → "poor"
40–59  → "maybe"
60–79  → "good"
80–100 → "very good"
```

### Step 5 — Build reasons array

Generate human-readable reasons for the score. Examples:

```
"Swell direction matches beach exposure"
"Swell period is strong (12s)"
"Wind is light offshore — clean conditions"
"Swell is too small for this beach (0.4m, min 0.8m)"
"Onshore wind is reducing quality"
"Secondary swell from opposing direction"
```

Each reason should be a positive or negative observation, not a score value.

---

## Daily Summary

For each beach per day:
- Evaluate every hourly score
- Find the best consecutive 2–4 hour window (highest average score)
- Store: `date`, `bestWindowStart`, `bestWindowEnd`, `peakScore`, `overallLabel`

The daily summary is what the frontend shows in the 10-day forecast strip.

---

## Output Structure

```json
{
  "beachId": "langouvardos-filiatra",
  "timestamp": "2026-03-26T09:00:00Z",
  "surfScore": 74,
  "label": "good",
  "confidence": 0.70,
  "reasons": [
    "Swell direction matches beach exposure",
    "Swell period is solid (11s)",
    "Light offshore wind — clean surface"
  ],
  "rawData": {
    "swellHeightM": 1.6,
    "swellPeriodS": 11,
    "swellDirectionDeg": 275,
    "windSpeedKmh": 9,
    "windDirectionDeg": 120
  }
}
```

---

## Confidence Score

Initial confidence is a simple proxy:

```
confidence = 1.0 - (hoursFromNow / 240)
```

A forecast 10 days out (240h) has confidence ~0. A current forecast has confidence ~1.0.
Later, calibrate confidence against real observed conditions.

---

## Evolution Path

| Phase | Approach |
|---|---|
| MVP | Rule-based scorer with manually tuned beach profiles |
| Phase 2 | Calibration — compare output against real conditions, adjust beach thresholds |
| Phase 3 | Add confidence decay, historical accuracy tracking |
| Phase 4 | Optional: user feedback loop ("conditions were actually good/bad") |

Do NOT start with machine learning or a universal algorithm. The beach profile approach is the correct foundation.

---

## Important Limitations

- The forecast grid point may be several kilometres offshore from the actual beach
- Nearshore wave behaviour is strongly affected by seabed shape and coastline geometry
- Sheltered coves can behave very differently from nearby open coast
- Some beaches only work on specific long-period swells or tide windows

The mental model: **open forecast data = offshore sea state. Beach profile + rules = estimated nearshore surf quality.**
