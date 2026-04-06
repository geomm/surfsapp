import { IBeach } from '../models/Beach'

/**
 * Returns the shortest angular distance between two compass bearings (0–180).
 * Handles 360° wraparound.
 */
export function angularDistance(a: number, b: number): number {
  const diff = Math.abs(((a - b + 540) % 360) - 180)
  return diff
}

/**
 * Returns true if angle falls within [from, to] range on the compass.
 * Handles ranges crossing 360° (e.g. [340, 20] includes 350 and 10).
 */
export function isAngleInRange(angle: number, range: [number, number]): boolean {
  const [from, to] = range
  const a = ((angle % 360) + 360) % 360
  const f = ((from % 360) + 360) % 360
  const t = ((to % 360) + 360) % 360

  if (f <= t) {
    // Normal range, e.g. [90, 270]
    return a >= f && a <= t
  } else {
    // Wrapping range, e.g. [340, 20]
    return a >= f || a <= t
  }
}

interface GateResult {
  gated: true
  score: number
  label: string
  reason: string
}

/**
 * Applies hard gates that short-circuit scoring when deal-breaker conditions are met.
 * Returns a gate result if triggered, null if all gates pass.
 */
export function applyHardGates(
  beach: IBeach,
  rawData: Record<string, unknown>
): GateResult | null {
  const swellDir = Number(rawData.swell_wave_direction)
  const swellHeight = Number(rawData.swell_wave_height)
  const windDir = Number(rawData.wind_direction_10m)

  // Fail-safe: missing or NaN data
  if (isNaN(swellDir) || isNaN(swellHeight)) {
    return { gated: true, score: 0, label: 'poor', reason: 'Missing forecast data' }
  }

  // Gate 1 — Swell direction outside acceptable range
  if (!isAngleInRange(swellDir, beach.acceptableSwellDirection)) {
    return {
      gated: true,
      score: 0,
      label: 'poor',
      reason: 'Swell direction blocked by land/orientation',
    }
  }

  // Gate 2 — Swell height below minimum
  if (swellHeight < beach.minSwellHeightM) {
    return {
      gated: true,
      score: 0,
      label: 'poor',
      reason: `Swell too small (${swellHeight}m, min ${beach.minSwellHeightM}m)`,
    }
  }

  // Gate 3 — Wave-generating-onshore: generating wind absent with no residual swell
  if (
    beach.idealWindDescription === 'wave-generating-onshore' &&
    beach.windScoringLogic
  ) {
    // Need wind direction for this gate
    if (isNaN(windDir)) {
      return { gated: true, score: 0, label: 'poor', reason: 'Missing forecast data' }
    }

    const generatingWindDir = beach.windScoringLogic.swellGeneratingWind.directionDeg
    const windWithin30 = angularDistance(windDir, generatingWindDir) <= 30
    const hasResidualSwell = swellHeight >= beach.minSwellHeightM * 1.5

    if (!windWithin30 && !hasResidualSwell) {
      return {
        gated: true,
        score: 5,
        label: 'poor',
        reason: 'Generating wind absent, no residual swell',
      }
    }
  }

  return null
}

/**
 * Computes the midpoint of a compass direction range, handling 360° wraparound.
 * E.g. midpoint of [340, 20] is 0 (not 180).
 */
function rangeMidpoint(range: [number, number]): number {
  const [from, to] = range
  const span = ((to - from) % 360 + 360) % 360
  return (from + span / 2) % 360
}

/**
 * Swell direction subscore (0–100).
 * Continuous gradient: 100 at ideal centre, linear decay to 80 at ideal edge,
 * 79→40 through acceptable range, 0 outside.
 */
