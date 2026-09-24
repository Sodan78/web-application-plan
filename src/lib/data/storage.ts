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
  assessments: [],
})

/** Fills in collections and fields added after data was first saved. */
function normalize(raw: Partial<Database>): Database {
  const db = { ...emptyDatabase(), ...raw }
  db.checkins = db.checkins.map((c) => ({ ...c, completedBy: c.completedBy ?? [], closedAt: c.closedAt ?? null }))
  return db
}

export function browserStorage(): Storage {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(KEY)
        return raw ? normalize(JSON.parse(raw) as Partial<Database>) : null
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
    load: () => (data ? normalize(data) : null),
    save: (db) => {
      data = structuredClone(db)
    },
  }
}
