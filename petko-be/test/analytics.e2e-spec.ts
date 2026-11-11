import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { configureApp } from '../src/bootstrap'
import { createSupabaseQueryMock } from '../src/common/testing/supabase-query.mock'
import { AnalyticsModule } from '../src/modules/analytics/analytics.module'
import { AnalyticsRepository } from '../src/modules/analytics/analytics.repository'
import { SupabaseService } from '../src/supabase/supabase.service'
import { SupabaseModule } from '../src/supabase/supabase.module'

const capture = {
  session_id: '00000000-0000-4000-8000-000000000001',
  event_id: '00000000-0000-4000-8000-000000000002',
  page: 'login',
}

describe('Analytics HTTP contract', () => {
  let app: NestExpressApplication
  const repository = { record: jest.fn(), report: jest.fn() }
  const queries = createSupabaseQueryMock()
  const supabase = {
    admin: { from: queries.from },
    anon: {
      auth: {
        getUser: jest.fn((token: string) => {
          if (!['customer', 'admin'].includes(token))
            return Promise.resolve({
              data: { user: null },
              error: { message: 'Invalid token' },
            })
          const id = '00000000-0000-4000-8000-000000000003'
          queries.queue('users', {
            data: {
              id,
              email: 'test@example.invalid',
              full_name: 'Test',
              avatar_url: '',
              role: token === 'admin' ? 'admin' : 'customer',
            },
          })
          return Promise.resolve({ data: { user: { id } }, error: null })
        }),
      },
    },
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SupabaseModule, AnalyticsModule],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: (): undefined => undefined },
        },
      ],
    })
      .overrideProvider(AnalyticsRepository)
      .useValue(repository)
      .overrideProvider(SupabaseService)
      .useValue(supabase)
      .compile()
    app = module.createNestApplication<NestExpressApplication>()
    configureApp(app)
    await app.init()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    repository.record.mockResolvedValue(true)
    repository.report.mockResolvedValue({ summary: { placedOrders: 1004 } })
  })

  afterAll(async () => app?.close())

  it('requires authentication and admin role for the report', async () => {
    expect(
      (await request(app.getHttpServer()).get('/api/admin/analytics')).status,
    ).toBe(401)
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/admin/analytics')
          .set('Authorization', 'Bearer customer')
      ).status,
    ).toBe(403)
    expect(repository.report).not.toHaveBeenCalled()
    const res = await request(app.getHttpServer())
      .get('/api/admin/analytics?start=2024-03-01&end=2024-03-02')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: true,
      data: { summary: { placedOrders: 1004 } },
      message: '',
    })
    expect(repository.report).toHaveBeenCalledWith('2024-03-01', '2024-03-02')
  })

  it('accepts guest login with 202 but rejects anonymous storefront/identity calls', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/analytics/events')
      .send(capture)
    expect(res.status).toBe(202)
    expect(res.body).toEqual({
      success: true,
      data: { accepted: true },
      message: '',
    })
    expect(repository.record).toHaveBeenCalledWith(capture, undefined)
    for (const page of ['catalog', 'identify']) {
      expect(
        (
          await request(app.getHttpServer())
            .post('/api/analytics/events')
            .send({ ...capture, page })
        ).status,
      ).toBe(400)
    }
  })

  it.each(['garbage', 'Bearer expired'])(
    'does not downgrade invalid credentials (%s) to guests',
    async (token) => {
      const res = await request(app.getHttpServer())
        .post('/api/analytics/events')
        .set('Authorization', token)
        .send(capture)
      expect(res.status).toBe(401)
      expect(repository.record).not.toHaveBeenCalled()
    },
  )

  it('passes admin identity to capture so earlier guest traffic is removed', async () => {
    repository.record.mockResolvedValue(false)
    const res = await request(app.getHttpServer())
      .post('/api/analytics/events')
      .set('Authorization', 'Bearer admin')
      .send({ ...capture, page: 'identify' })
    expect(res.status).toBe(202)
    const body: unknown = res.body
    expect(body).toMatchObject({ data: { accepted: false } })
    expect(repository.record).toHaveBeenCalledWith(
      { ...capture, page: 'identify' },
      expect.objectContaining({ role: 'admin' }),
    )
  })

  it.each([
    { ...capture, user_id: 'forged' },
    { ...capture, role: 'admin' },
    { ...capture, timestamp: '2000-01-01' },
    { ...capture, page: '/login?token=private' },
    { ...capture, session_id: 'invalid' },
    { ...capture, event_id: 'invalid' },
    { ...capture, email: 'private@example.invalid' },
    { ...capture, session_id: [capture.session_id] },
  ])(
    'rejects forged, private or malformed telemetry fields',
    async (payload) => {
      const res = await request(app.getHttpServer())
        .post('/api/analytics/events')
        .send(payload)
      expect(res.status).toBe(400)
      expect(repository.record).not.toHaveBeenCalled()
    },
  )

  it.each([
    '?start=2024-02-30&end=2024-03-01',
    '?start=2024-01-01',
    '?start=2024-01-01&end=2025-01-01',
    '?start=2024-03-02&end=2024-03-01',
    '?start=2024-03-01&end=2024-03-02&user_id=private',
    '?start[]=2024-03-01&end=2024-03-02',
  ])('rejects invalid or overbroad report query %s', async (query) => {
    const res = await request(app.getHttpServer())
      .get(`/api/admin/analytics${query}`)
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(400)
    expect(repository.report).not.toHaveBeenCalled()
  })
})
