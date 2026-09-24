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
  /** Internal: who ended it. Never returned to the other partner (AC-1.13). */
  endedBy?: Id | null
  /** Internal: members who have seen the "link has ended" notice. */
  endNoticeSeenBy?: Id[]
}

export type ConsentPurpose = 'store_reflections' | 'ai_insights' | 'therapist_access'

/** Append-only: changes withdraw the current row and add a new one (AC-1.3). */
export type Consent = {
  id: Id
  userId: Id
  purpose: ConsentPurpose
  version: number
  givenAt: string
  withdrawnAt: string | null
}

export type PairRequest = {
  id: Id
  fromId: Id
  toId: Id
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  createdAt: string
  expiresAt: string
  resolvedAt: string | null
}

/** What a viewer sees of a pending request. */
export type PairRequestView = {
  id: Id
  direction: 'incoming' | 'outgoing'
  otherId: Id
  otherName: string
  createdAt: string
}

export type PairCandidate = { id: Id; displayName: string }

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
  consents: Consent[]
  pairRequests: PairRequest[]
}
