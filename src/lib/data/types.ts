/** Shapes returned by the database functions in supabase/migrations. */
export type Id = string

export type Profile = {
  id: Id
  displayName: string
  email: string
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

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

/** What a viewer sees of a pending request. Outgoing ones show the invited email. */
export type PairRequestView = {
  id: Id
  direction: 'incoming' | 'outgoing'
  otherName: string
  createdAt: string
}

export type ActiveCouple = {
  id: Id
  partner: { id: Id; displayName: string }
  since: string
}

export type CheckinView = {
  id: Id
  createdAt: string
  closedAt: string | null
  myStatus: 'not_started' | 'in_progress' | 'finished'
  partnerFinished: boolean
  /** False once the couple has ended: read-only from then on. */
  coupleActive: boolean
}

export type CheckinStatus = {
  due: boolean
  nextDate: string
  weekday: Weekday
  open: CheckinView | null
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
  prompt: PromptKey
  checkinId: Id
  coupleId: Id
  authorId: Id
  body: string
  sharedAt: string
  withdrawnAt: string | null
}
