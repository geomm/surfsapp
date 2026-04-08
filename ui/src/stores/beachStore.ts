import { defineStore } from 'pinia'
import type { Beach, ForecastSnapshot } from '../types/beach'

const API_BASE = 'http://localhost:3000'

interface BeachState {
  beaches: Beach[]
  loading: boolean
  error: string | null
  favourites: Set<string>
  selectedBeach: Beach | null
  selectedForecast: ForecastSnapshot | null
  detailLoading: boolean
  detailError: string | null
}

export const useBeachStore = defineStore('beach', {
  state: (): BeachState => ({
    beaches: [],
    loading: false,
    error: null,
    favourites: new Set<string>(),
    selectedBeach: null,
    selectedForecast: null,
    detailLoading: false,
    detailError: null,
  }),
  getters: {
    sortedBeaches(state): Beach[] {
      return [...state.beaches].sort((a, b) => {
        if (a.currentScore === null && b.currentScore === null) return 0
        if (a.currentScore === null) return 1
        if (b.currentScore === null) return -1
        return b.currentScore - a.currentScore
      })
    },
    favouriteBeaches(state): Beach[] {
      return state.beaches.filter((b) => state.favourites.has(b.id))
    },
  },
  actions: {
    async fetchBeaches() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(`${API_BASE}/beaches`)
        if (!res.ok) throw new Error(`Failed to fetch beaches: ${res.status}`)
        const data = (await res.json()) as Beach[]
        const today = new Date().toISOString().slice(0, 10)
        const enriched = await Promise.all(
          data.map(async (beach) => {
            try {
              const fRes = await fetch(`${API_BASE}/beaches/${beach.id}/forecast`)
              if (!fRes.ok) return beach
              const forecast = await fRes.json()
              const first = forecast?.hourlyForecasts?.[0]?.rawData ?? {}
              const todaySummary =
                forecast?.dailySummaries?.find((d: { date?: string }) =>
                  typeof d?.date === 'string' ? d.date.startsWith(today) : false,
                ) ?? forecast?.dailySummaries?.[0]
              return {
                ...beach,
                swellHeight: first.swell_wave_height ?? null,
                swellPeriod: first.swell_wave_period ?? null,
                swellDirection: first.swell_wave_direction ?? null,
                windSpeed: first.wind_speed_10m ?? null,
                windDirection: first.wind_direction_10m ?? null,
                bestWindowStart: todaySummary?.bestWindowStart ?? null,
                bestWindowEnd: todaySummary?.bestWindowEnd ?? null,
              } as Beach
            } catch {
              return beach
            }
          }),
        )
        this.beaches = enriched
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
      } finally {
        this.loading = false
      }
    },
    async fetchBeachDetail(id: string) {
      this.detailLoading = true
      this.detailError = null
      const cached = this.beaches.find((b) => b.id === id)
      if (cached) this.selectedBeach = cached
      try {
        const [beachRes, forecastRes] = await Promise.all([
          fetch(`${API_BASE}/beaches/${id}`),
          fetch(`${API_BASE}/beaches/${id}/forecast`),
        ])
        if (!beachRes.ok) throw new Error(`Failed to fetch beach: ${beachRes.status}`)
        if (!forecastRes.ok) throw new Error(`Failed to fetch forecast: ${forecastRes.status}`)
        const beach = (await beachRes.json()) as Beach
        const forecast = (await forecastRes.json()) as ForecastSnapshot
        this.selectedBeach = beach
        this.selectedForecast = forecast
      } catch (err) {
        this.detailError = err instanceof Error ? err.message : 'Unknown error'
      } finally {
        this.detailLoading = false
      }
    },
    clearSelectedBeach() {
      this.selectedBeach = null
      this.selectedForecast = null
    },
    toggleFavourite(beachId: string) {
      if (this.favourites.has(beachId)) {
        this.favourites.delete(beachId)
      } else {
        this.favourites.add(beachId)
      }
    },
  },
})
