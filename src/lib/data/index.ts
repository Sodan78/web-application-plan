import { createRepository } from './repository'
import { browserStorage } from './storage'

export const repo = createRepository(browserStorage())

export { AccessError, CONSENT_VERSION, type Repository } from './repository'
export type * from './types'
