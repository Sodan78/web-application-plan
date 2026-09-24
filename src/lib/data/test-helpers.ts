import { createRepository, type Repository } from './repository'
import { memoryStorage } from './storage'

/** A repository with an adjustable clock, for tests. */
export function testRepository() {
  let t = Date.parse('2026-01-01T00:00:00Z')
  const repo = createRepository(memoryStorage(), () => new Date(t).toISOString())
  return {
    repo,
    advance: (ms: number) => {
      t += ms
    },
  }
}

export async function consentingProfile(repo: Repository, name: string) {
  const { id } = await repo.createProfile(name)
  await repo.setConsent(id, 'store_reflections', true)
  return id
}

export async function pairUp(repo: Repository, a: string, b: string) {
  await repo.requestPair(a, b)
  const [request] = await repo.listPairRequests(b)
  await repo.respondToPair(b, request.id, true)
}

export const NEUTRAL_ANSWERS = [4, 4, 4, 4, 4, 4, 4, 4, 4]

/** Consent given and questionnaire done: ready for check-ins. */
export async function readyProfile(repo: Repository, name: string) {
  const id = await consentingProfile(repo, name)
  await repo.saveAssessment(id, NEUTRAL_ANSWERS)
  return id
}
