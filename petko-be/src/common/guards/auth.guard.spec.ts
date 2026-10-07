import { ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import {
  createSupabaseQueryMock,
  type SupabaseQueryMock,
} from '@/common/testing/supabase-query.mock'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { AuthGuard } from './auth.guard'

const TABLE = 'admin_access_emails'

const customer: UserProfile = {
  id: 'u1',
  email: 'listed@x.com',
  full_name: 'Listed',
  avatar_url: '',
  role: 'customer',
}

interface FakeRequest {
  headers: Record<string, string | undefined>
  user?: UserProfile
}

function contextFor(req: FakeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
  let db: SupabaseQueryMock
  let getUser: jest.Mock
  let guard: AuthGuard

  function authUser(
    email: string | undefined,
    confirmed = true,
  ): { id: string; email?: string; email_confirmed_at?: string } {
    return {
      id: 'u1',
      email,
      email_confirmed_at: confirmed ? '2024-01-01T00:00:00Z' : undefined,
    }
  }

  async function run(): Promise<FakeRequest> {
    const req: FakeRequest = { headers: { authorization: 'Bearer token' } }
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    return req
  }

  beforeEach(() => {
    db = createSupabaseQueryMock()
    getUser = jest.fn()
    guard = new AuthGuard({
      admin: { from: db.from },
      anon: { auth: { getUser } },
    } as unknown as SupabaseService)
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('treats a listed, confirmed customer as admin', async () => {
    getUser.mockResolvedValue({ data: { user: authUser('listed@x.com') } })
    db.queue('users', { data: customer })
    db.queue(TABLE, { data: { id: 'row' } })

    const req = await run()
    expect(req.user?.role).toBe('admin')
  })

  it('matches a mixed-case auth email against the lowercase row', async () => {
    getUser.mockResolvedValue({ data: { user: authUser(' Listed@X.COM ') } })
    db.queue('users', { data: customer })
    db.queue(TABLE, { data: { id: 'row' } })

    await run()
    const lookup = db.queries.find((q) => q.table === TABLE)
    expect(lookup?.argsOf('eq')).toEqual(['email', 'listed@x.com'])
  })

  it('ignores the list when the auth email is not confirmed', async () => {
    getUser.mockResolvedValue({
      data: { user: authUser('listed@x.com', false) },
    })
    db.queue('users', { data: customer })

    const req = await run()
    expect(req.user?.role).toBe('customer')
    expect(db.queries.some((q) => q.table === TABLE)).toBe(false)
  })

  it('keeps an unlisted customer as customer', async () => {
    getUser.mockResolvedValue({ data: { user: authUser('other@x.com') } })
    db.queue('users', { data: { ...customer, email: 'other@x.com' } })
    db.queue(TABLE, { data: null })

    const req = await run()
    expect(req.user?.role).toBe('customer')
  })

  it('keeps a stored admin as admin when not listed', async () => {
    getUser.mockResolvedValue({ data: { user: authUser('boss@x.com') } })
    db.queue('users', { data: { ...customer, role: 'admin' } })
    db.queue(TABLE, { data: null })

    const req = await run()
    expect(req.user?.role).toBe('admin')
  })

  it('fails closed to the stored role when the list lookup errors', async () => {
    getUser.mockResolvedValue({ data: { user: authUser('listed@x.com') } })
    db.queue('users', { data: customer })
    db.queue(TABLE, { error: { message: 'relation does not exist' } })

    const req = await run()
    expect(req.user?.role).toBe('customer')
  })

  it('rejects a missing Authorization header with 401', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejects an invalid token with 401', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'bad jwt' },
    })
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer nope' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejects a user without a profile row with 401', async () => {
    getUser.mockResolvedValue({ data: { user: authUser('listed@x.com') } })
    db.queue('users', { data: null, error: { message: 'no rows' } })
    db.queue(TABLE, { data: { id: 'row' } })

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
