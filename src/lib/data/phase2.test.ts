// @vitest-environment node
import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError } from './repository'
import { consentingProfile, NEUTRAL_ANSWERS, pairUp, readyProfile, testRepository, type TestContext } from './test-helpers'

const DAY = 24 * 60 * 60 * 1000

let ctx: TestContext
let a: string
let b: string

beforeEach(async () => {
  // testRepository starts at 2026-01-01 (a Thursday), 00:00 UTC.
  ctx = await testRepository()
  a = await readyProfile(ctx, 'Alex')
  b = await readyProfile(ctx, 'Sam')
  await pairUp(ctx, a, b)
})

describe('assessment (FR-5..7)', () => {
  test('AC-2.1 no repository function exposes answers or scores', async () => {
    const results = await Promise.all([
      ctx.repo.hasCompletedAssessment(a),
      ctx.repo.getActiveCouple(a),
      ctx.repo.getCheckinStatus(a, 'UTC'),
      ctx.repo.listCheckins(a),
      ctx.repo.getConsents(a),
      ctx.repo.getMyProfile(a),
    ])
    const json = JSON.stringify(results)
    expect(json).not.toMatch(/answers|scores|avoidance|anxiety/)
    expect(results[0]).toBe(true)
  })

  test('AC-2.2 needs exactly 9 integer answers from 1 to 7', async () => {
    for (const bad of [[], [4, 4], [...NEUTRAL_ANSWERS, 4], [0, 4, 4, 4, 4, 4, 4, 4, 4], [4.5, 4, 4, 4, 4, 4, 4, 4, 4]]) {
      await expect(ctx.repo.saveAssessment(a, bad)).rejects.toThrow(AccessError)
    }
  })

  test('AC-2.2 scoring reverse-scores items 1–4', async () => {
    const score = async (answers: number[]) => {
      await ctx.repo.saveAssessment(a, answers)
      const res = await ctx.db.query<{ avoidance: string; anxiety: string }>(
        'select avoidance, anxiety from assessments where user_id = $1',
        [a],
      )
      return { avoidance: Number(res.rows[0].avoidance), anxiety: Number(res.rows[0].anxiety) }
    }
    // Agreeing fully with "turn to / depend on" items means low avoidance.
    expect(await score([7, 7, 7, 7, 1, 1, 1, 1, 1])).toEqual({ avoidance: 1, anxiety: 1 })
    expect(await score([1, 1, 1, 1, 7, 7, 7, 7, 7])).toEqual({ avoidance: 7, anxiety: 7 })
    expect(await score([4, 4, 4, 4, 4, 4, 1, 4, 7])).toEqual({ avoidance: 4, anxiety: 4 })
  })

  test('AC-2.4 a check-in needs a completed assessment', async () => {
    const c = await consentingProfile(ctx, 'Robin')
    const d = await consentingProfile(ctx, 'Kim')
    await pairUp(ctx, c, d)
    await expect(ctx.repo.startCheckin(c)).rejects.toThrow(AccessError)
    // Nor can they write into a check-in their partner opened.
    await ctx.repo.saveAssessment(d, NEUTRAL_ANSWERS)
    const { id } = await ctx.repo.startCheckin(d)
    await expect(ctx.repo.saveReflection(c, id, 'feeling', 'x')).rejects.toThrow(AccessError)
    await ctx.repo.saveAssessment(c, NEUTRAL_ANSWERS)
    await expect(ctx.repo.startCheckin(c)).resolves.toBeDefined()
  })
})

