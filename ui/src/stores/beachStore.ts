import { defineStore } from 'pinia'
import type { Beach } from '../types/beach'

const API_BASE = 'http://localhost:3000'

interface BeachState {
  beaches: Beach[]
  loading: boolean
  error: string | null
  favourites: Set<string>
}

export const useBeachStore = defineStore('beach', {
  state: (): BeachState => ({
    beaches: [],
    loading: false,
    error: null,
    favourites: new Set<string>(),
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
        const data = await res.json()
        this.beaches = data as Beach[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error'
      } finally {
        this.loading = false
      }
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
