import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { createApp } from './../src/bootstrap'

// Dummy config comes from test/setup-env.ts; no real .env file is read.
describe('AppController (e2e)', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createApp()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ success: true, data: { status: 'ok' }, message: '' })
  })
})
