// @vitest-environment node
import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError } from './repository'
import { consentingProfile, pairUp, testRepository, type TestContext } from './test-helpers'

const DAY = 24 * 60 * 60 * 1000

let ctx: TestContext
let a: string
let b: string
let c: string

beforeEach(async () => {
  ctx = await testRepository()
  a = await consentingProfile(ctx, 'Alex')
  b = await consentingProfile(ctx, 'Sam')
  c = await consentingProfile(ctx, 'Robin')
})

describe('consent (FR-2)', () => {
  test('AC-1.3 changing a consent keeps the old record and adds a new one', async () => {
    await ctx.repo.setConsent(a, 'ai_insights', true)
    await ctx.repo.setConsent(a, 'ai_insights', false)
    await ctx.repo.setConsent(a, 'ai_insights', true)
    const current = (await ctx.repo.getConsents(a)).filter((x) => x.purpose === 'ai_insights')
    expect(current).toHaveLength(1)
    const all = await ctx.db.query(`select withdrawn_at from consents where user_id = $1 and purpose = 'ai_insights'`, [a])
    expect(all.rows).toHaveLength(2)
  })

  test('AC-1.4 a profile never sees another profile’s consents', async () => {
    await ctx.repo.setConsent(b, 'therapist_access', true)
    const mine = await ctx.repo.getConsents(a)
    expect(mine.every((x) => x.userId === a)).toBe(true)
  })

  test('requesting a pair needs consent to store reflections', async () => {
    const d = await ctx.createUser('NoConsent')
    await expect(ctx.repo.requestPair(d, ctx.emailOf(a))).rejects.toThrow(AccessError)
  })

  test('withdrawing store consent cancels pending requests', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    await ctx.repo.setConsent(a, 'store_reflections', false)
    expect(await ctx.repo.listPairRequests(b)).toEqual([])
  })
})

describe('pair requests (FR-3, FR-4)', () => {
  test('AC-1.5 cannot request yourself, while paired, or twice', async () => {
    await expect(ctx.repo.requestPair(a, ctx.emailOf(a).toUpperCase())).rejects.toThrow(AccessError)
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    await expect(ctx.repo.requestPair(a, ctx.emailOf(c))).rejects.toThrow(AccessError)
    const [req] = await ctx.repo.listPairRequests(b)
    await ctx.repo.respondToPair(b, req.id, true)
    await expect(ctx.repo.requestPair(a, ctx.emailOf(c))).rejects.toThrow(AccessError)
  })

  test('AC-1.6 only the recipient responds, only the sender cancels', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    const [req] = await ctx.repo.listPairRequests(a)
    await expect(ctx.repo.respondToPair(a, req.id, true)).rejects.toThrow(AccessError)
    await expect(ctx.repo.respondToPair(c, req.id, true)).rejects.toThrow(AccessError)
    await expect(ctx.repo.cancelPairRequest(b, req.id)).rejects.toThrow(AccessError)
    await ctx.repo.cancelPairRequest(a, req.id)
    expect(await ctx.repo.listPairRequests(b)).toEqual([])
  })

  test('AC-1.7 accepting links exactly those two and cancels other requests involving them', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    await ctx.repo.requestPair(c, ctx.emailOf(b))
    const req = (await ctx.repo.listPairRequests(b)).find((r) => r.otherName === 'Alex')!
    await ctx.repo.respondToPair(b, req.id, true)
    expect((await ctx.repo.getActiveCouple(a))?.partner.id).toBe(b)
    expect((await ctx.repo.getActiveCouple(b))?.partner.id).toBe(a)
    expect(await ctx.repo.getActiveCouple(c)).toBeNull()
    expect(await ctx.repo.listPairRequests(c)).toEqual([])
  })

  test('AC-1.8 once the sender is in another couple, an old request cannot be accepted', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    const [old] = await ctx.repo.listPairRequests(b)
    await ctx.repo.requestPair(c, ctx.emailOf(a))
    const fromC = (await ctx.repo.listPairRequests(a)).find((r) => r.direction === 'incoming')!
    await ctx.repo.respondToPair(a, fromC.id, true)
    expect(await ctx.repo.listPairRequests(b)).toEqual([])
    await expect(ctx.repo.respondToPair(b, old.id, true)).rejects.toThrow(AccessError)
    expect(await ctx.repo.getActiveCouple(b)).toBeNull()
  })

  test('AC-1.9 requests expire after 7 days', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    const [req] = await ctx.repo.listPairRequests(b)
    ctx.advance(7 * DAY)
    expect(await ctx.repo.listPairRequests(a)).toEqual([])
    expect(await ctx.repo.listPairRequests(b)).toEqual([])
    await expect(ctx.repo.respondToPair(b, req.id, true)).rejects.toThrow(AccessError)
  })

  test('AC-1.10 a declined request just disappears for the sender', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    const [req] = await ctx.repo.listPairRequests(b)
    await ctx.repo.respondToPair(b, req.id, false)
    expect(await ctx.repo.listPairRequests(a)).toEqual([])
    await expect(ctx.repo.requestPair(a, ctx.emailOf(c))).resolves.toBeUndefined()
  })

  test('mutual requests: accepting one cancels the other', async () => {
    await ctx.repo.requestPair(a, ctx.emailOf(b))
    await ctx.repo.requestPair(b, ctx.emailOf(a))
    const incoming = (await ctx.repo.listPairRequests(b)).find((r) => r.direction === 'incoming')!
    await ctx.repo.respondToPair(b, incoming.id, true)
    expect(await ctx.repo.listPairRequests(a)).toEqual([])
    expect(await ctx.repo.listPairRequests(b)).toEqual([])
  })

  test('AC-3.4 a request to an email reaches whoever signs up with it later', async () => {
    await ctx.repo.requestPair(a, 'Newcomer@Example.test')
    expect((await ctx.repo.listPairRequests(a))[0].otherName).toBe('newcomer@example.test')
    const n = await consentingProfile(ctx, 'Newcomer')
    const [req] = await ctx.repo.listPairRequests(n)
    expect(req).toMatchObject({ direction: 'incoming', otherName: 'Alex' })
  })

  test('AC-3.4 sending a request never reveals whether the email has an account or a partner', async () => {
    await pairUp(ctx, b, c)
    await expect(ctx.repo.requestPair(a, ctx.emailOf(b))).resolves.toBeUndefined()
    const other = await consentingProfile(ctx, 'Other')
    await expect(ctx.repo.requestPair(other, 'nobody@example.test')).resolves.toBeUndefined()
  })
})
