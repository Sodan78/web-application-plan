import type { PromptKey } from '@/lib/data'

export type DeeperQuestion = { key: string; text: string }

type Rule = { key: string; pattern: RegExp; text: string }

/**
 * Themes found in the person's own words (FR-40). Checked in this order; each can fire once.
 * Questions invite reflection; they never interpret or label (FR-42).
 */
const THEME_RULES: Rule[] = [
  {
    key: 'past',
    pattern: /\b(again|as a (kid|child)|when i was (little|young|small)|growing up|familiar|old (knot|feeling)|dad|mum|mom|mother|father|parents?)\b/i,
    text: 'You mentioned something from before. When this feeling shows up, how old does it feel? What did that younger you need?',
  },
  {
    key: 'shame',
    pattern: /\b(ashamed|shame|fail(ed|ure)?|stupid|can'?t do anything right|my fault|wrong)\b/i,
    text: 'When it feels like you got it wrong, what do you tell yourself? Would you say the same to a good friend?',
  },
  {
    key: 'fear-of-losing',
    pattern: /\b(scared|afraid|panic(ky)?|abandon(ed)?|leave me|alone|lonely|punish(ing)?)\b/i,
    text: 'What are you most afraid might happen? What helps you feel steady when that fear shows up?',
  },
  {
    key: 'overwhelm',
    pattern: /\b(overwhelm(ed|ing)?|trapped|too much|space|flooded|shut down)\b/i,
    text: 'What helps you come back after you’ve needed space? How could you let your partner know you’ll return?',
  },
  {
    key: 'freeze',
    pattern: /\b(froze|freeze|frozen|numb|made a joke|changed the subject)\b/i,
    text: 'When you froze or made light of it, what were you feeling underneath?',
  },
  {
    key: 'always-never',
    pattern: /\b(always|never)\b/i,
    text: 'You used “always” or “never”. What happened this time, specifically? What was different, even a little?',
  },
]

/** Used when no theme fires, one per answered prompt. */
const BASE_QUESTIONS: Record<PromptKey, DeeperQuestion> = {
  situation: { key: 'base-situation', text: 'What did this moment seem to say about you, or about the two of you?' },
  feeling: { key: 'base-feeling', text: 'Does this feeling feel familiar? When have you felt it before?' },
  need: { key: 'base-need', text: 'How did you get this need met when you were younger, or what happened when you didn’t?' },
  action: { key: 'base-action', text: 'What were you protecting when you did that? What might you try next time?' },
}

const PROMPT_ORDER: PromptKey[] = ['situation', 'feeling', 'need', 'action']
export const MAX_QUESTIONS = 3

/** Picks up to 3 questions from the person's own reflections. Same input, same output (AC-4.6). */
export function pickDeeperQuestions(reflections: { prompt: PromptKey; body: string }[]): DeeperQuestion[] {
  const text = PROMPT_ORDER.map((p) => reflections.find((r) => r.prompt === p)?.body ?? '').join('\n')
  const picked: DeeperQuestion[] = THEME_RULES.filter((r) => r.pattern.test(text)).map(({ key, text }) => ({
    key,
    text,
  }))
  for (const prompt of PROMPT_ORDER) {
    if (picked.length >= MAX_QUESTIONS) break
    if (reflections.some((r) => r.prompt === prompt && r.body.trim())) picked.push(BASE_QUESTIONS[prompt])
  }
  return picked.slice(0, MAX_QUESTIONS)
}

export const ALL_QUESTION_TEXTS = [...THEME_RULES.map((r) => r.text), ...Object.values(BASE_QUESTIONS).map((q) => q.text)]
