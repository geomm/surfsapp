export interface Beach {
  id: string;
  name: string;
  region: string;
  coords: { lat: number; lon: number };
  skillLevel: string;
  tags: string[];
  currentScore: number | null;
  currentLabel: string | null;
  lastUpdated: string | null;
  swellHeight?: number | null;
  swellPeriod?: number | null;
  swellDirection?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
  bestWindowStart?: string | null;
  bestWindowEnd?: string | null;
}

export interface HourlyForecast {
  timestamp: string;
  rawData: Record<string, number>;
  surfScore: number;
  label: string;
  reasons: string[];
  confidence: number;
}

export interface DailySummary {
  date: string;
  bestWindowStart: string | null;
  bestWindowEnd: string | null;
  peakScore: number;
  overallLabel: string;
}

export interface ForecastSnapshot {
  beachId: string;
  fetchedAt: string;
  hourlyForecasts: HourlyForecast[];
  dailySummaries: DailySummary[];
}
