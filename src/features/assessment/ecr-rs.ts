/**
 * ECR-RS, romantic partner domain, version 1.
 * Source: Fraley, R. C., Heffernan, M. E., Vicary, A. M., & Brumbaugh, C. C. (2011).
 * The Experiences in Close Relationships—Relationship Structures questionnaire.
 * Psychological Assessment, 23(3), 615–625.
 * Licence for app use not checked (product owner decision, see SPEC "Known risks").
 *
 * Order matters: scoring in src/lib/data/scoring.ts relies on it.
 * Item 9 uses "they" in place of "him or her".
 */
export const ECR_RS_ITEMS = [
  'It helps to turn to my partner in times of need.',
  'I usually discuss my problems and concerns with my partner.',
  'I talk things over with my partner.',
  'I find it easy to depend on my partner.',
  "I don't feel comfortable opening up to my partner.",
  'I prefer not to show my partner how I feel deep down.',
  "I often worry that my partner doesn't really care for me.",
  "I'm afraid that my partner may abandon me.",
  "I worry that my partner won't care about me as much as I care about them.",
] as const

export const SCALE = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Slightly disagree' },
  { value: 4, label: 'Neutral' },
  { value: 5, label: 'Slightly agree' },
  { value: 6, label: 'Agree' },
  { value: 7, label: 'Strongly agree' },
] as const
