import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AccessError, createRepository, type Repository, type Transport } from './repository'

const root = join(import.meta.dirname, '../../..')
const TABLES = 'private_notes, shares, reflections, checkins, assessments, couples, pair_requests, consents, profiles'

let shared: PGlite | null = null

/** One Postgres per test file with the real migrations applied (ADR 0007). */
async function database(): Promise<PGlite> {
  if (shared) return shared
  const db = new PGlite()
  await db.exec(readFileSync(join(root, 'supabase/tests/auth-shim.sql'), 'utf8'))
  for (const file of readdirSync(join(root, 'supabase/migrations')).sort()) {
    await db.exec(readFileSync(join(root, 'supabase/migrations', file), 'utf8'))
  }
  shared = db
  return db
}

const toParam = (v: unknown) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v)
// Arrays of objects are jsonb; arrays of numbers are int[].
const encode = (v: unknown) => (Array.isArray(v) && v.some((x) => typeof x === 'object') ? JSON.stringify(v) : toParam(v))

/** A fresh, empty database with an adjustable clock. */
export async function testRepository() {
  const db = await database()
  await db.exec(`truncate ${TABLES}, auth.users cascade`)
  let t = Date.parse('2026-01-01T00:00:00Z')
  const emails = new Map<string, string>()

  const call: Transport = async (viewerId, fn, args = {}) => {
    const names = Object.keys(args)
    const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`
    return db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true), set_config('app.now', $2, true)`, [
        viewerId ? JSON.stringify({ sub: viewerId }) : '',
        new Date(t).toISOString(),
      ])
      try {
        const res = await tx.query<{ r: unknown }>(sql, names.map((n) => encode(args[n])))
        return res.rows[0]?.r ?? null
      } catch (e) {
        const err = e as { code?: string; message: string }
        throw err.code === 'CU403' ? new AccessError(err.message) : e
      }
    })
  }

  const repo = createRepository(call)
  return {
    repo,
    db,
    advance: (ms: number) => {
      t += ms
    },
    emailOf: (id: string) => emails.get(id) ?? '',
    /** Signs up a user the way Supabase Auth does; the trigger creates the profile. */
    createUser: async (name: string) => {
      const email = `${name.toLowerCase()}@example.test`
      const res = await db.query<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
        [email, JSON.stringify({ display_name: name })],
      )
      emails.set(res.rows[0].id, email)
      return res.rows[0].id
    },
  }
}

export type TestContext = Awaited<ReturnType<typeof testRepository>>

export async function consentingProfile(ctx: TestContext, name: string) {
  const id = await ctx.createUser(name)
  await ctx.repo.setConsent(id, 'store_reflections', true)
  return id
}

export async function pairUp(ctx: TestContext, a: string, b: string) {
  await ctx.repo.requestPair(a, ctx.emailOf(b))
  const [request] = await ctx.repo.listPairRequests(b)
  await ctx.repo.respondToPair(b, request.id, true)
}

export const NEUTRAL_ANSWERS = [4, 4, 4, 4, 4, 4, 4, 4, 4]

/** Consent given and questionnaire done: ready for check-ins. */
export async function readyProfile(ctx: TestContext, name: string) {
  const id = await consentingProfile(ctx, name)
  await ctx.repo.saveAssessment(id, NEUTRAL_ANSWERS)
  return id
}

export type { Repository }
