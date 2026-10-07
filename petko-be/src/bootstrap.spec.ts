import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { createApp } from './bootstrap'

/**
 * Boots the real AppModule with the shared `configureApp` setup and the dummy
 * env vars from `test/setup-env.ts`. Only routes that never reach Supabase
 * are exercised.
 */
describe('createApp (shared bootstrap)', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createApp()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('serves GET /api/health', async () => {
    const res = await request(app.getHttpServer()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok' },
      message: '',
    })
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('does not serve routes outside the /api prefix', async () => {
    const res = await request(app.getHttpServer()).get('/health')
    expect(res.status).toBe(404)
  })

  it.each([
    ['get', '/api/users/me'],
    ['get', '/api/users'],
    ['get', '/api/products/admin/all'],
    ['post', '/api/users/promote'],
    ['post', '/api/products'],
    ['get', '/api/admin-access-emails'],
    ['post', '/api/admin-access-emails'],
    ['delete', '/api/admin-access-emails/00000000-0000-0000-0000-000000000000'],
    ['get', '/api/admin/stats'],
  ] as const)(
    'rejects unauthenticated %s %s with 401',
    async (method, path) => {
      const res = await request(app.getHttpServer())[method](path).send({})
      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({ success: false, statusCode: 401 })
    },
  )

  it('returns the error envelope without a stack trace for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ success: false, statusCode: 404 })
    expect(res.body).not.toHaveProperty('stack')
  })

  it('rejects a non-UUID product id with 400', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/products/not-a-uuid',
    )
    expect(res.status).toBe(400)
  })

  it('does not send CORS headers when FRONTEND_URL is unset', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