export function scoreSwellDirection(beach: IBeach, swellDir: number): number {
  const idealMid = rangeMidpoint(beach.idealSwellDirection)

  // Half-widths computed as angular distance from midpoint to range edges
  const idealHalfWidth = angularDistance(idealMid, beach.idealSwellDirection[0])
  const acceptHalfWidth = Math.max(
    angularDistance(idealMid, beach.acceptableSwellDirection[0]),
    angularDistance(idealMid, beach.acceptableSwellDirection[1])
  )

  const angleFromCentre = angularDistance(swellDir, idealMid)

  // Dead centre
  if (idealHalfWidth === 0) {
    // Degenerate case: ideal range is a single direction
    if (isAngleInRange(swellDir, beach.acceptableSwellDirection)) {
      const t = acceptHalfWidth > 0 ? angleFromCentre / acceptHalfWidth : 0
      return Math.round(100 - t * 60)
    }
    return 0
  }

  // Inside ideal range: 100 at centre → 80 at edge
  if (angleFromCentre <= idealHalfWidth) {
    return Math.round(100 - (angleFromCentre / idealHalfWidth) * 20)
  }

  // Inside acceptable but outside ideal: 79 → 40
  if (isAngleInRange(swellDir, beach.acceptableSwellDirection)) {
    const distPastIdeal = angleFromCentre - idealHalfWidth
    const acceptableOnlyWidth = acceptHalfWidth - idealHalfWidth
    if (acceptableOnlyWidth <= 0) return 40
    const t = Math.min(distPastIdeal / acceptableOnlyWidth, 1)
    return Math.round(79 - t * 39)
  }

  // Outside acceptable (should be gated, but return 0)
  return 0
}

/**
 * Linear interpolation helper.
 */
function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return (outMin + outMax) / 2
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)))
  return outMin + t * (outMax - outMin)
}

/**
 * Swell period subscore (0–100).
 * Below min: 0–20, min→ideal[0]: 20–60, inside ideal: 70–100, above ideal[1]: 60–80.
 * All using linear interpolation.
 */
export function scoreSwellPeriod(beach: IBeach, period: number): number {
  const min = beach.minSwellPeriodS
  const [idealLow, idealHigh] = beach.idealSwellPeriodS

  if (period < min) {
    // 0 at period=0, 20 at period=min
    return Math.round(lerp(period, 0, min, 0, 20))
  }

  if (period < idealLow) {
    // 20 at min, 60 at idealLow
    return Math.round(lerp(period, min, idealLow, 20, 60))
  }

  if (period <= idealHigh) {
    // Inside ideal range: 70 at edges, 100 at midpoint
    const mid = (idealLow + idealHigh) / 2
    if (period <= mid) {
      return Math.round(lerp(period, idealLow, mid, 70, 100))
    } else {
      return Math.round(lerp(period, mid, idealHigh, 100, 70))
    }
  }

  // Above ideal: 80 just above, decaying to 60
  // Use idealHigh * 2 as the far end
  const farEnd = idealHigh * 2
  return Math.round(lerp(period, idealHigh, farEnd, 80, 60))
}

/**
 * Swell height subscore (0–100).
 * Below min: 0, min→ideal[0]: 20–70, inside ideal: 80–100,
 * above ideal: penalty scaled by skillLevel.
 */
/**
 * Wind subscore (0–100).
 * Standard beaches: score based on wind angle relative to shorelineNormalDeg and speed.
 * Wave-generating-onshore beaches: additive modifiers from baseline 50.
 * Dual-mode: if beach has windScoringLogic and wind is within ±30° of generating wind, use WGO logic.
 */
export function scoreWind(beach: IBeach, windDir: number, windSpeed: number): number {
  // Dual-mode check: if beach has windScoringLogic AND wind is near generating wind dir, use WGO logic
  if (beach.windScoringLogic && beach.idealWindDescription === 'wave-generating-onshore') {
    const genDir = beach.windScoringLogic.swellGeneratingWind.directionDeg
    const nearGeneratingWind = angularDistance(windDir, genDir) <= 30

    if (nearGeneratingWind) {
      return scoreWindWaveGenerating(beach, windDir, windSpeed)
    } else {
      return scoreWindStandard(beach, windDir, windSpeed)
    }
  }

  return scoreWindStandard(beach, windDir, windSpeed)
}

