import { IBeach } from '../models/Beach'
import { IHourlyForecast, ForecastSnapshot } from '../models/ForecastSnapshot'
import { Beach } from '../models/Beach'
import { scoreHour, computeDailySummaries } from './scoringEngine'

const HOURLY_VARIABLES = [
  'swell_wave_height',
  'swell_wave_period',
  'swell_wave_direction',
  // 'swell_wave_height_2',
  // 'swell_wave_direction_2',
  'wind_speed_10m',
  'wind_direction_10m',
  'wave_height',
]

export async function fetchForecastForBeach(beach: IBeach): Promise<IHourlyForecast[]> {
  const coords = beach.offshoreCoords ?? beach.coords
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    hourly: HOURLY_VARIABLES.join(','),
    forecast_days: '10',
    timezone: 'UTC',
  })

  const url = `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`
  // const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch forecast for beach ${beach.id}: HTTP ${response.status}`
    )
  }

  const data = (await response.json()) as {
    hourly: { time: string[] } & Record<string, number[]>
  }

  const times = data.hourly.time

  const fetchedAt = new Date()

  return times.map((timeStr, i) => {
    const rawData: Record<string, unknown> = {}
    for (const variable of HOURLY_VARIABLES) {
      rawData[variable] = data.hourly[variable]?.[i]
    }

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
