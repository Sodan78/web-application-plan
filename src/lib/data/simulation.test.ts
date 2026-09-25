// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import type { PromptKey } from './types'
import { consentingProfile, pairUp, testRepository } from './test-helpers'

type Entry = { text: string; shared?: string }
type Fixture = {
  couples: {
    id: string
    partners: Record<string, { assessment: number[] }>
    checkins: Record<string, Partial<Record<PromptKey, Entry>>>[]
  }[]
}

const fixture: Fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../../evals/test-couples.json'), 'utf8'),
)

// Start Postgres once, in a hook: it can take longer than a single test's time limit.
beforeAll(async () => {
  await testRepository()
})

/** Runs each fictional couple through the real flow and checks what each partner can see (P1, FR-10..13). */
describe.each(fixture.couples)('simulated couple $id', (couple) => {
  test('each partner sees only what the other chose to share', async () => {
    const ctx = await testRepository()
    const [nameA, nameB] = Object.keys(couple.partners)
    const ids: Record<string, string> = {}
    for (const name of [nameA, nameB]) {
      ids[name] = await consentingProfile(ctx, name)
      await ctx.repo.saveAssessment(ids[name], couple.partners[name].assessment)
    }
    await pairUp(ctx, ids[nameA], ids[nameB])

    for (const round of couple.checkins) {
      const { id: checkinId } = await ctx.repo.startCheckin(ids[nameA])
      for (const [name, entries] of Object.entries(round)) {
        for (const [prompt, entry] of Object.entries(entries) as [PromptKey, Entry][]) {
          await ctx.repo.saveReflection(ids[name], checkinId, prompt, entry.text)
        }
      }
      for (const [name, entries] of Object.entries(round)) {
        const shares = (Object.entries(entries) as [PromptKey, Entry][])
          .filter(([, e]) => e.shared)
          .map(([prompt, e]) => ({ prompt, body: e.shared as string }))
        await ctx.repo.finishCheckin(ids[name], checkinId, shares)
      }

      for (const [viewer, other] of [
        [nameA, nameB],
        [nameB, nameA],
      ]) {
        const visible = (await ctx.repo.listShares(ids[viewer], checkinId)).filter((s) => s.authorId === ids[other])
        const expected = Object.values(round[other] ?? {})
          .map((e) => e?.shared)
          .filter(Boolean)
        expect(visible.map((s) => s.body).sort()).toEqual([...expected].sort())
        const privateOnly = Object.values(round[other] ?? {})
          .filter((e) => e && e.shared !== e.text)
          .map((e) => e!.text)
        const seen = JSON.stringify([visible, await ctx.repo.listMyReflections(ids[viewer], checkinId)])
        for (const text of privateOnly) expect(seen).not.toContain(text)
      }
    }
  })
})
