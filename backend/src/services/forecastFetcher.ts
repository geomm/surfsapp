import { IBeach } from '../models/Beach'
import { IHourlyForecast, ForecastSnapshot } from '../models/ForecastSnapshot'
import { Beach } from '../models/Beach'
import { scoreHour, computeDailySummaries } from './scoringEngine'

const MARINE_VARIABLES = [
  'swell_wave_height',
  'swell_wave_period',
  'swell_wave_direction',
  'wave_height',
]

const WIND_VARIABLES = ['wind_speed_10m', 'wind_direction_10m']

export async function fetchForecastForBeach(beach: IBeach): Promise<IHourlyForecast[]> {
  const coords = beach.offshoreCoords ?? beach.coords
  const baseParams = {
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    forecast_days: '10',
    timezone: 'UTC',
  }

  const marineParams = new URLSearchParams({
    ...baseParams,
    hourly: MARINE_VARIABLES.join(','),
  })
  const windParams = new URLSearchParams({
    ...baseParams,
    hourly: WIND_VARIABLES.join(','),
  })

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?${marineParams.toString()}`
  const windUrl = `https://api.open-meteo.com/v1/forecast?${windParams.toString()}`

  const [marineResponse, windResponse] = await Promise.all([
    fetch(marineUrl),
    fetch(windUrl),
  ])

  if (!marineResponse.ok) {
    throw new Error(
      `Failed to fetch marine forecast for beach ${beach.id}: HTTP ${marineResponse.status}`
    )
  }
  if (!windResponse.ok) {
    throw new Error(
      `Failed to fetch wind forecast for beach ${beach.id}: HTTP ${windResponse.status}`
    )
  }

  const marineData = (await marineResponse.json()) as {
    hourly: { time: string[] } & Record<string, number[]>
  }
  const windData = (await windResponse.json()) as {
    hourly: { time: string[] } & Record<string, number[]>
  }

  // Build a lookup of wind values by timestamp so we can merge by time
  // (the two APIs should return aligned hourly grids, but be defensive)
  const windByTime = new Map<string, { speed: number; direction: number }>()
  windData.hourly.time.forEach((t, i) => {
    windByTime.set(t, {
      speed: windData.hourly.wind_speed_10m?.[i],
      direction: windData.hourly.wind_direction_10m?.[i],
    })
  })

  const times = marineData.hourly.time
  const fetchedAt = new Date()

  return times.map((timeStr, i) => {
    const rawData: Record<string, unknown> = {}
    for (const variable of MARINE_VARIABLES) {
      rawData[variable] = marineData.hourly[variable]?.[i]
    }
    const wind = windByTime.get(timeStr)
    rawData.wind_speed_10m = wind?.speed
    rawData.wind_direction_10m = wind?.direction

    const timestamp = new Date(timeStr + 'Z')
    const scored = scoreHour(beach, rawData, timestamp, fetchedAt)

    return {
      timestamp,
      rawData,
      surfScore: scored.surfScore,
      label: scored.label as IHourlyForecast['label'],
      reasons: scored.reasons,
      confidence: scored.confidence,
    }
  })
}

export async function saveForecastSnapshot(
  beachId: string,
  hourlyForecasts: IHourlyForecast[]
): Promise<void> {
  const dailySummaries = computeDailySummaries(hourlyForecasts)

  await ForecastSnapshot.create({
    beachId,
    fetchedAt: new Date(),
    hourlyForecasts,
    dailySummaries,
  })
}

export async function fetchAllBeaches(): Promise<void> {
  const beaches = await Beach.find({})
  let successCount = 0

  for (const beach of beaches) {
    try {
      const hourlyForecasts = await fetchForecastForBeach(beach)
      await saveForecastSnapshot(beach.id, hourlyForecasts)
      console.log(`Fetched forecast for ${beach.id}`)
      successCount++
    } catch (err) {
      console.error(`Failed to fetch ${beach.id}:`, err)
    }
  }

  console.log(`Forecast fetch complete: ${successCount}/${beaches.length} beaches updated`)
}
