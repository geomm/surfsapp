import { defineStore } from 'pinia';
import type { Beach, ForecastSnapshot } from '../types/beach';
import { db } from '../db';

const API_BASE = '/api';

function enrichBeachWithForecast(beach: Beach, forecast: ForecastSnapshot | null): Beach {
  if (!forecast) return beach;
  const today = new Date().toISOString().slice(0, 10);
  const first: Record<string, number> = forecast?.hourlyForecasts?.[0]?.rawData ?? {};
  const todaySummary =
    forecast?.dailySummaries?.find((d: { date?: string }) =>
      typeof d?.date === 'string' ? d.date.startsWith(today) : false,
    ) ?? forecast?.dailySummaries?.[0];
  return {
    ...beach,
    swellHeight: first.swell_wave_height ?? null,
    swellPeriod: first.swell_wave_period ?? null,
    swellDirection: first.swell_wave_direction ?? null,
    windSpeed: first.wind_speed_10m ?? null,
    windDirection: first.wind_direction_10m ?? null,
    bestWindowStart: todaySummary?.bestWindowStart ?? null,
    bestWindowEnd: todaySummary?.bestWindowEnd ?? null,
  };
}

interface BeachState {
  beaches: Beach[];
  loading: boolean;
  error: string | null;
  favourites: Set<string>;
  showFavouritesOnly: boolean;
  selectedRegions: Set<string>;
  selectedDifficulties: Set<string>;
  selectedBeach: Beach | null;
  selectedForecast: ForecastSnapshot | null;
  detailLoading: boolean;
  detailError: string | null;
}

