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

describe('AC-4.5 private notes', () => {
  test('only the author can read them', async () => {
    await ctx.repo.savePrivateNote(a, checkinId, 'feeling-familiar', 'It feels like being eight again.')
    expect((await ctx.repo.listPrivateNotes(a, checkinId)).map((n) => n.body)).toEqual([
      'It feels like being eight again.',
    ])
    expect(await ctx.repo.listPrivateNotes(b, checkinId)).toEqual([])
    const partnerView = JSON.stringify([
      await ctx.repo.listShares(b, checkinId),
      await ctx.repo.listMyReflections(b, checkinId),
      await ctx.repo.getCheckin(b, checkinId),
    ])
    expect(partnerView).not.toContain('being eight')
  })

  test('saving again replaces the note, empty removes it', async () => {
    await ctx.repo.savePrivateNote(a, checkinId, 'q', 'first')
    await ctx.repo.savePrivateNote(a, checkinId, 'q', 'second')
    expect((await ctx.repo.listPrivateNotes(a, checkinId)).map((n) => n.body)).toEqual(['second'])
    await ctx.repo.savePrivateNote(a, checkinId, 'q', '  ')
    expect(await ctx.repo.listPrivateNotes(a, checkinId)).toEqual([])
  })

  test('outsiders cannot write into a couple’s check-in', async () => {
    const c = await readyProfile(ctx, 'Outsider')
    await expect(ctx.repo.savePrivateNote(c, checkinId, 'q', 'x')).rejects.toThrow(AccessError)
  })

  test('needs store consent', async () => {
    await ctx.repo.setConsent(a, 'store_reflections', false)
    await expect(ctx.repo.savePrivateNote(a, checkinId, 'q', 'x')).rejects.toThrow(AccessError)
  })

  test('notes stay with their author after the couple ends', async () => {
    await ctx.repo.savePrivateNote(a, checkinId, 'q', 'mine')
    await ctx.repo.endCouple(b)
    expect(await ctx.repo.listPrivateNotes(a, checkinId)).toHaveLength(1)
    await ctx.repo.savePrivateNote(a, checkinId, 'q', 'still mine')
    expect(await ctx.repo.listPrivateNotes(b, checkinId)).toEqual([])
  })
})
