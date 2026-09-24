import type { PromptKey, Weekday } from '@/lib/data'

export const PROMPTS: { key: PromptKey; label: string; helper: string }[] = [
  { key: 'situation', label: 'A moment this week', helper: 'Something that happened between you, big or small.' },
  { key: 'feeling', label: 'What I felt', helper: 'In your body or your mind.' },
  { key: 'need', label: 'What I needed', helper: 'What would have helped you in that moment.' },
  { key: 'action', label: 'What I did', helper: 'How you responded, or what you held back.' },
]

export const promptLabel = (key: PromptKey) => PROMPTS.find((p) => p.key === key)?.label ?? key

const CONVERSATION_PROMPTS = [
  "What's one thing you'd like the other to understand better?",
  'What did you notice in what your partner shared?',
  'Is there a moment this week you would handle differently now?',
  'What helped you feel close this week, even briefly?',
  'What is one small thing you could each try before the next check-in?',
]

/** Stable per check-in, so both partners see the same prompt. */
export function conversationPrompt(checkinId: string): string {
  let hash = 0
  for (const ch of checkinId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return CONVERSATION_PROMPTS[hash % CONVERSATION_PROMPTS.length]
}

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

/** The UI is in English, so dates are too, whatever the browser language. */
export const LOCALE = 'en-GB'

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
