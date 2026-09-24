import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError, type Repository } from './repository'
import { consentingProfile, pairUp, testRepository } from './test-helpers'

let repo: Repository
let a: string
let b: string
let checkinId: string

beforeEach(async () => {
  repo = testRepository().repo
  a = await consentingProfile(repo, 'Alex')
  b = await consentingProfile(repo, 'Sam')
  await pairUp(repo, a, b)
  checkinId = (await repo.startCheckin(a)).id
})

describe('reflections are private (P1)', () => {
  test('partner never sees the other partner’s reflections', async () => {
    await repo.saveReflection(a, checkinId, 'feeling', 'private text')
    expect(await repo.listMyReflections(b, checkinId)).toEqual([])
    expect(await repo.listMyReflections(a, checkinId)).toHaveLength(1)
  })

  test('partner cannot share someone else’s reflection', async () => {
    const r = await repo.saveReflection(a, checkinId, 'feeling', 'private text')
    await expect(repo.share(b, r.id, 'x')).rejects.toThrow(AccessError)
  })

  test('writing requires consent to store reflections', async () => {
    await repo.setConsent(a, 'store_reflections', false)
    await expect(repo.saveReflection(a, checkinId, 'feeling', 'x')).rejects.toThrow(AccessError)
    await expect(repo.startCheckin(a)).rejects.toThrow(AccessError)
  })
})

describe('sharing (FR-10..12)', () => {
  test('shared copy is visible to partner, original stays private', async () => {
    const r = await repo.saveReflection(a, checkinId, 'need', 'full private text')
    await repo.share(a, r.id, 'edited version')
    const seen = await repo.listShares(b, checkinId)
    expect(seen.map((s) => s.body)).toEqual(['edited version'])
  })

  test('withdrawn share disappears for partner', async () => {
    const r = await repo.saveReflection(a, checkinId, 'need', 'text')
    const s = await repo.share(a, r.id, 'text')
    await repo.withdrawShare(a, s.id)
    expect(await repo.listShares(b, checkinId)).toEqual([])
  })

  test('only the author can withdraw', async () => {
    const r = await repo.saveReflection(a, checkinId, 'need', 'text')
    const s = await repo.share(a, r.id, 'text')
    await expect(repo.withdrawShare(b, s.id)).rejects.toThrow(AccessError)
  })
})

describe('couples (FR-4, FR-25)', () => {
  test('outsider cannot read a couple’s check-in', async () => {
    const c = await consentingProfile(repo, 'Outsider')
    await expect(repo.listShares(c, checkinId)).rejects.toThrow(AccessError)
  })

  test('AC-1.11 either member can end the couple alone', async () => {
    await repo.endCouple(b)
    expect(await repo.getActiveCouple(a)).toBeNull()
    expect(await repo.getActiveCouple(b)).toBeNull()
  })

  test('AC-1.12 after ending, shares are visible only to their author and both can pair again', async () => {
    const r = await repo.saveReflection(a, checkinId, 'action', 'text')
    await repo.share(a, r.id, 'text')
    await repo.endCouple(b)
    expect(await repo.listShares(b, checkinId)).toEqual([])
    expect(await repo.listShares(a, checkinId)).toHaveLength(1)
    await expect(repo.requestPair(a, b)).resolves.toBeUndefined()
  })

  test('AC-1.13 only the other partner gets the end notice, once', async () => {
    await repo.endCouple(a)
    expect(await repo.hasUnseenEndNotice(a)).toBe(false)
    expect(await repo.hasUnseenEndNotice(b)).toBe(true)
    await repo.dismissEndNotice(b)
    expect(await repo.hasUnseenEndNotice(b)).toBe(false)
  })

  test('AC-1.13 the ended couple exposes no one who ended it', async () => {
    await repo.endCouple(a)
    expect(await repo.getActiveCouple(b)).toBeNull()
    expect(JSON.stringify(await repo.listPairRequests(b))).not.toContain(a)
  })
})
