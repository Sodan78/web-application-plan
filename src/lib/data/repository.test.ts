// @vitest-environment node
import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError } from './repository'
import { pairUp, readyProfile, testRepository, type TestContext } from './test-helpers'

let ctx: TestContext
let a: string
let b: string
let checkinId: string

beforeEach(async () => {
  ctx = await testRepository()
  a = await readyProfile(ctx, 'Alex')
  b = await readyProfile(ctx, 'Sam')
  await pairUp(ctx, a, b)
  checkinId = (await ctx.repo.startCheckin(a)).id
})

const finishBoth = async (aShares: { prompt: 'need'; body: string }[] = []) => {
  await ctx.repo.saveReflection(b, checkinId, 'feeling', 'b private')
  await ctx.repo.finishCheckin(a, checkinId, aShares)
  await ctx.repo.finishCheckin(b, checkinId, [])
}

describe('reflections are private (P1)', () => {
  test('partner never sees the other partner’s reflections', async () => {
    await ctx.repo.saveReflection(a, checkinId, 'feeling', 'private text')
    expect(await ctx.repo.listMyReflections(b, checkinId)).toEqual([])
    expect(await ctx.repo.listMyReflections(a, checkinId)).toHaveLength(1)
  })

  test('writing requires consent to store reflections', async () => {
    await ctx.repo.setConsent(a, 'store_reflections', false)
    await expect(ctx.repo.saveReflection(a, checkinId, 'feeling', 'x')).rejects.toThrow(AccessError)
    await expect(ctx.repo.startCheckin(a)).rejects.toThrow(AccessError)
  })
})

describe('sharing (FR-10..12)', () => {
  test('shared copy is visible to partner, original stays private', async () => {
    await ctx.repo.saveReflection(a, checkinId, 'need', 'full private text')
    await finishBoth([{ prompt: 'need', body: 'edited version' }])
    const seen = await ctx.repo.listShares(b, checkinId)
    expect(seen.map((s) => s.body)).toEqual(['edited version'])
    expect(JSON.stringify(seen)).not.toContain('full private text')
  })

  test('withdrawn share disappears for partner but stays visible to author', async () => {
    await ctx.repo.saveReflection(a, checkinId, 'need', 'text')
    await finishBoth([{ prompt: 'need', body: 'text' }])
    const [s] = await ctx.repo.listShares(a, checkinId)
    await ctx.repo.withdrawShare(a, s.id)
    expect(await ctx.repo.listShares(b, checkinId)).toEqual([])
    expect((await ctx.repo.listShares(a, checkinId))[0].withdrawnAt).not.toBeNull()
  })

  test('only the author can withdraw', async () => {
    await ctx.repo.saveReflection(a, checkinId, 'need', 'text')
    await finishBoth([{ prompt: 'need', body: 'text' }])
    const [s] = await ctx.repo.listShares(a, checkinId)
    await expect(ctx.repo.withdrawShare(b, s.id)).rejects.toThrow(AccessError)
  })
})

describe('couples (FR-4, FR-25)', () => {
  test('outsider cannot read a couple’s check-in', async () => {
    const c = await readyProfile(ctx, 'Outsider')
    await expect(ctx.repo.listShares(c, checkinId)).rejects.toThrow(AccessError)
    await expect(ctx.repo.getCheckin(c, checkinId)).rejects.toThrow(AccessError)
    expect(await ctx.repo.listMyReflections(c, checkinId)).toEqual([])
  })

  test('AC-1.11 either member can end the couple alone', async () => {
    await ctx.repo.endCouple(b)
    expect(await ctx.repo.getActiveCouple(a)).toBeNull()
    expect(await ctx.repo.getActiveCouple(b)).toBeNull()
  })

  test('AC-1.12 after ending, shares are visible only to their author and both can pair again', async () => {
    await ctx.repo.saveReflection(a, checkinId, 'need', 'text')
    await finishBoth([{ prompt: 'need', body: 'text' }])
    await ctx.repo.endCouple(b)
    expect(await ctx.repo.listShares(b, checkinId)).toEqual([])
    expect(await ctx.repo.listShares(a, checkinId)).toHaveLength(1)
    await expect(ctx.repo.requestPair(a, ctx.emailOf(b))).resolves.toBeUndefined()
  })

  test('AC-1.13 only the other partner gets the end notice, once', async () => {
    await ctx.repo.endCouple(a)
    expect(await ctx.repo.hasUnseenEndNotice(a)).toBe(false)
    expect(await ctx.repo.hasUnseenEndNotice(b)).toBe(true)
    await ctx.repo.dismissEndNotice(b)
    expect(await ctx.repo.hasUnseenEndNotice(b)).toBe(false)
  })

  test('AC-1.13 nothing tells the other partner who ended it', async () => {
    await ctx.repo.endCouple(a)
    const seen = JSON.stringify([
      await ctx.repo.getActiveCouple(b),
      await ctx.repo.listPairRequests(b),
      await ctx.repo.listCheckins(b),
    ])
    expect(seen).not.toContain(a)
  })
})
