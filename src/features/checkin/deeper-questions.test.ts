import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { PromptKey } from '@/lib/data'
import { ALL_QUESTION_TEXTS, MAX_QUESTIONS, pickDeeperQuestions } from './deeper-questions'

const fixture = JSON.parse(readFileSync(join(import.meta.dirname, '../../../evals/test-couples.json'), 'utf8')) as {
  couples: { checkins: Record<string, Partial<Record<PromptKey, { text: string }>>>[] }[]
}
const asReflections = (entries: Partial<Record<PromptKey, { text: string }>>) =>
  (Object.entries(entries) as [PromptKey, { text: string }][]).map(([prompt, e]) => ({ prompt, body: e.text }))

describe('AC-4.6 deeper questions', () => {
  test('picks themes from the person’s own words', () => {
    const maja = asReflections(fixture.couples[0].checkins[1].Maja)
    // "The old knot… like being a kid waiting for dad": one theme, then base questions in prompt order.
    expect(pickDeeperQuestions(maja).map((q) => q.key)).toEqual(['past', 'base-situation', 'base-feeling'])
    const erik = asReflections(fixture.couples[0].checkins[1].Erik)
    expect(pickDeeperQuestions(erik).map((q) => q.key)).toEqual(['shame', 'overwhelm', 'always-never'])
    const sara = asReflections(fixture.couples[1].checkins[0].Sara)
    expect(pickDeeperQuestions(sara).map((q) => q.key)).toContain('freeze')
  })

  test('falls back to base questions for answered prompts', () => {
    expect(pickDeeperQuestions([{ prompt: 'need', body: 'Some quiet time.' }]).map((q) => q.key)).toEqual(['base-need'])
    expect(pickDeeperQuestions([])).toEqual([])
  })

  test('is deterministic and capped at 3', () => {
    for (const couple of fixture.couples) {
      for (const round of couple.checkins) {
        for (const entries of Object.values(round)) {
          const r = asReflections(entries)
          expect(pickDeeperQuestions(r)).toEqual(pickDeeperQuestions(r))
          expect(pickDeeperQuestions(r).length).toBeLessThanOrEqual(MAX_QUESTIONS)
        }
      }
    }
  })

  test('no question uses a style label or clinical word', () => {
    const banned = /anxious|avoidant|attachment|secure type|disorganis|trauma|diagnos|disorder|codependen|wound/i
    for (const text of ALL_QUESTION_TEXTS) expect(text).not.toMatch(banned)
  })
})
