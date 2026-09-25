// @vitest-environment node
import { beforeEach, describe, expect, test } from 'vitest'
import { AccessError } from './repository'
import { pairUp, readyProfile, testRepository, type TestContext } from './test-helpers'

let ctx: TestContext

beforeEach(async () => {
  ctx = await testRepository()
})

const TABLES = ['private_notes', 'profiles', 'consents', 'pair_requests', 'couples', 'assessments', 'checkins', 'reflections', 'shares']

describe('AC-3.5 database access', () => {
  test('signed-out calls are refused', async () => {
    await expect(ctx.repo.getConsents('')).rejects.toThrow(AccessError)
    await expect(ctx.repo.listCheckins('')).rejects.toThrow(AccessError)
  })

  test('the anonymous role cannot call any function', async () => {
    await expect(
      ctx.db.transaction(async (tx) => {
        await tx.exec('set local role anon')
        await tx.query('select public.get_consents()')
      }),
    ).rejects.toThrow(/permission denied/)
  })

  test('signed-in users cannot read any table directly, only through functions', async () => {
    const a = await readyProfile(ctx, 'Alex')
    const b = await readyProfile(ctx, 'Sam')
    await pairUp(ctx, a, b)
    for (const table of TABLES) {
      await expect(
        ctx.db.transaction(async (tx) => {
          await tx.exec('set local role authenticated')
          await tx.query(`select * from public.${table}`)
        }),
      ).rejects.toThrow(/permission denied/)
    }
  })

  test('internal helpers are not callable by signed-in users', async () => {
    await expect(
      ctx.db.transaction(async (tx) => {
        await tx.exec('set local role authenticated')
        await tx.query('select private.tidy()')
      }),
    ).rejects.toThrow(/permission denied/)
  })
})
