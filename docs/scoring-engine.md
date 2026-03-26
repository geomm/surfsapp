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

The weights in the formula are **heuristics, not physical constants**. They represent relative importance beliefs, tuned per beach. They will be calibrated against real observations over time.

---

### Step 1 — Fetch forecast point

Query Open-Meteo Marine API at the beach's offshore coordinates.
Optionally query 2–3 nearby grid points and average (future improvement).

---

### Step 2 — Apply hard gates

Before scoring, apply mandatory pass/fail rules. A failed gate short-circuits the entire calculation and returns `"flat"` immediately — no weighted averaging can recover a fundamentally broken condition.

```
GATE 1 — Swell direction
  IF swell_dir outside beach.acceptableSwellDirection:
    → return { score: 0, label: "flat", reason: "Swell direction blocked" }

GATE 2 — Swell height
  IF swell_wave_height < beach.minSwellHeightM:
    → return { score: 0, label: "flat", reason: "Swell too small" }

GATE 3 — Wave-generating-onshore: generating wind absent
  IF beach.windScoringLogic.type == "wave-generating-onshore"
     AND forecast wind direction is NOT ≈ swellGeneratingWind.directionDeg (±30°)
     AND swell_wave_height < beach.minSwellHeightM * 1.5:
    → return { score: 5, label: "flat", reason: "Generating wind absent, no residual swell" }
```

**Why gating matters:** Without gates, a beach with perfect wind, perfect period, and wrong swell direction could score "maybe" or higher. Gating prevents the weighted sum from averaging around a deal-breaker.

---

### Step 3 — Compute subscores (0–100 each)

#### Swell Direction Score

Use a **continuous gradient** from the ideal centre, not discrete buckets. This prevents a swell at the edge of the ideal window scoring the same as one dead-centre.

```
angle_from_ideal_centre = angular_distance(swell_dir, midpoint(beach.idealSwellDirection))

if angle_from_ideal_centre == 0                         → 100
if swell_dir inside idealSwellDirection                 → linear decay toward 80 at window edge
if swell_dir inside acceptableSwellDirection only       → linear decay from 79 toward 40 at window edge
if swell_dir outside acceptable (already gated above)  → 0
```

Note: direction ranges crossing 360° (e.g. `[330, 30]`) require modular arithmetic.

#### Swell Period Score

Period scoring is **relative to the beach profile**, not a fixed global table:

```
below beach.minSwellPeriodS                → 0–20
between min and idealSwellPeriodS[0]       → 20–60  (linear interpolation)
inside beach.idealSwellPeriodS range       → 70–100
above idealSwellPeriodS[1]                 → 60–80  (powerful but may exceed tolerance)
```

A confined-gulf beach (Kokkino Limanaki, min 3s) scores well at 5s. The same 5s period at Langouvardos (min 8s) scores poorly. Global tables would penalise appropriate conditions for low-period beaches.

#### Swell Height Score

```
below beach.minSwellHeightM                     → 0 (already gated, shouldn't reach here)
between min and idealSwellHeightM[0]            → 20–70  (linear interpolation)
inside beach.idealSwellHeightM range            → 80–100
above idealSwellHeightM[1]:
  beach.skillLevel == "advanced"               → gradual penalty (score stays 50–70)
  beach.skillLevel == "intermediate"           → moderate penalty (30–55)
  beach.skillLevel == "beginner"               → steep penalty (0–30)
```

#### Wave Energy Score (bonus dimension)

Wave energy is proportional to `height² × period`. This captures swell power more accurately than height alone — a 1.5m / 12s swell carries far more energy than a 1.5m / 5s chop.

```
wave_energy = swell_wave_height² × swell_wave_period

normalise against beach.idealSwellHeightM and beach.idealSwellPeriodS to get 0–100 score

Use as a bonus modifier (+0 to +10) on top of height and period subscores,
or as a standalone subscore if beach.weights.waveEnergy is defined.
```

This is an additive signal. Do not replace height and period scores with it — use it to boost the score when both height and period are simultaneously in the ideal range.

#### Wind Score

Wind direction relative to beach `shorelineNormalDeg`:

```
windAngle = angular_distance(forecastWindDir, shorelineNormalDeg)
  → 0°   = dead offshore
  → 90°  = cross-shore
  → 180° = dead onshore

Standard scoring:
  windAngle < 30° AND speed < 15 km/h   → 90–100  (light offshore)
  windAngle < 30° AND speed 15–25 km/h  → 70–85   (moderate offshore)
  windAngle < 30° AND speed > 35 km/h   → 40–60   (strong offshore — paddling difficulty)
  speed < 5 km/h (any direction)        → 100      (glassy)
  windAngle 30–70°                      → 40–70    (cross-shore, variable)
  windAngle 70–120° (onshore)           → 20–45
  windAngle > 120° AND speed > 20 km/h  → 0–20    (strong onshore)
```

