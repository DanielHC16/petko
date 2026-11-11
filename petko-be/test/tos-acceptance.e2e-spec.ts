import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { configureApp } from '../src/bootstrap'
import { createSupabaseQueryMock } from '../src/common/testing/supabase-query.mock'
import { UsersModule } from '../src/modules/users/users.module'
import { SupabaseService } from '../src/supabase/supabase.service'
import { SupabaseModule } from '../src/supabase/supabase.module'

describe('TOS acceptance HTTP contract', () => {
  let app: NestExpressApplication
  const db = createSupabaseQueryMock()
  const userId = '00000000-0000-4000-8000-000000000001'
  let accepted = false
  const supabase = {
    admin: { from: db.from },
    anon: {
      auth: {
        getUser: jest.fn((token: string) => {
          if (!['customer', 'admin', 'listed'].includes(token))
            return Promise.resolve({
              data: { user: null },
              error: { message: 'Invalid token' },
            })
          db.queue('users', {
            data: {
              id: userId,
              email: 'tos@example.invalid',
              full_name: 'Test',
              avatar_url: '',
              role: token === 'admin' ? 'admin' : 'customer',
              tos_accepted: accepted,
            },
          })
          if (token === 'listed')
            db.queue('admin_access_emails', { data: { id: 'listed-email' } })
          return Promise.resolve({
            data: {
              user: {
                id: userId,
                ...(token === 'listed'
                  ? {
                      email: 'tos@example.invalid',
                      email_confirmed_at: '2026-01-01',
                    }
                  : {}),
              },
            },
            error: null,
          })
        }),
      },
    },
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SupabaseModule, UsersModule],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: (): undefined => undefined },
        },
      ],
    })
      .overrideProvider(SupabaseService)
      .useValue(supabase)
      .compile()
    app = module.createNestApplication<NestExpressApplication>()
    configureApp(app)
    await app.init()
  })
  beforeEach(() => {
    accepted = false
    db.queries.length = 0
    jest.clearAllMocks()
  })
  afterAll(async () => app?.close())

  it('requires a valid signed-in user', async () => {
    for (const token of [null, 'invalid']) {
      const call = request(app.getHttpServer())
        .post('/api/users/me/tos-acceptance')
        .send({ tos_accepted: true })
      if (token) call.set('Authorization', `Bearer ${token}`)
      expect((await call).status).toBe(401)
    }
    expect(db.queries).toHaveLength(0)
  })

  it.each(['customer', 'admin', 'listed'])(
    'accepts only for the authenticated %s and remains idempotent',
    async (token) => {
      for (let count = 0; count < 2; count++) {
        // Authentication consumes the first result; persistence consumes the next.
        const auth = supabase.anon.auth.getUser.getMockImplementation()
        supabase.anon.auth.getUser.mockImplementationOnce((value: string) => {
          const result = auth!(value)
          db.queue('users', { data: { tos_accepted: true } })
          return result
        })
        const res = await request(app.getHttpServer())
          .post('/api/users/me/tos-acceptance')
          .set('Authorization', `Bearer ${token}`)
          .send({ tos_accepted: true })
        expect(res.status).toBe(201)
        expect(res.body).toEqual({
          success: true,
          data: { tos_accepted: true },
          message: '',
        })
        const update = db.queries
          .filter((query) =>
            query.calls.some((call) => call.method === 'update'),
          )
          .at(-1)
        expect(update?.argsOf('eq')).toEqual(['id', userId])
        expect(update?.argsOf('update')).toEqual([{ tos_accepted: true }])
        accepted = true
      }
      const me = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
      expect(me.status).toBe(200)
      expect(me.body).toEqual({
        success: true,
        data: {
          id: userId,
          email: 'tos@example.invalid',
          full_name: 'Test',
          avatar_url: '',
          role: token === 'customer' ? 'customer' : 'admin',
          tos_accepted: true,
        },
        message: '',
      })
    },
  )

  it.each([
    {},
    { tos_accepted: false },
    { tos_accepted: 'true' },
    { tos_accepted: true, user_id: 'another' },
    { tos_accepted: true, role: 'admin' },
  ])(
    'rejects resets, missing consent and unrelated identity/role fields: %j',
    async (body) => {
      const res = await request(app.getHttpServer())
        .post('/api/users/me/tos-acceptance')
        .set('Authorization', 'Bearer customer')
        .send(body)
      expect(res.status).toBe(400)
      expect(
        db.queries.some((query) =>
          query.calls.some((call) => call.method === 'update'),
        ),
      ).toBe(false)
    },
  )
})
