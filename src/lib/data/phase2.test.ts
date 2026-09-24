import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError, type Repository } from './repository'
import { scoreEcrRs } from './scoring'
import { consentingProfile, NEUTRAL_ANSWERS, pairUp, readyProfile, testRepository } from './test-helpers'

const DAY = 24 * 60 * 60 * 1000

let repo: Repository
let advance: (ms: number) => void
let a: string
let b: string

beforeEach(async () => {
  // testRepository starts at 2026-01-01 (a Thursday), 00:00 UTC.
  ;({ repo, advance } = testRepository())
  a = await readyProfile(repo, 'Alex')
  b = await readyProfile(repo, 'Sam')
  await pairUp(repo, a, b)
})

describe('assessment (FR-5..7)', () => {
  test('AC-2.1 no repository function exposes answers or scores', async () => {
    const results = await Promise.all([
      repo.hasCompletedAssessment(a),
      repo.getActiveCouple(a),
      repo.getCheckinStatus(a),
      repo.listCheckins(a),
      repo.getConsents(a),
      repo.listProfiles(),
    ])
    const json = JSON.stringify(results)
    expect(json).not.toMatch(/answers|scores|avoidance|anxiety/)
    expect(results[0]).toBe(true)
  })

  test('AC-2.2 needs exactly 9 integer answers from 1 to 7', async () => {
    for (const bad of [[], [4, 4], [...NEUTRAL_ANSWERS, 4], [0, 4, 4, 4, 4, 4, 4, 4, 4], [4.5, 4, 4, 4, 4, 4, 4, 4, 4]]) {
      await expect(repo.saveAssessment(a, bad)).rejects.toThrow(AccessError)
    }
  })

  test('AC-2.2 scoring reverse-scores items 1–4', () => {
    // Agreeing fully with "turn to / depend on" items means low avoidance.
    expect(scoreEcrRs([7, 7, 7, 7, 1, 1, 1, 1, 1])).toEqual({ avoidance: 1, anxiety: 1 })
    expect(scoreEcrRs([1, 1, 1, 1, 7, 7, 7, 7, 7])).toEqual({ avoidance: 7, anxiety: 7 })
    expect(scoreEcrRs([4, 4, 4, 4, 4, 4, 1, 4, 7])).toEqual({ avoidance: 4, anxiety: 4 })
  })

  test('AC-2.4 a check-in needs a completed assessment', async () => {
    const c = await consentingProfile(repo, 'Robin')
    const d = await consentingProfile(repo, 'Kim')
    await pairUp(repo, c, d)
    await expect(repo.startCheckin(c)).rejects.toThrow(AccessError)
    // Nor can they write into a check-in their partner opened.
    await repo.saveAssessment(d, NEUTRAL_ANSWERS)
    const { id } = await repo.startCheckin(d)
    await expect(repo.saveReflection(c, id, 'feeling', 'x')).rejects.toThrow(AccessError)
    await repo.saveAssessment(c, NEUTRAL_ANSWERS)
    await expect(repo.startCheckin(c)).resolves.toBeDefined()
  })
})