export const useBeachStore = defineStore('beach', {
  state: (): BeachState => ({
    beaches: [],
    loading: false,
    error: null,
    favourites: new Set<string>(),
    showFavouritesOnly: false,
    selectedRegions: new Set<string>(),
    selectedDifficulties: new Set<string>(),
    selectedBeach: null,
    selectedForecast: null,
    detailLoading: false,
    detailError: null,
  }),
  getters: {
    sortedBeaches(state): Beach[] {
      return [...state.beaches].sort((a, b) => {
        if (a.currentScore === null && b.currentScore === null) return 0;
        if (a.currentScore === null) return 1;
        if (b.currentScore === null) return -1;
        return b.currentScore - a.currentScore;
      });
    },
    favouriteBeaches(state): Beach[] {
      return state.beaches.filter((b) => state.favourites.has(b.id));
    },
    displayedBeaches(state): Beach[] {
      const sorted = this.sortedBeaches;
      return sorted.filter((b) => {
        if (state.selectedRegions.size > 0 && !state.selectedRegions.has(b.region)) return false;
        if (state.selectedDifficulties.size > 0 && !state.selectedDifficulties.has(b.skillLevel))
          return false;
        if (state.showFavouritesOnly && !state.favourites.has(b.id)) return false;
        return true;
      });
    },
    activeFilterCount(state): number {
      let count = 0;
      if (state.selectedRegions.size > 0) count += 1;
      if (state.selectedDifficulties.size > 0) count += 1;
      if (state.showFavouritesOnly) count += 1;
      return count;
    },
    availableRegions(state): string[] {
      const set = new Set<string>();
      for (const b of state.beaches) {
        if (b.region) set.add(b.region);
      }
      return Array.from(set).sort();
    },
    availableDifficulties(state): string[] {
      const set = new Set<string>();
      for (const b of state.beaches) {
        if (b.skillLevel) set.add(b.skillLevel);
      }
      return Array.from(set).sort();
    },
  },
  actions: {
    async fetchBeaches() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`${API_BASE}/beaches`);
        if (!res.ok) throw new Error(`Failed to fetch beaches: ${res.status}`);
        const data = (await res.json()) as Beach[];
        const results = await Promise.all(
          data.map(async (beach) => {
            try {
              const fRes = await fetch(`${API_BASE}/beaches/${beach.id}/forecast`);
              if (!fRes.ok) return { beach, forecast: null as ForecastSnapshot | null };
              const forecast = (await fRes.json()) as ForecastSnapshot;
              return { beach: enrichBeachWithForecast(beach, forecast), forecast };
            } catch {
              return { beach, forecast: null as ForecastSnapshot | null };
            }
          }),
        );
        const enriched = results.map((r) => r.beach);
        this.beaches = enriched;
        db.beachesCache.bulkPut(enriched).catch((err) => {
          console.error('Failed to cache beaches in IndexedDB', err);
        });
        for (const { forecast } of results) {
          if (forecast) {
            db.forecastsCache.put(forecast).catch((err) => {
              console.error('Failed to cache forecast in IndexedDB', err);
            });
          }
        }
      } catch (err) {
        try {
          const cachedBeaches = await db.beachesCache.toArray();
          if (cachedBeaches.length === 0) {
            this.error = 'No internet connection and no cached data available';
            return;
          }
          const enriched = await Promise.all(
            cachedBeaches.map(async (beach) => {
              try {
                const forecast = (await db.forecastsCache.get(beach.id)) ?? null;
                return enrichBeachWithForecast(beach, forecast);
              } catch {
                return beach;
              }
            }),
          );
          this.beaches = enriched;
          this.error = null;
        } catch {
          this.error = err instanceof Error ? err.message : 'Unknown error';
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchBeachDetail(id: string) {
      this.detailLoading = true;
      this.detailError = null;
      const cached = this.beaches.find((b) => b.id === id);
      if (cached) this.selectedBeach = cached;
      try {
        const [beachRes, forecastRes] = await Promise.all([
          fetch(`${API_BASE}/beaches/${id}`),
          fetch(`${API_BASE}/beaches/${id}/forecast`),
        ]);
        if (!beachRes.ok) throw new Error(`Failed to fetch beach: ${beachRes.status}`);
        if (!forecastRes.ok) throw new Error(`Failed to fetch forecast: ${forecastRes.status}`);
        const beach = (await beachRes.json()) as Beach;
        const forecast = (await forecastRes.json()) as ForecastSnapshot;
        this.selectedBeach = beach;
        this.selectedForecast = forecast;
        db.beachesCache.put(beach).catch((err) => {
          console.error('Failed to cache beach in IndexedDB', err);
        });
        db.forecastsCache.put(forecast).catch((err) => {
          console.error('Failed to cache forecast in IndexedDB', err);
        });
      } catch (err) {
        try {
          const [cachedBeach, cachedForecast] = await Promise.all([
            db.beachesCache.get(id),
            db.forecastsCache.get(id),
          ]);
          if (!cachedBeach) {
            this.detailError = 'No internet connection and no cached data for this beach';
            return;
          }
          this.selectedBeach = cachedBeach;
          this.selectedForecast = cachedForecast ?? null;
          this.detailError = null;
        } catch {
          this.detailError = err instanceof Error ? err.message : 'Unknown error';
        }
      } finally {
        this.detailLoading = false;
      }
    },
    clearSelectedBeach() {
      this.selectedBeach = null;
      this.selectedForecast = null;
    },
    async hydrateFavourites() {
      try {
        const records = await db.favourites.toArray();
        this.favourites = new Set(records.map((r) => r.beachId));
      } catch (err) {
        console.error('Failed to hydrate favourites from IndexedDB', err);
      }
    },
    toggleFavouritesFilter() {
      this.showFavouritesOnly = !this.showFavouritesOnly;
      db.settings
        .put({ key: 'showFavouritesOnly', value: this.showFavouritesOnly })
        .catch((err) => {
          console.error('Failed to persist showFavouritesOnly to IndexedDB', err);
        });
    },
    toggleRegion(region: string) {
      if (this.selectedRegions.has(region)) {
        this.selectedRegions.delete(region);
      } else {
        this.selectedRegions.add(region);
      }
      db.settings
        .put({ key: 'selectedRegions', value: Array.from(this.selectedRegions) })
        .catch((err) => {
          console.error('Failed to persist selectedRegions to IndexedDB', err);
        });
    },
    toggleDifficulty(level: string) {
      if (this.selectedDifficulties.has(level)) {
        this.selectedDifficulties.delete(level);
      } else {
        this.selectedDifficulties.add(level);
      }
      db.settings
        .put({ key: 'selectedDifficulties', value: Array.from(this.selectedDifficulties) })
        .catch((err) => {
          console.error('Failed to persist selectedDifficulties to IndexedDB', err);
        });
    },
    clearFilters() {
      this.selectedRegions = new Set<string>();
      this.selectedDifficulties = new Set<string>();
      this.showFavouritesOnly = false;
      db.settings.put({ key: 'selectedRegions', value: [] }).catch((err) => {
        console.error('Failed to persist selectedRegions to IndexedDB', err);
      });
      db.settings.put({ key: 'selectedDifficulties', value: [] }).catch((err) => {
        console.error('Failed to persist selectedDifficulties to IndexedDB', err);
      });
      db.settings.put({ key: 'showFavouritesOnly', value: false }).catch((err) => {
        console.error('Failed to persist showFavouritesOnly to IndexedDB', err);
      });
    },
    async hydrateSettings() {
      try {
        const [regionsRec, difficultiesRec, favFilterRec] = await Promise.all([
          db.settings.get('selectedRegions'),
          db.settings.get('selectedDifficulties'),
          db.settings.get('showFavouritesOnly'),
        ]);
        const regionsVal = regionsRec?.value;
        this.selectedRegions =
          Array.isArray(regionsVal) && regionsVal.every((v) => typeof v === 'string')
            ? new Set<string>(regionsVal as string[])
            : new Set<string>();
        const difficultiesVal = difficultiesRec?.value;
        this.selectedDifficulties =
          Array.isArray(difficultiesVal) && difficultiesVal.every((v) => typeof v === 'string')
            ? new Set<string>(difficultiesVal as string[])
            : new Set<string>();
        const favFilterVal = favFilterRec?.value;
        this.showFavouritesOnly = typeof favFilterVal === 'boolean' ? favFilterVal : false;
      } catch (err) {
        console.error('Failed to hydrate settings from IndexedDB', err);
      }
    },
    toggleFavourite(beachId: string) {
      if (this.favourites.has(beachId)) {
        this.favourites.delete(beachId);
        db.favourites.delete(beachId).catch((err) => {
          console.error('Failed to remove favourite from IndexedDB', err);
        });
      } else {
        this.favourites.add(beachId);
        db.favourites.put({ beachId }).catch((err) => {
          console.error('Failed to persist favourite to IndexedDB', err);
        });
      }
    },
  },
});