**Exception — `wave-generating-onshore` beaches:**
Standard offshore-good / onshore-bad logic does not apply. The scorer checks `windScoringLogic.type` and produces a numeric wind score using the conditional logic below:

```
wind_score = 50 (neutral baseline)

IF forecast wind ≈ swellGeneratingWind.directionDeg (±20°)
   AND speed ≥ swellGeneratingWind.minSpeedKmh:
     wind_score += 20  (generating wind present — swell exists)

IF forecast wind ≈ qualityMultiplier.triggerDirectionDeg (±20°):
     wind_score += 25  (offshore wind — clean surface bonus)

IF forecast wind ≈ swellGeneratingWind.directionDeg (±20°)
   AND speed > messinessPenalty.thresholdSpeedKmh:
     wind_score -= 35  (strong generating wind — heavy chop penalty)

wind_score = clamp(wind_score, 0, 100)
```

**Sub-variant — side-onshore generating wind (e.g. Palaiohora):**
```
windAngleToNormal = abs(forecastWindDir - shorelineNormalDeg)
IF windAngleToNormal > 45°:
  → reduce messiness penalty by 40% (side-onshore is less destructive)
```

**Dual-mode beaches (e.g. Falasarna):**
```
IF beach has windScoringLogic
   AND forecast wind ≈ swellGeneratingWind.directionDeg (±30°):
     → apply wave-generating-onshore wind scoring
ELSE:
     → apply standard wind scoring
```

#### Secondary Swell Modifier

```
secondary swell from same window as primary → +5
secondary swell from opposing direction     → -10
no secondary swell                          → 0
```

---

### Step 4 — Weighted final score

Each beach profile defines its own `weights` object. Weights must sum to 1.0.

```
surf_score =
  beach.weights.swellDirection * swell_direction_score +
  beach.weights.swellPeriod    * swell_period_score +
  beach.weights.swellHeight    * swell_height_score +
  beach.weights.wind           * wind_score +
  beach.weights.tide           * tide_score (default 0 until tide data added)
  + secondary_swell_modifier

surf_score = clamp(surf_score, 0, 100)
```

**Default weights by beach type (starting heuristics — tune per beach over time):**

| Beach type | swellDirection | swellPeriod | swellHeight | wind | tide |
|---|---|---|---|---|---|
| Open beach break (e.g. Langouvardos) | 0.35 | 0.25 | 0.20 | 0.15 | 0.05 |
| Wave-gen onshore / enclosed gulf (e.g. Vouliagmeni) | 0.20 | 0.20 | 0.25 | 0.30 | 0.05 |
| Open Meltemi / north-facing (e.g. Mesachti) | 0.30 | 0.20 | 0.25 | 0.20 | 0.05 |
| Sheltered point / directional (hypothetical) | 0.45 | 0.30 | 0.15 | 0.05 | 0.05 |

**Why per-beach weights:** For an enclosed-gulf beach, wind carries more weight because it is simultaneously the wave generator and the quality killer. For a directional point break, swell direction dominates — wrong angle means no waves regardless of everything else. These weights are product design parameters, not physical constants.

---

### Step 5 — Map to label

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

The weights are product design parameters, not physical constants. They improve through observation.

| Phase | Approach |
|---|---|
| MVP | Hard-coded heuristic weights per beach type. Manual gates. Rule-based scorer. |
| Phase 2 | Calibration — compare algorithm output against real conditions (surf reports, personal observation). Adjust `beach.weights` and thresholds per beach. |
| Phase 3 | Statistical tuning — use historical forecast + observed quality pairs to optimise weights. Minimise prediction error across the beach dataset. |
| Phase 4 | Confidence scoring — weight predictions by forecast horizon and historical accuracy per beach. |
| Phase 5 (optional) | User feedback loop — "conditions were actually good/bad" signal feeds back into weight adjustment. |
| Phase 6 (optional) | ML — learn weight relationships automatically from accumulated data. Do NOT start here. |

**What calibration looks like in practice:**
- Run algorithm on a past date you know was good/bad at a specific beach
- Compare output label to reality
- Adjust the weight that caused the mismatch
- Re-run, iterate

**Wave energy as a future scoring dimension:**
`wave_energy ∝ height² × period`
Long-period swell carries exponentially more energy than short-period. This can be a standalone subscore or a bonus modifier once baseline weights are calibrated. Add it when you observe that the scorer underrates long-period swell windows.

---

## Important Limitations

- The forecast grid point may be several kilometres offshore from the actual beach
- Nearshore wave behaviour is strongly affected by seabed shape and coastline geometry
- Sheltered coves can behave very differently from nearby open coast
- Some beaches only work on specific long-period swells or tide windows

The mental model: **open forecast data = offshore sea state. Beach profile + rules = estimated nearshore surf quality.**
