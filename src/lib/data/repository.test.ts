import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError, type Repository } from './repository'
import { pairUp, readyProfile, testRepository } from './test-helpers'

let repo: Repository
let a: string
let b: string
let checkinId: string

beforeEach(async () => {
  repo = testRepository().repo
  a = await readyProfile(repo, 'Alex')
  b = await readyProfile(repo, 'Sam')
  await pairUp(repo, a, b)
  checkinId = (await repo.startCheckin(a)).id
})

const finishBoth = async (aShares: { prompt: 'need'; body: string }[] = []) => {
  await repo.saveReflection(b, checkinId, 'feeling', 'b private')
  await repo.finishCheckin(a, checkinId, aShares)
  await repo.finishCheckin(b, checkinId, [])
}

describe('reflections are private (P1)', () => {
  test('partner never sees the other partner’s reflections', async () => {
    await repo.saveReflection(a, checkinId, 'feeling', 'private text')
    expect(await repo.listMyReflections(b, checkinId)).toEqual([])
    expect(await repo.listMyReflections(a, checkinId)).toHaveLength(1)
  })

  test('writing requires consent to store reflections', async () => {
    await repo.setConsent(a, 'store_reflections', false)
    await expect(repo.saveReflection(a, checkinId, 'feeling', 'x')).rejects.toThrow(AccessError)
    await expect(repo.startCheckin(a)).rejects.toThrow(AccessError)
  })
})

describe('sharing (FR-10..12)', () => {
  test('shared copy is visible to partner, original stays private', async () => {
    await repo.saveReflection(a, checkinId, 'need', 'full private text')
    await finishBoth([{ prompt: 'need', body: 'edited version' }])
    const seen = await repo.listShares(b, checkinId)
    expect(seen.map((s) => s.body)).toEqual(['edited version'])
    expect(JSON.stringify(seen)).not.toContain('full private text')
  })

  test('withdrawn share disappears for partner but stays visible to author', async () => {
    await repo.saveReflection(a, checkinId, 'need', 'text')
    await finishBoth([{ prompt: 'need', body: 'text' }])
    const [s] = await repo.listShares(a, checkinId)
    await repo.withdrawShare(a, s.id)
    expect(await repo.listShares(b, checkinId)).toEqual([])
    expect((await repo.listShares(a, checkinId))[0].withdrawnAt).not.toBeNull()
  })

  test('only the author can withdraw', async () => {
    await repo.saveReflection(a, checkinId, 'need', 'text')
    await finishBoth([{ prompt: 'need', body: 'text' }])
    const [s] = await repo.listShares(a, checkinId)
    await expect(repo.withdrawShare(b, s.id)).rejects.toThrow(AccessError)
  })
})

describe('couples (FR-4, FR-25)', () => {
  test('outsider cannot read a couple’s check-in', async () => {
    const c = await readyProfile(repo, 'Outsider')
    await expect(repo.listShares(c, checkinId)).rejects.toThrow(AccessError)
    await expect(repo.getCheckin(c, checkinId)).rejects.toThrow(AccessError)
  })

  test('AC-1.11 either member can end the couple alone', async () => {
    await repo.endCouple(b)
    expect(await repo.getActiveCouple(a)).toBeNull()
    expect(await repo.getActiveCouple(b)).toBeNull()
  })

  test('AC-1.12 after ending, shares are visible only to their author and both can pair again', async () => {
    await repo.saveReflection(a, checkinId, 'need', 'text')
    await finishBoth([{ prompt: 'need', body: 'text' }])
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
