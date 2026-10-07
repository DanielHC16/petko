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
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { AdminAccessEmailsService } from './admin-access-emails.service'

const TABLE = 'admin_access_emails'

const me: UserProfile = {
  id: 'me-id',
  email: 'Daniel@Example.com',
  full_name: 'Daniel',
  avatar_url: '',
  role: 'admin',
}

describe('AdminAccessEmailsService', () => {
  let db: SupabaseQueryMock
  let service: AdminAccessEmailsService

  beforeEach(() => {
    db = createSupabaseQueryMock()
    service = new AdminAccessEmailsService({
      admin: { from: db.from },
    } as unknown as SupabaseService)
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('add', () => {
    it('inserts the normalized lowercase email with added_by', async () => {
      const row = { id: '1', email: 'new@x.com', added_by: 'me-id' }
      db.queue(TABLE, { data: row })

      await expect(service.add('  New@X.COM ', 'me-id')).resolves.toEqual(row)
      expect(db.queries[0].argsOf('insert')).toEqual([
        { email: 'new@x.com', added_by: 'me-id' },
      ])
    })

    it('maps a unique violation to 409', async () => {
      db.queue(TABLE, { error: { message: 'dup', code: '23505' } })
      await expect(service.add('a@x.com', 'me-id')).rejects.toThrow(
        new ConflictException('That email already has admin access'),
      )
    })

    it('returns a generic message for other database errors', async () => {
      db.queue(TABLE, { error: { message: 'secret pg detail', code: 'XX' } })
      const promise = service.add('a@x.com', 'me-id')
      await expect(promise).rejects.toBeInstanceOf(BadRequestException)
      await expect(promise).rejects.not.toThrow(/secret pg detail/)
    })
  })

  describe('remove', () => {
    it('returns 404 when the id does not exist', async () => {
      db.queue(TABLE, { data: null })
      await expect(service.remove('id', me)).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    it('refuses to remove your own email (case-insensitive)', async () => {
      db.queue(TABLE, { data: { id: 'id', email: 'daniel@example.com' } })
      await expect(service.remove('id', me)).rejects.toThrow(
        new BadRequestException(
          'You cannot remove your own email from the admin access list',
        ),
      )
    })

    it('refuses to remove the last remaining email', async () => {
      db.queue(
        TABLE,
        { data: { id: 'id', email: 'other@x.com' } },
        { count: 1 },
      )
      await expect(service.remove('id', me)).rejects.toThrow(
        new ConflictException('At least one email must keep admin access'),
      )
      expect(db.queries.some((q) => q.argsOf('delete'))).toBe(false)
    })

    it('deletes when another email remains', async () => {
      db.queue(
        TABLE,
        { data: { id: 'id', email: 'other@x.com' } },
        { count: 3 },
        { error: null },
      )
      await expect(service.remove('id', me)).resolves.toEqual({
        message: 'Email removed from the admin access list',
      })
      expect(db.queries[2].argsOf('delete')).toEqual([])
      expect(db.queries[2].argsOf('eq')).toEqual(['id', 'id'])
    })
  })

  describe('lookups', () => {
    it('isListed normalizes before matching', async () => {
      db.queue(TABLE, { data: { id: '1' } })
      await expect(service.isListed(' Foo@Bar.com ')).resolves.toBe(true)
      expect(db.queries[0].argsOf('eq')).toEqual(['email', 'foo@bar.com'])
    })

    it('findEmailSet returns normalized emails', async () => {
      db.queue(TABLE, { data: [{ email: 'a@x.com' }, { email: 'B@x.com' }] })
      await expect(service.findEmailSet()).resolves.toEqual(
        new Set(['a@x.com', 'b@x.com']),
      )
    })
  })
})
