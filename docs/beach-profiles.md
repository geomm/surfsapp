# Beach Profiles

Beach profiles are the core configuration that makes the scoring engine location-aware. Each beach has its own thresholds for what constitutes good surf at that specific spot.

Stored as `backend/src/data/beach_profiles.json` and bundled with the backend.

---

## Schema

```typescript
interface BeachProfile {
  id: string;                          // kebab-case unique identifier
  name: string;                        // Display name
  coords: {
    lat: number;
    lon: number;
  };
  offshoreCoords?: {                   // Optional: separate point for forecast query
    lat: number;
    lon: number;
  };
  region: string;                      // e.g. "Aegean", "Ionian", "Crete"
  description: string;
  shorelineNormalDeg: number;          // Direction the beach faces (0–360°, compass)
  idealSwellDirection: [number, number];      // [from, to] degrees
  acceptableSwellDirection: [number, number]; // [from, to] degrees
  minSwellHeightM: number;
  idealSwellHeightM: [number, number];
  minSwellPeriodS: number;
  idealSwellPeriodS: [number, number];
  maxOnshoreWindKmh: number;
  idealWindDescription: "offshore-or-light" | "any-light" | "offshore-only";
  sheltered: boolean;                  // Protected from direct ocean exposure
  longPeriodSwellRefracts: boolean;    // Long-period swell wraps into the beach
  skillLevel: "beginner" | "intermediate" | "advanced";
  tags: string[];                      // e.g. ["beach-break", "right-hander", "rocky"]
  notes?: string;                      // Freeform local knowledge
}
```

---

## Direction Convention

`shorelineNormalDeg` is the compass direction the beach faces — i.e. the direction a wave must come *from* to hit the beach head-on.

Example: a beach facing southwest has `shorelineNormalDeg: 225`.

Swell direction in forecasts is also "direction swell is coming *from*" (meteorological convention).

---

## Curated Beaches (Greece — MVP)

The following beaches are placeholders to be verified and refined together. Coordinates, orientations, and thresholds need ground-truth validation.

> Status: Vouliagmeni, Mesachti (Ikaria), Langouvardos (Filiatra) — field-verified. Kokkino Limanaki, Kolimpithra (Tinos) — research-verified, user has local knowledge. All others — draft, need review.