describe('check-ins (FR-8..13)', () => {
  test('AC-2.5 one open check-in per couple; starting again returns it', async () => {
    const first = await repo.startCheckin(a)
    const second = await repo.startCheckin(b)
    expect(second.id).toBe(first.id)
    expect(await repo.listCheckins(a)).toHaveLength(1)
  })

  test('AC-2.6 one reflection per prompt; save replaces, empty removes', async () => {
    const { id } = await repo.startCheckin(a)
    await repo.saveReflection(a, id, 'feeling', 'first')
    await repo.saveReflection(a, id, 'feeling', 'second')
    expect((await repo.listMyReflections(a, id)).map((r) => r.body)).toEqual(['second'])
    await repo.saveReflection(a, id, 'feeling', '   ')
    expect(await repo.listMyReflections(a, id)).toEqual([])
  })

  test('AC-2.7 after finishing, reflections can’t change', async () => {
    const { id } = await repo.startCheckin(a)
    await repo.saveReflection(a, id, 'feeling', 'text')
    await repo.finishCheckin(a, id, [])
    await expect(repo.saveReflection(a, id, 'feeling', 'changed')).rejects.toThrow(AccessError)
    await expect(repo.finishCheckin(a, id, [])).rejects.toThrow(AccessError)
  })

  test('AC-2.8 finishing needs a reflection, and a bad share saves nothing', async () => {
    const { id } = await repo.startCheckin(a)
    await expect(repo.finishCheckin(a, id, [])).rejects.toThrow(AccessError)
    await repo.saveReflection(a, id, 'feeling', 'text')
    await expect(
      repo.finishCheckin(a, id, [
        { prompt: 'feeling', body: 'ok' },
        { prompt: 'need', body: 'not written' },
      ]),
    ).rejects.toThrow(AccessError)
    expect(await repo.listShares(a, id)).toEqual([])
    expect((await repo.getCheckin(a, id)).myStatus).toBe('in_progress')
  })

  test('AC-2.9 only chosen items are shared, with the edited text', async () => {
    const { id } = await repo.startCheckin(a)
    await repo.saveReflection(a, id, 'feeling', 'private feeling')
    await repo.saveReflection(a, id, 'need', 'private need')
    await repo.finishCheckin(a, id, [{ prompt: 'need', body: 'edited need' }])
    expect((await repo.listShares(a, id)).map((s) => s.body)).toEqual(['edited need'])
  })

  test('AC-2.10 partner’s shares stay hidden until the viewer has finished', async () => {
    const { id } = await repo.startCheckin(a)
    await repo.saveReflection(a, id, 'need', 'need')
    await repo.finishCheckin(a, id, [{ prompt: 'need', body: 'shared need' }])
    expect(await repo.listShares(b, id)).toEqual([])
    expect((await repo.getCheckin(b, id)).partnerFinished).toBe(true)
    await repo.saveReflection(b, id, 'feeling', 'x')
    await repo.finishCheckin(b, id, [])
    expect((await repo.listShares(b, id)).map((s) => s.body)).toEqual(['shared need'])
    expect((await repo.getCheckin(a, id)).closedAt).not.toBeNull()
  })

  test('AC-2.12 due on the couple’s weekday if nothing started since', async () => {
    // Thursday 2026-01-01. Default weekday Sunday: last Sunday was 2025-12-28, nothing since → due.
    expect((await repo.getCheckinStatus(a))?.due).toBe(true)
    const { id } = await repo.startCheckin(a)
    expect((await repo.getCheckinStatus(a))?.due).toBe(false)
    await repo.saveReflection(a, id, 'feeling', 'x')
    await repo.saveReflection(b, id, 'feeling', 'x')
    await repo.finishCheckin(a, id, [])
    await repo.finishCheckin(b, id, [])
    advance(2 * DAY) // Saturday: still covered by this week's check-in
    expect((await repo.getCheckinStatus(a))?.due).toBe(false)
    advance(1 * DAY + 12 * 60 * 60 * 1000) // Sunday midday: new week
    expect((await repo.getCheckinStatus(a))?.due).toBe(true)
  })

  test('AC-2.12 either partner can change the weekday', async () => {
    await repo.setCheckinWeekday(b, 3)
    expect((await repo.getCheckinStatus(a))?.weekday).toBe(3)
    const c = await readyProfile(repo, 'Outsider')
    await expect(repo.setCheckinWeekday(c, 1)).rejects.toThrow(AccessError)
  })

  test('AC-2.13 open check-ins close after 14 days without sharing drafts', async () => {
    const { id } = await repo.startCheckin(a)
    await repo.saveReflection(a, id, 'feeling', 'draft')
    advance(14 * DAY)
    expect((await repo.getCheckin(a, id)).closedAt).not.toBeNull()
    expect(await repo.listShares(b, id)).toEqual([])
    await expect(repo.saveReflection(a, id, 'feeling', 'late')).rejects.toThrow(AccessError)
    expect((await repo.startCheckin(a)).id).not.toBe(id)
  })

  test('a check-in can’t be finished after the couple ends', async () => {
    const { id } = await repo.startCheckin(a)
    await repo.saveReflection(a, id, 'feeling', 'text')
    await repo.endCouple(b)
    await expect(repo.finishCheckin(a, id, [])).rejects.toThrow(AccessError)
    expect((await repo.getCheckin(a, id)).coupleActive).toBe(false)
    expect(await repo.listMyReflections(a, id)).toHaveLength(1)
  })
})
