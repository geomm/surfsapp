import Dexie, { type Table } from 'dexie'
import type { Beach, ForecastSnapshot } from './types/beach'

export interface FavouriteRecord {
  beachId: string
}

export interface SettingRecord {
  key: string
  value: unknown
}

export type BeachCacheRecord = Beach
export type ForecastCacheRecord = ForecastSnapshot

export class SurfsAppDB extends Dexie {
  favourites!: Table<FavouriteRecord, string>
  settings!: Table<SettingRecord, string>
  beachesCache!: Table<BeachCacheRecord, string>
  forecastsCache!: Table<ForecastCacheRecord, string>

  constructor() {
    super('surfsapp')
    this.version(1).stores({
      favourites: '&beachId',
      settings: '&key',
    })
    this.version(2).stores({
      favourites: '&beachId',
      settings: '&key',
      beachesCache: '&id',
      forecastsCache: '&beachId',
    })
  }
}

export const db = new SurfsAppDB()
