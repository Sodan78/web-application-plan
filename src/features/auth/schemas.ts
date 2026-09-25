import { z } from 'zod'

export const email = z.email('Enter a valid email address')
export const password = z.string().min(8, 'Use at least 8 characters')
export const displayName = z.string().trim().min(1, 'Enter your name').max(40, 'Use 40 characters or fewer')
