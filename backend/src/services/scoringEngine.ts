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
