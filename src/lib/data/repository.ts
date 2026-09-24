import { emptyDatabase, type Storage } from './storage'
import type { Checkin, Couple, Database, Id, Profile, PromptKey, Reflection, Share } from './types'

export class AccessError extends Error {}

/**
 * The only way the app reads or writes data. Every call takes the viewer's id,
 * and all privacy rules (SPEC P1, FR-7, FR-10..13, FR-25) are enforced here, not
 * in components. When a real backend arrives, these rules move to the server.
 */
export function createRepository(storage: Storage, now = () => new Date().toISOString()) {
  let db: Database = storage.load() ?? emptyDatabase()

  const commit = () => storage.save(db)
  const id = () => crypto.randomUUID()

  const activeCoupleOf = (userId: Id): Couple | undefined =>
    db.couples.find((c) => c.status === 'active' && c.memberIds.includes(userId))

  const requireCheckinAccess = (viewerId: Id, checkinId: Id): Checkin => {
    const checkin = db.checkins.find((c) => c.id === checkinId)
    const couple = checkin && db.couples.find((c) => c.id === checkin.coupleId)
    if (!checkin || !couple?.memberIds.includes(viewerId)) throw new AccessError('No access to check-in')
    return checkin
  }

  return {
    // Profiles
    async listProfiles(): Promise<Profile[]> {
      return db.profiles
    },

    async createProfile(displayName: string): Promise<Profile> {
      const profile = { id: id(), displayName: displayName.trim(), createdAt: now() }
      db.profiles.push(profile)
      commit()
      return profile
    },

    // Couples
    async getActiveCouple(viewerId: Id): Promise<Couple | null> {
      return activeCoupleOf(viewerId) ?? null
    },

    async pair(viewerId: Id, partnerId: Id): Promise<Couple> {
      if (viewerId === partnerId) throw new AccessError('Cannot pair with yourself')
      if (activeCoupleOf(viewerId) || activeCoupleOf(partnerId)) {
        throw new AccessError('Already in an active couple')
      }
      const couple: Couple = {
        id: id(),
        memberIds: [viewerId, partnerId],
        status: 'active',
        createdAt: now(),
        endedAt: null,
      }
      db.couples.push(couple)
      commit()
      return couple
    },

    async endCouple(viewerId: Id): Promise<void> {
      const couple = activeCoupleOf(viewerId)
      if (!couple) throw new AccessError('No active couple')
      couple.status = 'ended'
      couple.endedAt = now()
      commit()
    },

    // Check-ins
    async startCheckin(viewerId: Id): Promise<Checkin> {
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