function scoreWindStandard(beach: IBeach, windDir: number, windSpeed: number): number {
  const windAngle = angularDistance(windDir, beach.shorelineNormalDeg)

  // Glassy: any direction, speed < 5 km/h
  if (windSpeed < 5) return 100

  // Offshore (< 30°)
  if (windAngle < 30) {
    if (windSpeed < 15) {
      // Light offshore: 90–100 (100 at 5, 90 at 15)
      return Math.round(lerp(windSpeed, 5, 15, 100, 90))
    }
    if (windSpeed <= 25) {
      // Moderate offshore: 70–85
      return Math.round(lerp(windSpeed, 15, 25, 85, 70))
    }
    if (windSpeed <= 35) {
      // Between moderate and strong: 60–70
      return Math.round(lerp(windSpeed, 25, 35, 70, 60))
    }
    // Strong offshore (> 35): 40–60
    return Math.round(lerp(windSpeed, 35, 60, 60, 40))
  }

  // Cross-shore (30–70°): 40–70
  if (windAngle <= 70) {
    return Math.round(lerp(windAngle, 30, 70, 70, 40))
  }

  // Onshore (70–120°): 20–45
  if (windAngle <= 120) {
    // Strong onshore check within this range
    if (windAngle > 120 && windSpeed > 20) {
      return Math.round(lerp(windSpeed, 20, 40, 20, 0))
    }
    return Math.round(lerp(windAngle, 70, 120, 45, 20))
  }

  // Strong onshore (> 120° and speed > 20): 0–20
  if (windSpeed > 20) {
    return Math.round(lerp(windSpeed, 20, 40, 20, 0))
  }
  // > 120° but light wind: still poor but not worst
  return Math.round(lerp(windAngle, 120, 180, 20, 10))
}

function scoreWindWaveGenerating(beach: IBeach, windDir: number, windSpeed: number): number {
  const wsl = beach.windScoringLogic!
  let score = 50

  const genDir = wsl.swellGeneratingWind.directionDeg
  const nearGenWind = angularDistance(windDir, genDir) <= 20

  // +20 if generating wind present (direction ±20° and speed >= min)
  if (nearGenWind && windSpeed >= wsl.swellGeneratingWind.minSpeedKmh) {
    score += 20
  }

  // +25 if wind near quality multiplier direction (±20°)
  if (angularDistance(windDir, wsl.qualityMultiplier.triggerDirectionDeg) <= 20) {
    score += 25
  }

  // -35 (or -21 for side-onshore) if generating wind is too strong
  if (nearGenWind && windSpeed > wsl.messinesspenalty.thresholdSpeedKmh) {
    const windAngleToNormal = angularDistance(windDir, beach.shorelineNormalDeg)
    if (windAngleToNormal > 45) {
      // Side-onshore: reduce penalty by 40% (35 * 0.6 = 21)
      score -= 21
    } else {
      score -= 35
    }
  }

  return Math.max(0, Math.min(100, score))
}

export function scoreSwellHeight(beach: IBeach, height: number): number {
  const min = beach.minSwellHeightM
  const [idealLow, idealHigh] = beach.idealSwellHeightM

  if (height < min) {
    // Should be gated, but return 0
    return 0
  }

  if (height < idealLow) {
    // 20 at min, 70 at idealLow
    return Math.round(lerp(height, min, idealLow, 20, 70))
  }

  if (height <= idealHigh) {
    // Inside ideal: 80 at edges, 100 at midpoint
    const mid = (idealLow + idealHigh) / 2
    if (height <= mid) {
      return Math.round(lerp(height, idealLow, mid, 80, 100))
    } else {
      return Math.round(lerp(height, mid, idealHigh, 100, 80))
    }
  }

  // Above ideal: penalty scaled by skill level
  // Penalty range depends on how far above ideal
  const overFactor = (height - idealHigh) / idealHigh // 0 at edge, 1 at 2x ideal
  const clampedOver = Math.min(overFactor, 1)

  switch (beach.skillLevel) {
    case 'advanced':
      // 70 just above → 50 at far end
      return Math.round(70 - clampedOver * 20)
    case 'intermediate':
      // 55 just above → 30 at far end
      return Math.round(55 - clampedOver * 25)
    case 'beginner':
      // 30 just above → 0 at far end
      return Math.round(30 - clampedOver * 30)
    default:
      return Math.round(55 - clampedOver * 25)
  }
}
