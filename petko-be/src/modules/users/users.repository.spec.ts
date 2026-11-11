import { InternalServerErrorException, Logger } from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import { createSupabaseQueryMock } from '@/common/testing/supabase-query.mock'
import { UsersRepository } from './users.repository'

describe('UsersRepository TOS acceptance', () => {
  const db = createSupabaseQueryMock()
  const repository = new UsersRepository({
    admin: { from: db.from },
  } as unknown as SupabaseService)

  beforeEach(() => {
    db.queries.length = 0
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  it('sets only the authenticated profile flag and tolerates repeated acceptance', async () => {
    db.queue(
      'users',
      { data: { tos_accepted: true } },
      { data: { tos_accepted: true } },
    )
    await expect(repository.acceptTos('current-user')).resolves.toEqual({
      tos_accepted: true,
    })
    await expect(repository.acceptTos('current-user')).resolves.toEqual({
      tos_accepted: true,
    })
    for (const query of db.queries) {
      expect(query.table).toBe('users')
      expect(query.argsOf('update')).toEqual([{ tos_accepted: true }])
      expect(query.argsOf('eq')).toEqual(['id', 'current-user'])
      expect(query.argsOf('select')).toEqual(['tos_accepted'])
    }
  })

  it.each([
    {
      data: null,
      error: { code: 'XX000', message: 'private database details' },
    },
    { data: null },
    { data: { tos_accepted: false } },
  ])('never reports acceptance if persistence fails: %j', async (result) => {
    db.queue('users', result)
    await expect(repository.acceptTos('current-user')).rejects.toThrow(
      new InternalServerErrorException(
        'Could not save your agreement. Please try again.',
      ),
    )
  })
})