describe('check-ins (FR-8..13)', () => {
  test('AC-2.5 one open check-in per couple; starting again returns it', async () => {
    const first = await ctx.repo.startCheckin(a)
    const second = await ctx.repo.startCheckin(b)
    expect(second.id).toBe(first.id)
    expect(await ctx.repo.listCheckins(a)).toHaveLength(1)
  })

  test('AC-2.6 one reflection per prompt; save replaces, empty removes', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await ctx.repo.saveReflection(a, id, 'feeling', 'first')
    await ctx.repo.saveReflection(a, id, 'feeling', 'second')
    expect((await ctx.repo.listMyReflections(a, id)).map((r) => r.body)).toEqual(['second'])
    await ctx.repo.saveReflection(a, id, 'feeling', '   ')
    expect(await ctx.repo.listMyReflections(a, id)).toEqual([])
  })

  test('AC-2.7 after finishing, reflections can’t change', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await ctx.repo.saveReflection(a, id, 'feeling', 'text')
    await ctx.repo.finishCheckin(a, id, [])
    await expect(ctx.repo.saveReflection(a, id, 'feeling', 'changed')).rejects.toThrow(AccessError)
    await expect(ctx.repo.finishCheckin(a, id, [])).rejects.toThrow(AccessError)
  })

  test('AC-2.8 finishing needs a reflection, and a bad share saves nothing', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await expect(ctx.repo.finishCheckin(a, id, [])).rejects.toThrow(AccessError)
    await ctx.repo.saveReflection(a, id, 'feeling', 'text')
    await expect(
      ctx.repo.finishCheckin(a, id, [
        { prompt: 'feeling', body: 'ok' },
        { prompt: 'need', body: 'not written' },
      ]),
    ).rejects.toThrow(AccessError)
    expect(await ctx.repo.listShares(a, id)).toEqual([])
    expect((await ctx.repo.getCheckin(a, id)).myStatus).toBe('in_progress')
  })

  test('AC-2.9 only chosen items are shared, with the edited text', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await ctx.repo.saveReflection(a, id, 'feeling', 'private feeling')
    await ctx.repo.saveReflection(a, id, 'need', 'private need')
    await ctx.repo.finishCheckin(a, id, [{ prompt: 'need', body: 'edited need' }])
    expect((await ctx.repo.listShares(a, id)).map((s) => s.body)).toEqual(['edited need'])
  })

  test('AC-2.10 partner’s shares stay hidden until the viewer has finished', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await ctx.repo.saveReflection(a, id, 'need', 'need')
    await ctx.repo.finishCheckin(a, id, [{ prompt: 'need', body: 'shared need' }])
    expect(await ctx.repo.listShares(b, id)).toEqual([])
    expect((await ctx.repo.getCheckin(b, id)).partnerFinished).toBe(true)
    await ctx.repo.saveReflection(b, id, 'feeling', 'x')
    await ctx.repo.finishCheckin(b, id, [])
    expect((await ctx.repo.listShares(b, id)).map((s) => s.body)).toEqual(['shared need'])
    expect((await ctx.repo.getCheckin(a, id)).closedAt).not.toBeNull()
  })

  test('AC-2.12 due on the couple’s weekday if nothing started since', async () => {
    // Thursday 2026-01-01. Default weekday Sunday: last Sunday was 2025-12-28, nothing since → due.
    expect((await ctx.repo.getCheckinStatus(a, 'UTC'))?.due).toBe(true)
    const { id } = await ctx.repo.startCheckin(a)
    expect((await ctx.repo.getCheckinStatus(a, 'UTC'))?.due).toBe(false)
    await ctx.repo.saveReflection(a, id, 'feeling', 'x')
    await ctx.repo.saveReflection(b, id, 'feeling', 'x')
    await ctx.repo.finishCheckin(a, id, [])
    await ctx.repo.finishCheckin(b, id, [])
    ctx.advance(2 * DAY) // Saturday: still covered by this week's check-in
    expect((await ctx.repo.getCheckinStatus(a, 'UTC'))?.due).toBe(false)
    ctx.advance(1 * DAY + 12 * 60 * 60 * 1000) // Sunday midday: new week
    expect((await ctx.repo.getCheckinStatus(a, 'UTC'))?.due).toBe(true)
  })

  test('AC-2.12 either partner can change the weekday', async () => {
    await ctx.repo.setCheckinWeekday(b, 3)
    expect((await ctx.repo.getCheckinStatus(a, 'UTC'))?.weekday).toBe(3)
    const c = await readyProfile(ctx, 'Outsider')
    await expect(ctx.repo.setCheckinWeekday(c, 1)).rejects.toThrow(AccessError)
  })

  test('AC-2.13 open check-ins close after 14 days without sharing drafts', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await ctx.repo.saveReflection(a, id, 'feeling', 'draft')
    ctx.advance(14 * DAY)
    expect((await ctx.repo.getCheckin(a, id)).closedAt).not.toBeNull()
    expect(await ctx.repo.listShares(b, id)).toEqual([])
    await expect(ctx.repo.saveReflection(a, id, 'feeling', 'late')).rejects.toThrow(AccessError)
    expect((await ctx.repo.startCheckin(a)).id).not.toBe(id)
  })

  test('a check-in can’t be finished after the couple ends', async () => {
    const { id } = await ctx.repo.startCheckin(a)
    await ctx.repo.saveReflection(a, id, 'feeling', 'text')
    await ctx.repo.endCouple(b)
    await expect(ctx.repo.finishCheckin(a, id, [])).rejects.toThrow(AccessError)
    expect((await ctx.repo.getCheckin(a, id)).coupleActive).toBe(false)
    expect(await ctx.repo.listMyReflections(a, id)).toHaveLength(1)
  })
})
