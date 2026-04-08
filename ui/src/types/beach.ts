export interface Beach {
  id: string
  name: string
  region: string
  coords: { lat: number; lon: number }
  skillLevel: string
  tags: string[]
  currentScore: number | null
  currentLabel: string | null
  lastUpdated: string | null
  swellHeight?: number | null
  swellPeriod?: number | null
  swellDirection?: number | null
  windSpeed?: number | null
  windDirection?: number | null
  bestWindowStart?: string | null
  bestWindowEnd?: string | null
}