```json
[
  {
    "id": "vouliagmeni-athens",
    "name": "Vouliagmeni, Athens",
    "coords": { "lat": 37.8142, "lon": 23.7789 },
    "region": "Attica — Saronic Gulf",
    "description": "Beach break on the Athens Riviera, 20km south of Athens. South-facing into the Saronic Gulf. Works on south swell with northerly offshore wind. Mostly flat in summer (Meltemi is onshore here). Winter is the season.",
    "shorelineNormalDeg": 178,
    "idealSwellDirection": [155, 200],
    "acceptableSwellDirection": [135, 225],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 1.8],
    "minSwellPeriodS": 5,
    "idealSwellPeriodS": [6, 12],
    "maxOnshoreWindKmh": 25,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 157,
        "directionLabel": "SSE",
        "minSpeedKmh": 15,
        "comment": "SSE wind above threshold generates rideable swell via gulf fetch — contributes positively to swell score"
      },
      "qualityMultiplier": {
        "triggerWind": "north",
        "triggerDirectionDeg": 0,
        "effect": "increase",
        "comment": "North wind cleans up the surface — apply quality bonus when north wind is present alongside residual SSE swell"
      },
      "messinesspenalty": {
        "triggerWind": "SSE",
        "thresholdSpeedKmh": 20,
        "effect": "decrease",
        "comment": "Strong active SSE wind degrades surface quality — apply penalty when SSE wind is still blowing strongly"
      },
      "optimalScenario": "SSE wind has built swell AND is now easing or shifting north — clean residual swell running"
    },
    "sheltered": true,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["beach-break", "saronic-gulf", "athens-riviera", "winter-spot"],
    "notes": "SSE wind (~157°) is the ideal wave-generating wind here — it blows across the Saronic Gulf fetch and creates the swell that hits the beach. It is slightly onshore (surface will be messier) but it is the primary condition driver. North wind is offshore and cleans up the surface but does not generate waves on its own. Best conditions: SSE wind-swell arriving with light-to-moderate SSE wind, or residual SSE swell with the wind dying off. Short-period wind swell works. Limited fetch keeps waves small and mushy. Verified: shorelineNormalDeg (~178°), minSwellHeightM, minSwellPeriodS, idealWind (SSE)."
  },
  {
    "id": "mesachti-ikaria",
    "name": "Mesachti, Ikaria",
    "coords": { "lat": 37.6302, "lon": 26.0953 },
    "region": "Aegean — Eastern (Ikaria)",
    "description": "North-facing sandy beach break on the north coast of Ikaria, between Armenistis and Gialiskari. Fully exposed to the open Aegean and Meltemi wind-swell. Established surf spot with an active local surf school.",
    "shorelineNormalDeg": 0,
    "idealSwellDirection": [340, 20],
    "acceptableSwellDirection": [310, 50],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 2.0],
    "minSwellPeriodS": 5,
    "idealSwellPeriodS": [6, 10],
    "maxOnshoreWindKmh": 25,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 10,
        "directionLabel": "N/NNE",
        "minSpeedKmh": 15,
        "comment": "Meltemi (N/NNE) is onshore but generates all rideable swell via Aegean fetch — required for waves to exist"
      },
      "qualityMultiplier": {
        "triggerWind": "SSE",
        "triggerDirectionDeg": 157,
        "effect": "increase",
        "comment": "SSE wind is offshore here — cleans up the surface and improves quality significantly"
      },
      "messinesspenalty": {
        "triggerWind": "N/NNE",
        "thresholdSpeedKmh": 25,
        "effect": "decrease",
        "comment": "When Meltemi loads above ~25 km/h the surface becomes heavily churned and conditions deteriorate fast"
      },
      "optimalScenario": "Meltemi has built swell AND is now easing or shifting to SSE — clean residual north swell with offshore wind"
    },
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "intermediate",
    "tags": ["beach-break", "north-facing", "meltemi", "aegean", "surf-school"],
    "notes": "Primary swell driver is the Meltemi (N/NNE, June–September). Waves are powerful and short-period. When the Meltemi loads hard (above ~25 km/h) conditions get very messy and dangerous. SSE offshore wind is the quality multiplier — best window is residual north swell with SSE or calm. Ikaria Surf School operates here. Verified: shorelineNormalDeg, minSwellHeightM, skillLevel, messiness threshold (field experience)."
  },
  {
    "id": "langouvardos-filiatra",
    "name": "Langouvardos, Filiatra",
    "coords": { "lat": 37.14, "lon": 21.56 },
    "region": "Peloponnese — Ionian (Messenia)",
    "description": "Greece's most well-known beach break. West-southwest facing into the open Ionian Sea. Powerful Mediterranean storm swell, strong rip currents, and a distinct outside peak ~80m from shore. Advanced surfers only. Winter is the season.",
    "shorelineNormalDeg": 270,
    "idealSwellDirection": [240, 300],
    "acceptableSwellDirection": [210, 330],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [1.0, 2.5],
    "minSwellPeriodS": 8,
    "idealSwellPeriodS": [9, 15],
    "maxOnshoreWindKmh": 20,
    "idealWindDescription": "offshore-or-light",
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "advanced",
    "tags": ["beach-break", "ionian", "winter-spot", "powerful", "rips", "surf-club"],
    "notes": "Powerful even at 0.5m — short fetch to the shore means waves hit hard. Strong rip currents are a constant hazard. When strong wind is active, the nearshore zone is full of white water but the outside peak (~80m from shore) produces clean waves up to 2.5–3m. The two zones behave differently — nearshore messy, outside clean on stronger swell. East wind is offshore and ideal. Summer NW maistro makes it a windsurfing spot. Surf club (SURFSALAD) operates here. Verified: shorelineNormalDeg (approx), minSwellHeightM, idealSwellHeightM, skillLevel, rip hazard, outside peak distance (field experience)."
  },
  {
    "id": "falasarna-crete",
    "name": "Falasarna, Crete",
    "coords": { "lat": 35.5016, "lon": 23.5796 },
    "region": "Crete — West",
    "description": "Wide sandy beach at the northwest tip of Crete. Due west facing into open Mediterranean. Dual seasonal character: summer Meltemi wind-swell (NW/N onshore), winter Mediterranean storm swell (W/WSW + east offshore). Active surf school (SurfIsland). Also a reef break nearby.",
    "shorelineNormalDeg": 270,
    "idealSwellDirection": [240, 300],
    "acceptableSwellDirection": [200, 330],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 2.0],
    "minSwellPeriodS": 6,
    "idealSwellPeriodS": [7, 14],
    "maxOnshoreWindKmh": 20,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 330,
        "directionLabel": "NW/N",
        "minSpeedKmh": 15,
        "comment": "Summer Meltemi (NW/N) is onshore but generates the swell — primary summer condition driver"
      },
      "qualityMultiplier": {
        "triggerWind": "east",
        "triggerDirectionDeg": 90,
        "effect": "increase",
        "comment": "East wind is offshore — cleans up the surface, ideal in winter with W/WSW storm swell"
      },
      "messinesspenalty": {
        "triggerWind": "NW/N",
        "thresholdSpeedKmh": 25,
        "effect": "decrease",
        "comment": "Strong Meltemi above ~25 km/h creates chop and degrades surface quality"
      },
      "optimalScenario": "Winter: W/WSW Mediterranean storm swell + east offshore wind. Summer: Meltemi-generated swell with moderate NW wind or easing to east."
    },
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["sandy-beach", "beach-break", "reef-break", "west-facing", "surf-school", "dual-season"],
    "notes": "Two distinct surf seasons. Summer (Jun–Sep): Meltemi-driven NW wind-swell, short period (6–8s), onshore conditions — wave-generating-onshore logic applies. Winter (Nov–Apr): Mediterranean storm swell from W/WSW, longer period (8–14s), east offshore wind — standard scoring applies. Beginner-friendly shallow sections. Surf-Forecast rates overall consistency low (2/10) but it works reliably in both season windows."
  },
  {
    "id": "palaiohora-crete",
    "name": "Palaiohora (Pachia Ammos), Crete",
    "coords": { "lat": 35.234, "lon": 23.678 },
    "region": "Crete — South (Libyan Sea)",
    "description": "WSW-facing sandy beach on the west side of the Palaiohora peninsula, south coast of Crete. Faces the Libyan Sea with ~300km open fetch to Libya/Egypt. South wind is side-onshore — the primary wave generator. Offshore wind is NNE/N. Winter only. Distinct from Falasarna (north coast) — different swell source and seasonal driver.",
    "shorelineNormalDeg": 245,
    "idealSwellDirection": [200, 275],
    "acceptableSwellDirection": [170, 300],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 2.0],
    "minSwellPeriodS": 6,
    "idealSwellPeriodS": [7, 12],
    "maxOnshoreWindKmh": 25,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 190,
        "directionLabel": "S/SSW",
        "minSpeedKmh": 15,
        "comment": "South/SSW wind is side-onshore (~65° off the beach normal) — generates swell across 300km Libyan Sea fetch while being less destructive to surface quality than a dead-onshore wind"
      },
      "qualityMultiplier": {
        "triggerWind": "NNE/N",
        "triggerDirectionDeg": 20,
        "effect": "increase",
        "comment": "NNE/N wind is offshore — blows from the Cretan mountains toward the sea, cleans up the surface significantly"
      },
      "messinesspenalty": {
        "triggerWind": "SW",
        "thresholdSpeedKmh": 20,
        "effect": "decrease",
        "comment": "SW wind is more directly onshore (~20° off beach normal) — generates waves but heavy chop above ~20 km/h"
      },
      "optimalScenario": "S/SSW storm has built Libyan Sea swell AND wind is shifting to NNE/N offshore — clean residual swell with glassy surface"
    },
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "intermediate",
    "tags": ["sandy-beach", "beach-break", "libyan-sea", "south-coast", "winter-spot", "side-onshore"],
    "notes": "South/SSW wind is the key condition driver — confirmed by user and research. Side-onshore angle (~65° off beach normal) means it generates swell without the worst of dead-onshore chop. Best window: S/SSW storm builds swell, then wind eases or shifts NNE/N for clean offshore conditions. On the east side (Halikia pebble beach) conditions are sheltered from the W — useful for beginners when west beach is too big. Summer is flat — Meltemi blows offshore here, no wave generation. SurfinGR spot #73. Draft — not field-verified by user."
  },
  {
    "id": "agios-georgios-naxos",
    "name": "Agios Georgios, Naxos",
    "coords": { "lat": 37.0993, "lon": 25.3749 },
    "region": "Aegean — Cyclades",
    "description": "West-facing sandy beach on the west coast of Naxos, at the southern edge of Naxos Town. Primarily a windsurfing destination. Reef separates a shallow lagoon from open water. Summer Meltemi (NW) is onshore — wave-generating pattern. South/SW wind is offshore.",
    "shorelineNormalDeg": 260,
    "idealSwellDirection": [230, 290],
    "acceptableSwellDirection": [200, 320],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 1.8],
    "minSwellPeriodS": 5,
    "idealSwellPeriodS": [6, 10],
    "maxOnshoreWindKmh": 20,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 330,
        "directionLabel": "NW/NNW",
        "minSpeedKmh": 15,
        "comment": "Meltemi (NW/NNW) is onshore but the primary wave generator in summer"
      },
      "qualityMultiplier": {
        "triggerWind": "south-southwest",
        "triggerDirectionDeg": 210,
        "effect": "increase",
        "comment": "S/SW wind is offshore here — cleans up the surface"
      },
      "messinesspenalty": {
        "triggerWind": "NW/NNW",
        "thresholdSpeedKmh": 25,
        "effect": "decrease",
        "comment": "Strong Meltemi creates heavy chop — primarily windsurfing conditions, not surf"
      },
      "optimalScenario": "Moderate Meltemi-generated swell with wind easing or shifting to S/SW offshore"
    },
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["sandy-beach", "reef-break", "cyclades", "windsurf-primary", "lagoon"],
    "notes": "Primarily a windsurfing destination (Naxos Surf Club, Flisvos). Reef creates two zones: sheltered lagoon (beginner) and open water beyond (intermediate). Meltemi season (Jun–Sep) is most active but conditions are often too windy for quality surfing. Surf is secondary — windsurf traffic will be heavy in summer. Draft — needs field verification."
  }
  ,{
    "id": "kokkino-limanaki-rafina",
    "name": "Kokkino Limanaki, Rafina",
    "coords": { "lat": 38.0333, "lon": 24.0002 },
    "region": "Attica — South Euboean Gulf",
    "description": "Small ESE-facing cove ~1.5km north of Rafina port, sheltered by red cliffs. Confined within the South Euboean Gulf (max 14km wide). Wind chop only — no true swell. Best in winter SE/S storms. Beginner-friendly. Surf school on site.",
    "shorelineNormalDeg": 105,
    "idealSwellDirection": [75, 135],
    "acceptableSwellDirection": [55, 160],
    "minSwellHeightM": 0.3,
    "idealSwellHeightM": [0.5, 1.5],
    "minSwellPeriodS": 3,
    "idealSwellPeriodS": [4, 7],
    "maxOnshoreWindKmh": 30,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 135,
        "directionLabel": "SE/S",
        "minSpeedKmh": 15,
        "comment": "Winter SE/S storms generate the only rideable chop across the short gulf fetch — onshore but essential for any waves"
      },
      "qualityMultiplier": {
        "triggerWind": "W/WSW",
        "triggerDirectionDeg": 255,
        "effect": "increase",
        "comment": "W/WSW is offshore — cleans up the surface, but very rare locally"
      },
      "messinesspenalty": {
        "triggerWind": "SE/S",
        "thresholdSpeedKmh": 25,
        "effect": "decrease",
        "comment": "Strong SE storm wind = heavy chop and messy surface despite generating the waves"
      },
      "optimalScenario": "SE/S storm has built chop AND wind is easing — short-period wind waves with cleaner surface"
    },
    "sheltered": true,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["beach-break", "confined-gulf", "wind-chop", "beginner", "surf-school", "winter-spot"],
    "notes": "Very similar dynamic to Vouliagmeni but even more fetch-limited (South Euboean Gulf max 14km wide). Evia island completely blocks N/NE. True swell never reaches here — all waves are locally-generated wind chop. Summer Meltemi (N/NE) is cross-shore and not ideal for surfing. Winter SE/S storms are the only surf window. Surfline-listed with dedicated spot entry. Offshore wind (W/WSW) is very rare in this region. Nearest serious wave spot is Nissakia/Loutsa (~10km south). Draft — not field-verified by user, user has local knowledge of the spot."
  }
  ,{
    "id": "kolimpithra-tinos",
    "name": "Kolimpithra, Tinos",
    "coords": { "lat": 37.6299, "lon": 25.1432 },
    "region": "Aegean — Cyclades (Tinos)",
    "description": "North-facing beach on the northern coast of Tinos, ~15km from Tinos Town. Two sections: Megali Ammos (large, exposed) and Mikri Ammos (small, sheltered). Greece's premier Cycladic surf destination. Active surf school (Aeolus Surf Club). Meltemi-driven, summer is the season.",
    "shorelineNormalDeg": 5,
    "idealSwellDirection": [340, 30],
    "acceptableSwellDirection": [310, 50],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 2.0],
    "minSwellPeriodS": 5,
    "idealSwellPeriodS": [6, 10],
    "maxOnshoreWindKmh": 25,
    "idealWindDescription": "wave-generating-onshore",
    "windScoringLogic": {
      "type": "wave-generating-onshore",
      "swellGeneratingWind": {
        "directionDeg": 10,
        "directionLabel": "N/NNE",
        "minSpeedKmh": 15,
        "comment": "Meltemi (N/NNE) is onshore but the primary wave generator — required for any rideable swell"
      },
      "qualityMultiplier": {
        "triggerWind": "SE",
        "triggerDirectionDeg": 135,
        "effect": "increase",
        "comment": "SE wind is offshore — cleans up the surface significantly"
      },
      "messinesspenalty": {
        "triggerWind": "N/NNE",
        "thresholdSpeedKmh": 25,
        "effect": "decrease",
        "comment": "Heavy Meltemi (25+ km/h) churns the surface — waves exist but quality drops fast"
      },
      "optimalScenario": "Meltemi has built north swell AND is easing or shifting to SE offshore — clean residual swell running"
    },
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "intermediate",
    "tags": ["beach-break", "north-facing", "meltemi", "cyclades", "surf-school", "rips"],
    "notes": "Two distinct zones: Megali Ammos (large beach, exposed, main surf) and Mikri Ammos (small, sheltered, beginners). Andros island is only 0.5nm to the NE — may block some NE swell, but north fetch is fully open. Rip currents are a significant hazard (confirmed by multiple sources). Summer (Jun–Sep) is peak season, driven entirely by Meltemi. Very similar dynamic to Mesachti (Ikaria). Tinos is nicknamed 'Island of the Winds'. Aeolus Surf Club and Tinos Surf Lessons operate here. Draft — not field-verified by user."
  }
]
```

---

## Notes on Curation

- All profiles above are **drafts** based on geography and regional knowledge — not field-verified
- `idealSwellDirection` ranges crossing 360° (e.g. `[330, 30]`) need special handling in the scorer (modular arithmetic)
- `longPeriodSwellRefracts: true` is a flag for future scorer enhancement — not used in the initial scoring pass
- Limnionas (Zakynthos) was removed — confirmed to be a sheltered fjord/cove, not a surf spot
- Mavros Gialos (Chios), Agios Fokas (Lesvos), Elafonisi (Crete) removed — unverified, replaced by known beaches

---

## Adding New Beaches

To add a beach:
1. Add its entry to `beach_profiles.json`
2. Verify coordinates against Google Maps / satellite
3. Identify the beach's shoreline normal direction (compass direction the beach faces)
4. Set swell direction windows based on which directions are blocked by land vs open sea
5. Set height/period thresholds based on local knowledge or comparable breaks
6. Run a few historical forecast checks to sanity-test the profile
