import { emptyDatabase, type Storage } from './storage'
import type {
  Checkin,
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
} from './types'

export class AccessError extends Error {}

/** Version of the consent text users agree to. Bump when the wording changes. */
export const CONSENT_VERSION = 1
const PAIR_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * The only way the app reads or writes data. Every call takes the viewer's id,
 * and all privacy rules (SPEC P1, P3) are enforced here, not in components.
 * When a real backend arrives, these rules move to the server.
 */
export function createRepository(storage: Storage, now = () => new Date().toISOString()) {
  const db: Database = storage.load() ?? emptyDatabase()

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

    // Check-ins
    async startCheckin(viewerId: Id): Promise<Checkin> {
      requireStoreConsent(viewerId)
      const couple = activeCoupleOf(viewerId)
      if (!couple) throw new AccessError('Pair with your partner first')
      const checkin = { id: id(), coupleId: couple.id, createdAt: now() }
      db.checkins.push(checkin)
      commit()
      return checkin
    },

    async listCheckins(viewerId: Id): Promise<Checkin[]> {
      const coupleIds = db.couples.filter((c) => c.memberIds.includes(viewerId)).map((c) => c.id)
      return db.checkins.filter((c) => coupleIds.includes(c.coupleId))
    },

    // Reflections: author only
    async saveReflection(viewerId: Id, checkinId: Id, prompt: PromptKey, body: string): Promise<Reflection> {
      requireStoreConsent(viewerId)
      requireCheckinAccess(viewerId, checkinId)
      const reflection = { id: id(), checkinId, authorId: viewerId, prompt, body, createdAt: now() }
      db.reflections.push(reflection)
      commit()
      return reflection
    },

    async listMyReflections(viewerId: Id, checkinId: Id): Promise<Reflection[]> {
      return db.reflections.filter((r) => r.authorId === viewerId && r.checkinId === checkinId)
    },

    // Shares
    async share(viewerId: Id, reflectionId: Id, body: string): Promise<Share> {
      const reflection = db.reflections.find((r) => r.id === reflectionId)
      if (!reflection || reflection.authorId !== viewerId) throw new AccessError('Not your reflection')
      const checkin = requireCheckinAccess(viewerId, reflection.checkinId)
      const share: Share = {
        id: id(),
        reflectionId,
        checkinId: checkin.id,
        coupleId: checkin.coupleId,
        authorId: viewerId,
        body,
        sharedAt: now(),
        withdrawnAt: null,
      }
      db.shares.push(share)
      commit()
      return share
    },

    async withdrawShare(viewerId: Id, shareId: Id): Promise<void> {
      const share = db.shares.find((s) => s.id === shareId)
      if (!share || share.authorId !== viewerId) throw new AccessError('Not your share')
      share.withdrawnAt = now()
      commit()
    },

    /** Own shares always; partner's only while the couple is active and not withdrawn. */
    async listShares(viewerId: Id, checkinId: Id): Promise<Share[]> {
      const checkin = requireCheckinAccess(viewerId, checkinId)
      const coupleActive = db.couples.find((c) => c.id === checkin.coupleId)?.status === 'active'
      return db.shares.filter(
        (s) =>
          s.checkinId === checkinId &&
          (s.authorId === viewerId || (coupleActive && s.withdrawnAt === null)),
      )
    },
  }
}

export type Repository = ReturnType<typeof createRepository>
