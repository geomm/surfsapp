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

> Status: draft — needs review and field verification

```json
[
  {
    "id": "kokkari-samos",
    "name": "Kokkari, Samos",
    "coords": { "lat": 37.770, "lon": 26.883 },
    "region": "Aegean — Eastern",
    "description": "Exposed pebble beach on the north coast of Samos. Picks up northerly Aegean swells well.",
    "shorelineNormalDeg": 355,
    "idealSwellDirection": [330, 30],
    "acceptableSwellDirection": [300, 60],
    "minSwellHeightM": 0.6,
    "idealSwellHeightM": [0.8, 1.8],
    "minSwellPeriodS": 7,
    "idealSwellPeriodS": [8, 12],
    "maxOnshoreWindKmh": 15,
    "idealWindDescription": "offshore-or-light",
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "intermediate",
    "tags": ["pebble-beach", "northerly-swell", "aegean"],
    "notes": "Meltemi season (July–August) brings consistent northerly wind-swell. Best in autumn when swell is more organised."
  },
  {
    "id": "mavros-gialos-chios",
    "name": "Mavros Gialos, Chios",
    "coords": { "lat": 38.370, "lon": 26.050 },
    "region": "Aegean — Eastern",
    "description": "Dark-pebble beach on the west coast of Chios, sheltered from the north, exposed to SW.",
    "shorelineNormalDeg": 270,
    "idealSwellDirection": [240, 300],
    "acceptableSwellDirection": [210, 320],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.7, 1.5],
    "minSwellPeriodS": 7,
    "idealSwellPeriodS": [8, 12],
    "maxOnshoreWindKmh": 15,
    "idealWindDescription": "offshore-or-light",
    "sheltered": true,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["pebble-beach", "sheltered", "west-facing"],
    "notes": "Placeholder — needs local verification."
  },
  {
    "id": "agios-fokas-lesvos",
    "name": "Agios Fokas, Lesvos",
    "coords": { "lat": 39.077, "lon": 26.596 },
    "region": "Aegean — Northeast",
    "description": "Exposed beach on the east coast of Lesvos.",
    "shorelineNormalDeg": 90,
    "idealSwellDirection": [60, 120],
    "acceptableSwellDirection": [40, 150],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 1.8],
    "minSwellPeriodS": 6,
    "idealSwellPeriodS": [7, 11],
    "maxOnshoreWindKmh": 15,
    "idealWindDescription": "offshore-or-light",
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "intermediate",
    "tags": ["east-facing", "aegean"],
    "notes": "Placeholder — needs local verification."
  },
  {
    "id": "falasarna-crete",
    "name": "Falasarna, Crete",
    "coords": { "lat": 35.511, "lon": 23.571 },
    "region": "Crete — West",
    "description": "Wide sandy beach on the northwest tip of Crete. One of the most exposed beaches in Greece to Atlantic and western Mediterranean swells.",
    "shorelineNormalDeg": 290,
    "idealSwellDirection": [260, 320],
    "acceptableSwellDirection": [230, 350],
    "minSwellHeightM": 0.8,
    "idealSwellHeightM": [1.2, 2.5],
    "minSwellPeriodS": 9,
    "idealSwellPeriodS": [10, 15],
    "maxOnshoreWindKmh": 12,
    "idealWindDescription": "offshore-only",
    "sheltered": false,
    "longPeriodSwellRefracts": true,
    "skillLevel": "intermediate",
    "tags": ["sandy-beach", "beach-break", "long-period-swell", "west-facing"],
    "notes": "Best Greek beach for long-period Atlantic swell windows. Rare but excellent when it fires."
  },
  {
    "id": "elafonisi-crete",
    "name": "Elafonisi, Crete",
    "coords": { "lat": 35.265, "lon": 23.535 },
    "region": "Crete — West",
    "description": "Shallow lagoon beach at the southwest tip of Crete. Very sheltered, mainly suited to beginners on small swells.",
    "shorelineNormalDeg": 240,
    "idealSwellDirection": [210, 270],
    "acceptableSwellDirection": [190, 300],
    "minSwellHeightM": 0.4,
    "idealSwellHeightM": [0.5, 1.2],
    "minSwellPeriodS": 7,
    "idealSwellPeriodS": [8, 12],
    "maxOnshoreWindKmh": 20,
    "idealWindDescription": "any-light",
    "sheltered": true,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["sandy-beach", "lagoon", "sheltered", "beginner"],
    "notes": "Very shallow — only rideable on small clean swells. Tourist-heavy in summer."
  },
  {
    "id": "agios-georgios-naxos",
    "name": "Agios Georgios, Naxos",
    "coords": { "lat": 37.096, "lon": 25.366 },
    "region": "Aegean — Cyclades",
    "description": "Long sandy beach south of Naxos town. Exposed to southerly swells and summer meltemi.",
    "shorelineNormalDeg": 210,
    "idealSwellDirection": [180, 240],
    "acceptableSwellDirection": [160, 270],
    "minSwellHeightM": 0.5,
    "idealSwellHeightM": [0.8, 1.8],
    "minSwellPeriodS": 7,
    "idealSwellPeriodS": [8, 12],
    "maxOnshoreWindKmh": 15,
    "idealWindDescription": "offshore-or-light",
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "beginner",
    "tags": ["sandy-beach", "cyclades", "windsurfing-area"],
    "notes": "Placeholder — Naxos is also a major windsurfing destination; conditions that are good for surf may overlap with high windsurf traffic."
  },
  {
    "id": "limnionas-zakynthos",
    "name": "Limnionas, Zakynthos",
    "coords": { "lat": 37.737, "lon": 20.788 },
    "region": "Ionian",
    "description": "West-facing rocky cove on Zakynthos. Picks up Ionian Sea westerly swells.",
    "shorelineNormalDeg": 270,
    "idealSwellDirection": [240, 300],
    "acceptableSwellDirection": [210, 330],
    "minSwellHeightM": 0.6,
    "idealSwellHeightM": [1.0, 2.0],
    "minSwellPeriodS": 8,
    "idealSwellPeriodS": [9, 13],
    "maxOnshoreWindKmh": 12,
    "idealWindDescription": "offshore-or-light",
    "sheltered": false,
    "longPeriodSwellRefracts": false,
    "skillLevel": "intermediate",
    "tags": ["rocky-cove", "west-facing", "ionian"],
    "notes": "Placeholder — needs local verification. Ionian swell is generally weaker than Atlantic but more consistent in autumn/winter."
  }
]
```

---

## Notes on Curation

- All profiles above are **drafts** based on geography and regional knowledge — not field-verified
- `idealSwellDirection` ranges crossing 360° (e.g. `[330, 30]`) need special handling in the scorer (modular arithmetic)
- `longPeriodSwellRefracts: true` is a flag for future scorer enhancement — not used in the initial scoring pass
- Priority for first review: Falasarna (best exposure), Kokkari (Aegean type-case), Limnionas (Ionian type-case)

---

## Adding New Beaches

To add a beach:
1. Add its entry to `beach_profiles.json`
2. Verify coordinates against Google Maps / satellite
3. Identify the beach's shoreline normal direction (compass direction the beach faces)
4. Set swell direction windows based on which directions are blocked by land vs open sea
5. Set height/period thresholds based on local knowledge or comparable breaks
6. Run a few historical forecast checks to sanity-test the profile
