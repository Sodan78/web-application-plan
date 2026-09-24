import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError, createRepository, type Repository } from './repository'
import { memoryStorage } from './storage'

let repo: Repository
let a: string
let b: string
let checkinId: string

beforeEach(async () => {
  repo = createRepository(memoryStorage())
  a = (await repo.createProfile('Alex')).id
  b = (await repo.createProfile('Sam')).id
  await repo.pair(a, b)
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
    const c = (await repo.createProfile('Outsider')).id
    await expect(repo.listShares(c, checkinId)).rejects.toThrow(AccessError)
  })

  test('a person can be in only one active couple', async () => {
    const c = (await repo.createProfile('Third')).id
    await expect(repo.pair(c, a)).rejects.toThrow(AccessError)
  })

  test('after separation, shares are visible only to their author', async () => {
    const r = await repo.saveReflection(a, checkinId, 'action', 'text')
    await repo.share(a, r.id, 'text')
    await repo.endCouple(b)
    expect(await repo.listShares(b, checkinId)).toEqual([])
    expect(await repo.listShares(a, checkinId)).toHaveLength(1)
  })
})
