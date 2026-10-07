import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import {
  createSupabaseQueryMock,
  type SupabaseQueryMock,
} from '@/common/testing/supabase-query.mock'
import type { AdminAccessEmailsService } from '@/modules/admin-access-emails/admin-access-emails.service'
import { UsersService, type UserRecord } from './users.service'

function user(
  id: string,
  role: UserRecord['role'],
  email = `${id}@x.com`,
): UserRecord {
  return {
    id,
    email,
    role,
    full_name: id,
    avatar_url: '',
    created_at: '2024-01-01T00:00:00Z',
  }
}

describe('UsersService', () => {
  let db: SupabaseQueryMock
  let listed: Set<string>
  let auth: {
    listUsers: jest.Mock
    deleteUser: jest.Mock
    createUser: jest.Mock
  }
  let service: UsersService

  beforeEach(() => {
    db = createSupabaseQueryMock()
    listed = new Set()
    auth = {
      listUsers: jest.fn(),
      deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      createUser: jest.fn(),
    }
    const accessEmails = {
      findEmailSet: jest.fn(() => Promise.resolve(new Set(listed))),
      isListed: jest.fn((email: string) =>
        Promise.resolve(listed.has(email.trim().toLowerCase())),
      ),
    }
    service = new UsersService(
      {
        admin: { from: db.from, auth: { admin: auth } },
      } as unknown as SupabaseService,
      accessEmails as unknown as AdminAccessEmailsService,
    )
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('findAll', () => {
    it('marks listed users as admin with admin_access_listed', async () => {
      listed.add('listed@x.com')
      db.queue('users', {
        data: [user('a', 'customer', 'Listed@X.com'), user('b', 'customer')],
      })

      const users = await service.findAll()
      expect(users[0]).toMatchObject({
        role: 'admin',
        admin_access_listed: true,
      })
      expect(users[1]).toMatchObject({
        role: 'customer',
        admin_access_listed: false,
      })
    })

    it('returns a generic message on a database error', async () => {
      db.queue('users', { error: { message: 'secret pg detail' } })
      const promise = service.findAll()
      await expect(promise).rejects.toThrow(
        new BadRequestException('Could not load users. Please try again.'),
      )
    })
  })

  describe('countByEffectiveRole', () => {
    it('counts stored and listed admins once each', async () => {
      listed.add('b@x.com')
      db.queue('users', {
        data: [
          user('a', 'admin'),
          user('b', 'customer'),
          user('c', 'customer'),
        ],
      })
      await expect(service.countByEffectiveRole()).resolves.toEqual({
        total: 3,
        admins: 2,
        customers: 1,
      })
    })
  })

  describe('promoteByEmail', () => {
    it('escapes ilike wildcards in the email lookup', async () => {
      db.queue('users', { data: user('a', 'customer', 'a_b@x.com') })
      db.queue('users', { data: user('a', 'admin', 'a_b@x.com') })

      await service.promoteByEmail('A_B@x.com', 'admin', 'me')
      expect(db.queries[0].argsOf('ilike')).toEqual(['email', 'a\\_b@x.com'])
    })

    it('finds an auth user on the second listUsers page', async () => {
      const filler = Array.from({ length: 1000 }, (_, i) => ({
        id: `f${i}`,
        email: `f${i}@x.com`,
        user_metadata: {},
      }))
      auth.listUsers
        .mockResolvedValueOnce({ data: { users: filler }, error: null })
        .mockResolvedValueOnce({
          data: {
            users: [{ id: 'new', email: 'New@X.com', user_metadata: {} }],
          },
          error: null,
        })
      db.queue('users', { data: null })
      db.queue('users', { data: user('new', 'admin', 'new@x.com') })

      await expect(
        service.promoteByEmail('new@x.com', 'admin', 'me'),
      ).resolves.toMatchObject({ id: 'new', role: 'admin' })
      expect(auth.listUsers).toHaveBeenCalledTimes(2)
      expect(auth.listUsers).toHaveBeenLastCalledWith({
        page: 2,
        perPage: 1000,
      })
      expect(auth.createUser).not.toHaveBeenCalled()
    })

    it('surfaces a listUsers error with a generic message', async () => {
      auth.listUsers.mockResolvedValue({
        data: { users: [] },
        error: { message: 'secret auth detail' },
      })
      db.queue('users', { data: null })

      await expect(
        service.promoteByEmail('new@x.com', 'admin', 'me'),
      ).rejects.toThrow(
        new BadRequestException(
          'Could not assign the role for this email. Please try again.',
        ),
      )
    })
  })

  describe('removeUser', () => {
    it('refuses to delete yourself', async () => {
      await expect(service.removeUser('me', 'me')).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('returns 404 for an unknown user', async () => {
      db.queue('users', { data: null })
      await expect(service.removeUser('x', 'me')).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    it('refuses to delete the last admin', async () => {
      db.queue('users', { data: user('a', 'admin') })
      db.queue('users', { data: [user('a', 'admin'), user('b', 'customer')] })

      await expect(service.removeUser('a', 'me')).rejects.toThrow(
        new ConflictException('Cannot remove the last admin account'),
      )
      expect(auth.deleteUser).not.toHaveBeenCalled()
    })

    it('surfaces an auth delete error and keeps the profile', async () => {
      db.queue('users', { data: user('b', 'customer') })
      auth.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'violates foreign key' },
      })

      const promise = service.removeUser('b', 'me')
      await expect(promise).rejects.toThrow(
        new BadRequestException(
          'Could not remove this account. It may have orders linked to it.',
        ),
      )
      expect(db.queries.some((q) => q.argsOf('delete'))).toBe(false)
    })

    it('deletes the auth user and then the profile', async () => {
      db.queue('users', { data: user('b', 'customer') }, { error: null })

      await expect(service.removeUser('b', 'me')).resolves.toEqual({
        message: 'User account removed successfully',
      })
      expect(auth.deleteUser).toHaveBeenCalledWith('b')
      expect(db.queries[1].argsOf('eq')).toEqual(['id', 'b'])
    })
  })

  describe('updateRole', () => {
    it('refuses to change your own role', async () => {
      await expect(
        service.updateRole('me', 'customer', 'me'),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('refuses to demote the last admin', async () => {
      db.queue('users', { data: user('a', 'admin') })
      db.queue('users', { data: [user('a', 'admin')] })

      await expect(service.updateRole('a', 'customer', 'me')).rejects.toThrow(
        new ConflictException('Cannot demote the last admin account'),
      )
    })

    it('refuses to demote a user listed in the access list', async () => {
      listed.add('a@x.com')
      db.queue('users', { data: user('a', 'admin') })

      await expect(
        service.updateRole('a', 'customer', 'me'),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('demotes a stored admin when another admin remains', async () => {
      db.queue('users', { data: user('a', 'admin') })
      db.queue('users', { data: [user('a', 'admin'), user('b', 'admin')] })
      db.queue('users', { data: user('a', 'customer') })

      await expect(
        service.updateRole('a', 'customer', 'me'),
      ).resolves.toMatchObject({ role: 'customer' })
    })
  })
})
