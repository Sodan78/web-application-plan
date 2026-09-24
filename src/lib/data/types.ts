export type Id = string

export type Profile = {
  id: Id
  displayName: string
  createdAt: string
}

export type Couple = {
  id: Id
  memberIds: Id[]
  status: 'active' | 'ended'
  createdAt: string
  endedAt: string | null
}

export type Checkin = {
  id: Id
  coupleId: Id
  createdAt: string
}

export type PromptKey = 'situation' | 'feeling' | 'need' | 'action'

/** Private to its author. Never returned to anyone else (SPEC P1). */
export type Reflection = {
  id: Id
  checkinId: Id
  authorId: Id
  prompt: PromptKey
  body: string
  createdAt: string
}

/** A separate copy of what the author chose to share (ADR 0003). */
export type Share = {
  id: Id
  reflectionId: Id
  checkinId: Id
  coupleId: Id
  authorId: Id
  body: string
  sharedAt: string
  withdrawnAt: string | null
}

export type Database = {
  version: 1
  profiles: Profile[]
  couples: Couple[]
  checkins: Checkin[]
  reflections: Reflection[]
  shares: Share[]
}
