import Dexie, { type Table } from 'dexie'

export interface FavouriteRecord {
  beachId: string
}

export interface SettingRecord {
  key: string
  value: unknown
}

export class SurfsAppDB extends Dexie {
  favourites!: Table<FavouriteRecord, string>
  settings!: Table<SettingRecord, string>

  constructor() {
    super('surfsapp')
    this.version(1).stores({
      favourites: '&beachId',
      settings: '&key',
    })
  }
}

export const db = new SurfsAppDB()
