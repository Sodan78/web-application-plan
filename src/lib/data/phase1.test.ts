import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError, type Repository } from './repository'
import { consentingProfile, pairUp, testRepository } from './test-helpers'

const DAY = 24 * 60 * 60 * 1000

let repo: Repository
let advance: (ms: number) => void
let a: string
let b: string
let c: string

beforeEach(async () => {
  ;({ repo, advance } = testRepository())
  a = await consentingProfile(repo, 'Alex')
  b = await consentingProfile(repo, 'Sam')
  c = await consentingProfile(repo, 'Robin')
})

describe('consent (FR-2)', () => {
  test('AC-1.3 changing a consent keeps the old record and adds a new one', async () => {
    await repo.setConsent(a, 'ai_insights', true)
    await repo.setConsent(a, 'ai_insights', false)
    await repo.setConsent(a, 'ai_insights', true)
    const current = (await repo.getConsents(a)).filter((x) => x.purpose === 'ai_insights')
    expect(current).toHaveLength(1)
    expect(current[0].version).toBe(1)
  })

  test('AC-1.4 a profile never sees another profile’s consents', async () => {
    await repo.setConsent(b, 'therapist_access', true)
    const mine = await repo.getConsents(a)
    expect(mine.every((x) => x.userId === a)).toBe(true)
  })

  test('requesting a pair needs consent to store reflections', async () => {
    const { id: d } = await repo.createProfile('No consent')
    await expect(repo.requestPair(d, a)).rejects.toThrow(AccessError)
  })

  test('withdrawing store consent cancels pending requests', async () => {
    await repo.requestPair(a, b)
    await repo.setConsent(a, 'store_reflections', false)
    expect(await repo.listPairRequests(b)).toEqual([])
  })
})

describe('pair requests (FR-4)', () => {
  test('AC-1.5 cannot request yourself, while paired, or twice', async () => {
    await expect(repo.requestPair(a, a)).rejects.toThrow(AccessError)
    await repo.requestPair(a, b)
    await expect(repo.requestPair(a, c)).rejects.toThrow(AccessError)
    const [req] = await repo.listPairRequests(b)
    await repo.respondToPair(b, req.id, true)
    await expect(repo.requestPair(c, a)).rejects.toThrow(AccessError)
  })

  test('AC-1.6 only the recipient responds, only the sender cancels', async () => {
    await repo.requestPair(a, b)
    const [req] = await repo.listPairRequests(a)
    await expect(repo.respondToPair(a, req.id, true)).rejects.toThrow(AccessError)
    await expect(repo.respondToPair(c, req.id, true)).rejects.toThrow(AccessError)
    await expect(repo.cancelPairRequest(b, req.id)).rejects.toThrow(AccessError)
    await repo.cancelPairRequest(a, req.id)
    expect(await repo.listPairRequests(b)).toEqual([])
  })

  test('AC-1.7 accepting links exactly those two and cancels other requests involving them', async () => {
    await repo.requestPair(a, b)
    await repo.requestPair(c, b)
    const req = (await repo.listPairRequests(b)).find((r) => r.otherId === a)!
    await repo.respondToPair(b, req.id, true)
    expect((await repo.getActiveCouple(a))?.partner.id).toBe(b)
    expect((await repo.getActiveCouple(b))?.partner.id).toBe(a)
    expect(await repo.getActiveCouple(c)).toBeNull()
    expect(await repo.listPairRequests(c)).toEqual([])
  })

  test('AC-1.8 once the sender is in another couple, an old request cannot be accepted', async () => {
    await repo.requestPair(a, b)
    const [old] = await repo.listPairRequests(b)
    await repo.requestPair(c, a)
    const fromC = (await repo.listPairRequests(a)).find((r) => r.direction === 'incoming')!
    await repo.respondToPair(a, fromC.id, true)
    expect(await repo.listPairRequests(b)).toEqual([])
    await expect(repo.respondToPair(b, old.id, true)).rejects.toThrow(AccessError)
    expect(await repo.getActiveCouple(b)).toBeNull()
  })

  test('AC-1.9 requests expire after 7 days', async () => {
    await repo.requestPair(a, b)
    const [req] = await repo.listPairRequests(b)
    advance(7 * DAY)
    expect(await repo.listPairRequests(a)).toEqual([])
    expect(await repo.listPairRequests(b)).toEqual([])
    await expect(repo.respondToPair(b, req.id, true)).rejects.toThrow(AccessError)
  })

  test('AC-1.10 a declined request just disappears for the sender', async () => {
    await repo.requestPair(a, b)
    const [req] = await repo.listPairRequests(b)
    await repo.respondToPair(b, req.id, false)
    expect(await repo.listPairRequests(a)).toEqual([])
    await expect(repo.requestPair(a, c)).resolves.toBeUndefined()
  })

  test('mutual requests: accepting one cancels the other', async () => {
    await repo.requestPair(a, b)
    await repo.requestPair(b, a)
    const incoming = (await repo.listPairRequests(b)).find((r) => r.direction === 'incoming')!
    await repo.respondToPair(b, incoming.id, true)
    expect(await repo.listPairRequests(a)).toEqual([])
    expect(await repo.listPairRequests(b)).toEqual([])
  })

  test('candidates exclude self and people already in a couple', async () => {
    await pairUp(repo, b, c)
    expect(await repo.listPairCandidates(a)).toEqual([])
  })
})
