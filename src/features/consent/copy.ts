import type { ConsentPurpose } from '@/lib/data'

export type ConsentCopy = {
  purpose: ConsentPurpose
  title: string
  note: string
  description: string
  available: boolean
}

/** Consent wording, version CONSENT_VERSION. Changing the wording means bumping it. */
export const CONSENT_ITEMS: ConsentCopy[] = [
  {
    purpose: 'store_reflections',
    title: 'Store my reflections',
    note: 'Required to use check-ins',
    description:
      'We keep what you write so you can come back to it. It is stored securely in the EU and only you can read it.',
    available: true,
  },
  {
    purpose: 'ai_insights',
    title: 'Insights from my reflections',
    note: 'Optional, off by default',
    description:
      'Later, the app can suggest patterns it notices in your own reflections. Nothing is analysed until you turn this on.',
    available: false,
  },
  {
    purpose: 'therapist_access',
    title: 'Therapist access',
    note: 'Optional, off by default',
    description:
      'Your therapist can see what you and your partner have shared, only if you both agree.',
    available: false,
  },
]
