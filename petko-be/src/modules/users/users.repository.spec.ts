import {
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
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

describe('UsersRepository account changes', () => {
  const db = createSupabaseQueryMock()
  const rpc = jest.fn()
  const rpcQuery = { returns: jest.fn() }
  const repository = new UsersRepository({
    admin: { from: db.from, rpc },
  } as unknown as SupabaseService)

  beforeEach(() => {
    db.queries.length = 0
    rpc.mockReset()
    rpc.mockReturnValue(rpcQuery)
    rpcQuery.returns.mockReset()
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => jest.restoreAllMocks())

  it('persists the display name in the canonical user row without changing role', async () => {
    const profile = { id: 'owner', full_name: 'New Name', role: 'customer' }
    db.queue('users', { data: profile })
    await expect(repository.updateName('owner', 'New Name')).resolves.toEqual(
      profile,
    )
    expect(db.queries[0].table).toBe('users')
    expect(db.queries[0].argsOf('update')).toEqual([{ full_name: 'New Name' }])
    expect(db.queries[0].argsOf('eq')).toEqual(['id', 'owner'])
  })

  it('does not report a successful name update when persistence fails', async () => {
    db.queue('users', { error: { code: '42501', message: 'private failure' } })
    await expect(repository.updateName('owner', 'New Name')).rejects.toThrow(
      'Could not save your display name. Please try again.',
    )
  })

  it('uses the atomic account-deletion transaction', async () => {
    rpcQuery.returns.mockResolvedValue({ data: true, error: null })
    await expect(repository.deleteOwnAccount('owner')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('petko_delete_own_account', {
      p_user_id: 'owner',
    })
  })

  it.each([
    [
      'P4094',
      'Complete or cancel your active orders before deleting your account.',
    ],
    ['P4095', 'The last admin account cannot be deleted.'],
  ])(
    'returns a useful conflict for account deletion %s',
    async (code, message) => {
      rpcQuery.returns.mockResolvedValue({
        data: null,
        error: { code, message: 'private detail' },
      })
      await expect(repository.deleteOwnAccount('owner')).rejects.toThrow(
        new ConflictException(message),
      )
    },
  )

  it('does not treat a failed deletion transaction as success or expose private details', async () => {
    rpcQuery.returns.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'private detail' },
    })
    await expect(repository.deleteOwnAccount('owner')).rejects.toThrow(
      'Could not delete your account. Please try again.',
    )
  })
})

describe('UsersRepository saved shipping', () => {
  const updateUserById = jest.fn()
  const repository = new UsersRepository({
    admin: { auth: { admin: { updateUserById } } },
  } as unknown as SupabaseService)
  afterEach(() => jest.restoreAllMocks())

  it('clears only the authenticated identity metadata', async () => {
    updateUserById.mockResolvedValue({
      data: { user: { id: 'owner' } },
      error: null,
    })
    await expect(repository.updateShipping('owner', null)).resolves.toEqual({
      saved_shipping: null,
    })
    expect(updateUserById).toHaveBeenCalledWith('owner', {
      user_metadata: { saved_shipping: null },
    })
  })

  it('checks Auth returned errors instead of claiming details were saved', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    updateUserById.mockResolvedValue({
      data: { user: null },
      error: { code: 'failure', message: 'private' },
    })
    await expect(repository.updateShipping('owner', null)).rejects.toThrow(
      'Could not save your shipping details. Please try again.',
    )
  })
})
