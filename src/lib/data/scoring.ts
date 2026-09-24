/**
 * ECR-RS, romantic partner domain (Fraley, Heffernan, Vicary & Brumbaugh, 2011).
 * 9 items on a 1–7 scale. Items 1–4 are reverse-scored.
 * Avoidance = mean of items 1–6, anxiety = mean of items 7–9.
 */
export const ECR_RS_ITEM_COUNT = 9

export function isValidEcrRsAnswers(answers: unknown): answers is number[] {
  return (
    Array.isArray(answers) &&
    answers.length === ECR_RS_ITEM_COUNT &&
    answers.every((a) => Number.isInteger(a) && a >= 1 && a <= 7)
  )
}

export function scoreEcrRs(answers: number[]): { avoidance: number; anxiety: number } {
  const scored = answers.map((a, i) => (i < 4 ? 8 - a : a))
  const mean = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length
  return { avoidance: mean(scored.slice(0, 6)), anxiety: mean(scored.slice(6, 9)) }
}
