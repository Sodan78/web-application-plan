import type { Database } from './types'

/** Where the database is persisted. Swap for a network backend later. */
export type Storage = {
  load(): Database | null
  save(db: Database): void
}

const KEY = 'couplesunite:db:v1'

export const emptyDatabase = (): Database => ({
  version: 1,
  profiles: [],
  couples: [],
  checkins: [],
  reflections: [],
  shares: [],
  consents: [],
  pairRequests: [],
})

export function browserStorage(): Storage {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(KEY)
        // Spread over an empty db so data saved before new collections existed still loads.
        return raw ? { ...emptyDatabase(), ...(JSON.parse(raw) as Partial<Database>) } : null
      } catch {
        return null
      }
    },
    save(db) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(db))
      } catch {
        // Storage full or blocked (private mode); data stays in memory for this tab.
      }
    },
  }
}

export function memoryStorage(initial: Database | null = null): Storage {
  let data = initial
  return {
    load: () => data,
    save: (db) => {
      data = structuredClone(db)
    },
  }
}
