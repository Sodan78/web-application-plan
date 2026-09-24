import { isValidEcrRsAnswers, scoreEcrRs } from './scoring'
import { emptyDatabase, type Storage } from './storage'
import type {
  Checkin,
  CheckinStatus,
  CheckinView,
  Consent,
  ConsentPurpose,
  Couple,
  Database,
  Id,
  PairCandidate,
  PairRequestView,
  Profile,
  PromptKey,
  Reflection,
  Share,
  Weekday,
} from './types'

export class AccessError extends Error {}

/** Version of the consent text users agree to. Bump when the wording changes. */
export const CONSENT_VERSION = 1
const DAY_MS = 24 * 60 * 60 * 1000
const PAIR_REQUEST_TTL_MS = 7 * DAY_MS
const CHECKIN_TTL_MS = 14 * DAY_MS
const DEFAULT_WEEKDAY: Weekday = 0

/** Start (local midnight) of the latest date on or before `from` that falls on `weekday`. */
function mostRecentWeekday(from: Date, weekday: Weekday): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7))
  return d
}

/**
 * The only way the app reads or writes data. Every call takes the viewer's id,
 * and all privacy rules (SPEC P1, P3) are enforced here, not in components.
 * When a real backend arrives, these rules move to the server.
 */
export function createRepository(storage: Storage, now = () => new Date().toISOString()) {
  let db: Database = storage.load() ?? emptyDatabase()

  const commit = () => storage.save(db)
  const id = () => crypto.randomUUID()

  const activeCoupleOf = (userId: Id): Couple | undefined =>
    db.couples.find((c) => c.status === 'active' && c.memberIds.includes(userId))

  const currentConsent = (userId: Id, purpose: ConsentPurpose): Consent | undefined =>
    db.consents.find((c) => c.userId === userId && c.purpose === purpose && c.withdrawnAt === null)

  const requireStoreConsent = (userId: Id) => {
    if (!currentConsent(userId, 'store_reflections')) {
      throw new AccessError('Consent to store reflections is required')
    }
  }

  const requireCheckinAccess = (viewerId: Id, checkinId: Id): Checkin => {
    const checkin = db.checkins.find((c) => c.id === checkinId)
    const couple = checkin && db.couples.find((c) => c.id === checkin.coupleId)
    if (!checkin || !couple?.memberIds.includes(viewerId)) throw new AccessError('No access to check-in')
    return checkin
  }

  /** Marks pending requests past their expiry as expired (AC-1.9). */
  const expireStale = () => {
    const t = now()
    let changed = false
    for (const r of db.pairRequests) {
      if (r.status === 'pending' && r.expiresAt <= t) {
        r.status = 'expired'
        r.resolvedAt = t
        changed = true
      }
    }
    if (changed) commit()
  }

  /** Cancels every pending request sent or received by any of these users. */
  const cancelPendingInvolving = (userIds: Id[], exceptId?: Id) => {
    for (const r of db.pairRequests) {
      if (
        r.status === 'pending' &&
        r.id !== exceptId &&
        (userIds.includes(r.fromId) || userIds.includes(r.toId))
      ) {
        r.status = 'cancelled'
        r.resolvedAt = now()
      }
    }
  }

  const openCheckinOf = (coupleId: Id): Checkin | undefined =>
    db.checkins.find((c) => c.coupleId === coupleId && c.closedAt === null)

  /** Open check-ins older than 14 days close without sharing drafts (AC-2.13). */
  const closeStale = () => {
    const cutoff = Date.parse(now()) - CHECKIN_TTL_MS
    let changed = false
    for (const c of db.checkins) {
      if (c.closedAt === null && Date.parse(c.createdAt) <= cutoff) {
        c.closedAt = now()
        changed = true
      }
    }
    if (changed) commit()
  }

  const requireAssessment = (userId: Id) => {
    if (!db.assessments.some((a) => a.userId === userId)) throw new AccessError('Complete the questionnaire first')
  }

  const requireWritable = (viewerId: Id, checkin: Checkin) => {
    const couple = db.couples.find((c) => c.id === checkin.coupleId)
    if (couple?.status !== 'active') throw new AccessError('This couple has ended')
    if (checkin.closedAt !== null) throw new AccessError('This check-in is closed')
    if (checkin.completedBy.includes(viewerId)) throw new AccessError('You have finished this check-in')
  }

  const view = (viewerId: Id, checkin: Checkin): CheckinView => {
    const couple = db.couples.find((c) => c.id === checkin.coupleId)
    const partnerId = couple?.memberIds.find((m) => m !== viewerId)
    const started = db.reflections.some((r) => r.checkinId === checkin.id && r.authorId === viewerId)
    return {
      id: checkin.id,
      createdAt: checkin.createdAt,
      closedAt: checkin.closedAt,
      myStatus: checkin.completedBy.includes(viewerId) ? 'finished' : started ? 'in_progress' : 'not_started',
      partnerFinished: partnerId ? checkin.completedBy.includes(partnerId) : false,
      coupleActive: couple?.status === 'active',
    }
  }

  const displayName = (userId: Id) => db.profiles.find((p) => p.id === userId)?.displayName ?? ''

  return {
    // Profiles
    async listProfiles(): Promise<Profile[]> {
      return db.profiles
    },

    async createProfile(name: string): Promise<Profile> {
      const profile = { id: id(), displayName: name.trim(), createdAt: now() }
      db.profiles.push(profile)
      commit()
      return profile
    },

    // Consents (FR-2)
    async getConsents(viewerId: Id): Promise<Consent[]> {
      return db.consents.filter((c) => c.userId === viewerId && c.withdrawnAt === null)
    },

    async setConsent(viewerId: Id, purpose: ConsentPurpose, given: boolean): Promise<void> {
      const current = currentConsent(viewerId, purpose)
      if (given && current?.version === CONSENT_VERSION) return
      if (!given && !current) return
      if (current) current.withdrawnAt = now()
      if (given) {
        db.consents.push({
          id: id(),
          userId: viewerId,
          purpose,
          version: CONSENT_VERSION,
          givenAt: now(),
          withdrawnAt: null,
        })
      }
      if (!given && purpose === 'store_reflections') cancelPendingInvolving([viewerId])
      commit()
    },

    // Pairing (FR-4)
    async listPairCandidates(viewerId: Id): Promise<PairCandidate[]> {
      return db.profiles
        .filter((p) => p.id !== viewerId && !activeCoupleOf(p.id))
        .map((p) => ({ id: p.id, displayName: p.displayName }))
    },

    async requestPair(viewerId: Id, toId: Id): Promise<void> {
      expireStale()
      requireStoreConsent(viewerId)
      if (viewerId === toId) throw new AccessError('Cannot pair with yourself')
      if (!db.profiles.some((p) => p.id === toId)) throw new AccessError('Unknown profile')
      if (activeCoupleOf(viewerId) || activeCoupleOf(toId)) throw new AccessError('Already in an active couple')
      if (db.pairRequests.some((r) => r.status === 'pending' && r.fromId === viewerId)) {
        throw new AccessError('You already have a pending request')
      }
      const createdAt = now()
      db.pairRequests.push({
        id: id(),
        fromId: viewerId,
        toId,
        status: 'pending',
        createdAt,
        expiresAt: new Date(Date.parse(createdAt) + PAIR_REQUEST_TTL_MS).toISOString(),
        resolvedAt: null,
      })
      commit()
    },

    async listPairRequests(viewerId: Id): Promise<PairRequestView[]> {
      expireStale()
      return db.pairRequests
        .filter((r) => r.status === 'pending' && (r.fromId === viewerId || r.toId === viewerId))
        .map((r) => {
          const incoming = r.toId === viewerId
          const otherId = incoming ? r.fromId : r.toId
          return {
            id: r.id,
            direction: incoming ? 'incoming' : 'outgoing',
            otherId,
            otherName: displayName(otherId),
            createdAt: r.createdAt,
          }
        })
    },

    async respondToPair(viewerId: Id, requestId: Id, accept: boolean): Promise<void> {
      expireStale()
      const request = db.pairRequests.find((r) => r.id === requestId)
      if (!request || request.toId !== viewerId) throw new AccessError('Not your request')
      if (request.status !== 'pending') throw new AccessError('Request is no longer open')
      if (!accept) {
        request.status = 'declined'
        request.resolvedAt = now()
        commit()
        return
      }
      requireStoreConsent(viewerId)
      if (activeCoupleOf(request.fromId) || activeCoupleOf(viewerId)) {
        throw new AccessError('Already in an active couple')
      }
      request.status = 'accepted'
      request.resolvedAt = now()
      db.couples.push({
        id: id(),
        memberIds: [request.fromId, viewerId],
        status: 'active',
        createdAt: now(),
        endedAt: null,
        endedBy: null,
        endNoticeSeenBy: [],
      })
      cancelPendingInvolving([request.fromId, viewerId], request.id)
      commit()
    },

    async cancelPairRequest(viewerId: Id, requestId: Id): Promise<void> {
      const request = db.pairRequests.find((r) => r.id === requestId)
      if (!request || request.fromId !== viewerId) throw new AccessError('Not your request')
      if (request.status !== 'pending') return
      request.status = 'cancelled'
      request.resolvedAt = now()
      commit()
    },

    // Couples
    async getActiveCouple(viewerId: Id): Promise<{ id: Id; partner: PairCandidate; since: string } | null> {
      const couple = activeCoupleOf(viewerId)
      if (!couple) return null
      const partnerId = couple.memberIds.find((m) => m !== viewerId) ?? ''
      return {
        id: couple.id,
        partner: { id: partnerId, displayName: displayName(partnerId) },
        since: couple.createdAt,
      }
    },

    async endCouple(viewerId: Id): Promise<void> {
      const couple = activeCoupleOf(viewerId)
      if (!couple) throw new AccessError('No active couple')
      couple.status = 'ended'
      couple.endedAt = now()
      couple.endedBy = viewerId
      couple.endNoticeSeenBy = [viewerId]
      commit()
    },

    /** True once for the partner who didn't end the couple (AC-1.13). */
    async hasUnseenEndNotice(viewerId: Id): Promise<boolean> {
      return db.couples.some(
        (c) =>
          c.status === 'ended' &&
          c.memberIds.includes(viewerId) &&
          !(c.endNoticeSeenBy ?? []).includes(viewerId),
      )
    },

    async dismissEndNotice(viewerId: Id): Promise<void> {
      for (const c of db.couples) {
        if (c.status === 'ended' && c.memberIds.includes(viewerId)) {
          c.endNoticeSeenBy = [...new Set([...(c.endNoticeSeenBy ?? []), viewerId])]
        }
      }
      commit()
    },

    // Assessment (FR-5..7): answers and scores never leave the repository.
    async hasCompletedAssessment(viewerId: Id): Promise<boolean> {
      return db.assessments.some((a) => a.userId === viewerId)
    },

    async saveAssessment(viewerId: Id, answers: number[]): Promise<void> {
      requireStoreConsent(viewerId)
      if (!isValidEcrRsAnswers(answers)) throw new AccessError('Expected 9 answers from 1 to 7')
      db.assessments = db.assessments.filter((a) => a.userId !== viewerId)
      db.assessments.push({
        id: id(),
        userId: viewerId,
        instrument: 'ECR-RS-partner',
        version: 1,
        answers: [...answers],
        scores: scoreEcrRs(answers),
        completedAt: now(),
      })
      commit()
    },

    // Check-ins (FR-8..13)
    async setCheckinWeekday(viewerId: Id, weekday: Weekday): Promise<void> {
      const couple = activeCoupleOf(viewerId)
      if (!couple) throw new AccessError('No active couple')
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new AccessError('Invalid weekday')
      couple.checkinWeekday = weekday
      commit()
    },

    async getCheckinStatus(viewerId: Id): Promise<CheckinStatus | null> {
      closeStale()
      const couple = activeCoupleOf(viewerId)
      if (!couple) return null
      const weekday = couple.checkinWeekday ?? DEFAULT_WEEKDAY
      const lastScheduled = mostRecentWeekday(new Date(now()), weekday)
      const open = openCheckinOf(couple.id)
      const startedSince = db.checkins.some(
        (c) => c.coupleId === couple.id && Date.parse(c.createdAt) >= lastScheduled.getTime(),
      )
      const next = new Date(lastScheduled)
      next.setDate(next.getDate() + 7)
      return {
        due: !open && !startedSince,
        nextDate: next.toISOString(),
        weekday,
        open: open ? view(viewerId, open) : null,
      }
    },

    async startCheckin(viewerId: Id): Promise<CheckinView> {
      closeStale()
      requireStoreConsent(viewerId)
      const couple = activeCoupleOf(viewerId)
      if (!couple) throw new AccessError('Pair with your partner first')
      requireAssessment(viewerId)
      const open = openCheckinOf(couple.id)
      if (open) return view(viewerId, open)
      const checkin: Checkin = { id: id(), coupleId: couple.id, createdAt: now(), completedBy: [], closedAt: null }
      db.checkins.push(checkin)
      commit()
      return view(viewerId, checkin)
    },

    async getCheckin(viewerId: Id, checkinId: Id): Promise<CheckinView> {
      closeStale()
      return view(viewerId, requireCheckinAccess(viewerId, checkinId))
    },

    /** Newest first. */
    async listCheckins(viewerId: Id): Promise<CheckinView[]> {
      closeStale()
      const coupleIds = db.couples.filter((c) => c.memberIds.includes(viewerId)).map((c) => c.id)
      return db.checkins
        .filter((c) => coupleIds.includes(c.coupleId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((c) => view(viewerId, c))
    },

    // Reflections: author only
    /** One per prompt; saving again replaces it, empty text removes it (AC-2.6). */
    async saveReflection(viewerId: Id, checkinId: Id, prompt: PromptKey, body: string): Promise<void> {
      closeStale()
      requireStoreConsent(viewerId)
      requireAssessment(viewerId)
      requireWritable(viewerId, requireCheckinAccess(viewerId, checkinId))
      const existing = db.reflections.find(
        (r) => r.checkinId === checkinId && r.authorId === viewerId && r.prompt === prompt,
      )
      const text = body.trim()
      if (!text) {
        if (existing) db.reflections = db.reflections.filter((r) => r !== existing)
      } else if (existing) {
        existing.body = text
      } else {
        db.reflections.push({ id: id(), checkinId, authorId: viewerId, prompt, body: text, createdAt: now() })
      }
      commit()
    },

    async listMyReflections(viewerId: Id, checkinId: Id): Promise<Reflection[]> {
      return db.reflections.filter((r) => r.authorId === viewerId && r.checkinId === checkinId)
    },

    /** Shares the chosen items and marks the viewer finished, all or nothing (AC-2.8). */
    async finishCheckin(viewerId: Id, checkinId: Id, shares: { prompt: PromptKey; body: string }[]): Promise<void> {
      closeStale()
      const checkin = requireCheckinAccess(viewerId, checkinId)
      requireWritable(viewerId, checkin)
      const mine = db.reflections.filter((r) => r.checkinId === checkinId && r.authorId === viewerId)
      if (mine.length === 0) throw new AccessError('Write at least one answer first')
      const toShare = shares.map((s) => {
        const reflection = mine.find((r) => r.prompt === s.prompt)
        const body = s.body.trim()
        if (!reflection || !body) throw new AccessError('Can only share an answer you wrote')
        return { reflection, body }
      })

      for (const { reflection, body } of toShare) {
        db.shares.push({
          id: id(),
          reflectionId: reflection.id,
          prompt: reflection.prompt,
          checkinId,
          coupleId: checkin.coupleId,
          authorId: viewerId,
          body,
          sharedAt: now(),
          withdrawnAt: null,
        })
      }
      checkin.completedBy.push(viewerId)
      const couple = db.couples.find((c) => c.id === checkin.coupleId)
      if (couple?.memberIds.every((m) => checkin.completedBy.includes(m))) checkin.closedAt = now()
      commit()
    },

    async withdrawShare(viewerId: Id, shareId: Id): Promise<void> {
      const share = db.shares.find((s) => s.id === shareId)
      if (!share || share.authorId !== viewerId) throw new AccessError('Not your share')
      share.withdrawnAt ??= now()
      commit()
    },

    /**
     * Own shares always (including taken-back ones, so the author sees "You took this back").
     * Partner's only after the viewer has finished, while not withdrawn and the couple is active.
     */
    async listShares(viewerId: Id, checkinId: Id): Promise<Share[]> {
      const checkin = requireCheckinAccess(viewerId, checkinId)
      const coupleActive = db.couples.find((c) => c.id === checkin.coupleId)?.status === 'active'
      const viewerFinished = checkin.completedBy.includes(viewerId)
      return db.shares.filter(
        (s) =>
          s.checkinId === checkinId &&
          (s.authorId === viewerId || (coupleActive && viewerFinished && s.withdrawnAt === null)),
      )
    },
  }
}

export type Repository = ReturnType<typeof createRepository>
