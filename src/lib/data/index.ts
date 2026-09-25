import { supabase } from '@/lib/supabase'
import { AccessError, createRepository, type Transport } from './repository'

/** Calls database functions as the signed-in user; the server ignores `viewerId` and uses the session. */
const supabaseTransport: Transport = async (_viewerId, fn, args) => {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error.code === 'CU403' ? new AccessError(error.message) : new Error(error.message)
  return data
}

export const repo = createRepository(supabaseTransport)

export { AccessError, CONSENT_VERSION, type Repository } from './repository'
export type * from './types'
