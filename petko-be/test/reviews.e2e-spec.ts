import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { configureApp } from '../src/bootstrap'
import { AuthGuard } from '../src/common/guards/auth.guard'
import type { AuthenticatedRequest } from '../src/common/types/authenticated-request.type'
import { ReviewsModule } from '../src/modules/reviews/reviews.module'
import { ReviewsRepository } from '../src/modules/reviews/reviews.repository'

const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const product = '00000000-0000-4000-8000-000000000010'
const item = '00000000-0000-4000-8000-000000000011'
const review = '00000000-0000-4000-8000-000000000012'
const publicReview = {
  id: review,
  product_id: product,
  product_name: 'Pet food',
  variant_label: 'Small',
  author_name: 'Alex E.',
  rating: 5,
  comment: 'Great',
  created_at: '2026-11-14T00:00:00Z',
  updated_at: '2026-11-14T00:00:00Z',
}
const ownReview = {
  ...publicReview,
  version: 0,
  is_hidden: false,
  withdrawn_at: null,
}
const payload = { order_item_id: item, rating: 5, comment: ' Great ' }

describe('Reviews HTTP contract', () => {
  let app: NestExpressApplication
  const repository = {
    list: jest.fn(),
    context: jest.fn(),
    save: jest.fn(),
    withdraw: jest.fn(),
    listAdmin: jest.fn(),
    moderate: jest.fn(),
  }
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ReviewsModule],
      providers: [
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    })
      .overrideProvider(ReviewsRepository)
      .useValue(repository)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
          const token = req.headers.authorization
          if (
            !token ||
            !['Bearer owner', 'Bearer other', 'Bearer admin'].includes(token)
          )
            throw new UnauthorizedException()
          req.user = {
            id: token === 'Bearer other' ? other : owner,
            role: token === 'Bearer admin' ? 'admin' : 'customer',
            email: 'test@example.invalid',
            full_name: 'Private name',
            avatar_url: '',
            tos_accepted: true,
          }
          return true
        },
      })
      .compile()
    app = module.createNestApplication<NestExpressApplication>()
    configureApp(app)
    await app.init()
  })
  beforeEach(() => {
    jest.clearAllMocks()
    repository.list.mockResolvedValue({
      reviews: [publicReview],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      scope: 'family',
      summary: {
        total_reviews: 1,
        average_rating: 5,
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
      },
    })
    repository.context.mockResolvedValue({
      eligible: true,
      reason: 'eligible',
      order_item_id: item,
      review: ownReview,
    })
    repository.save.mockResolvedValue(ownReview)
    repository.withdraw.mockResolvedValue(true)
    repository.moderate.mockResolvedValue({
      ...ownReview,
      is_hidden: true,
      version: 1,
    })
    repository.listAdmin.mockResolvedValue({
      reviews: [ownReview],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
  })
  afterAll(async () => app?.close())

  it.each([undefined, 'Bearer expired'])(
    'keeps public reviews readable with credentials %s',
    async (token) => {
      const query = request(app.getHttpServer()).get(
        `/api/products/${product}/reviews`,
      )
      if (token) query.set('Authorization', token)
      const response = await query
      expect(response.status).toBe(200)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.body).toMatchObject({
        success: true,
        data: { reviews: [publicReview], summary: { total_reviews: 1 } },
        message: '',
      })
      expect(repository.context).not.toHaveBeenCalled()
      const serialized = JSON.stringify(response.body)
      for (const field of [
        'user_id',
        'order_item_id',
        'withdrawn_at',
        'is_hidden',
        'Private name',
        'test@example.invalid',
      ])
        expect(serialized).not.toContain(field)
    },
  )

  it.each([
    ['get', `/api/products/${product}/reviews/me`],
    ['post', `/api/products/${product}/reviews`],
    ['get', '/api/reviews/admin'],
    ['delete', `/api/reviews/${review}?expected_version=0`],
    ['patch', `/api/reviews/${review}/visibility`],
  ] as const)('rejects anonymous %s %s', async (method, path) => {
    expect(
      (await request(app.getHttpServer())[method](path).send({})).status,
    ).toBe(401)
  })

  it.each([
    ['get', '/api/reviews/admin'],
    ['patch', `/api/reviews/${review}/visibility`],
  ] as const)('rejects customer moderation %s %s', async (method, path) => {
    expect(
      (
        await request(app.getHttpServer())
          [method](path)
          .set('Authorization', 'Bearer owner')
          .send({ is_hidden: true, expected_version: 0 })
      ).status,
    ).toBe(403)
    expect(repository.moderate).not.toHaveBeenCalled()
  })

  it('uses the signed-in owner and normalizes the optional comment on create/edit', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/products/${product}/reviews`)
      .set('Authorization', 'Bearer owner')
      .send(payload)
    expect(response.status).toBe(201)
    expect(repository.save).toHaveBeenCalledWith(
      owner,
      product,
      expect.objectContaining({ ...payload, comment: 'Great' }),
    )
    expect(response.body).toMatchObject({ data: ownReview })
    const changed = await request(app.getHttpServer())
      .post(`/api/products/${product}/reviews`)
      .set('Authorization', 'Bearer other')
      .send({ order_item_id: item, rating: 4, expected_version: 0 })
    expect(changed.status).toBe(201)
    expect(repository.save).toHaveBeenLastCalledWith(
      other,
      product,
      expect.objectContaining({ rating: 4, expected_version: 0 }),
    )
  })

  it('keeps eligibility tied to the actor and optional order', async () => {
    const order = '00000000-0000-4000-8000-000000000020'
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/products/${product}/reviews/me?order_id=${order}`)
          .set('Authorization', 'Bearer owner')
      ).status,
    ).toBe(200)
    expect(repository.context).toHaveBeenCalledWith(owner, product, order)
    repository.context.mockRejectedValueOnce(
      new NotFoundException('Purchase not found'),
    )
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/products/${product}/reviews/me?order_id=${order}`)
          .set('Authorization', 'Bearer other')
      ).status,
    ).toBe(404)
  })

  it('keeps stale changes a safe 409 and withdrawal owner-scoped', async () => {
    repository.save.mockRejectedValueOnce(
      new ConflictException(
        'This review has changed. Refresh it and try again.',
      ),
    )
    const response = await request(app.getHttpServer())
      .post(`/api/products/${product}/reviews`)
      .set('Authorization', 'Bearer owner')
      .send(payload)
    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({ success: false, statusCode: 409 })
    const removed = await request(app.getHttpServer())
      .delete(`/api/reviews/${review}?expected_version=3`)
      .set('Authorization', 'Bearer owner')
    expect(removed.status).toBe(200)
    expect(removed.body).toMatchObject({ data: { removed: true } })
    expect(repository.withdraw).toHaveBeenCalledWith(owner, review, 3)
  })

  it('routes admin lists and permits only visibility/version changes', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/reviews/admin?visibility=hidden&page=2&limit=5')
      .set('Authorization', 'Bearer admin')
    expect(list.status).toBe(200)
    expect(repository.listAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'hidden', page: 2, limit: 5 }),
    )
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/reviews/${review}/visibility`)
          .set('Authorization', 'Bearer admin')
          .send({ is_hidden: true, expected_version: 0 })
      ).status,
    ).toBe(200)
    expect(repository.moderate).toHaveBeenCalledWith(review, {
      is_hidden: true,
      expected_version: 0,
    })
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/reviews/${review}/visibility`)
          .set('Authorization', 'Bearer admin')
          .send({ is_hidden: true, expected_version: 0, rating: 1 })
      ).status,
    ).toBe(400)
  })

  it.each([
    { ...payload, user_id: other },
    { ...payload, is_hidden: false },
    { ...payload, verified: true },
    { ...payload, rating: 0 },
    { ...payload, rating: 6 },
    { ...payload, rating: 1.5 },
    { ...payload, rating: '5' },
    { ...payload, rating: null },
    { ...payload, comment: null },
    { ...payload, comment: [] },
    { ...payload, comment: 'x'.repeat(2001) },
    { ...payload, expected_version: null },
    { ...payload, expected_version: -1 },
    { ...payload, order_item_id: 'invalid' },
    { ...payload, order_item_id: null },
  ])('rejects forged or invalid review input %#', async (body) => {
    expect(
      (
        await request(app.getHttpServer())
          .post(`/api/products/${product}/reviews`)
          .set('Authorization', 'Bearer owner')
          .send(body)
      ).status,
    ).toBe(400)
    expect(repository.save).not.toHaveBeenCalled()
  })

  it.each([
    'page=0',
    'page=100001',
    'page=1.5',
    'limit=0',
    'limit=51',
    'limit=garbage',
    'user_id=forged',
  ])('bounds public query %s', async (query) => {
    expect(
      (
        await request(app.getHttpServer()).get(
          `/api/products/${product}/reviews?${query}`,
        )
      ).status,
    ).toBe(400)
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('rejects malformed route and purchase/version/filter parameters', async () => {
    expect(
      (
        await request(app.getHttpServer()).get(
          '/api/products/not-a-uuid/reviews',
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/products/${product}/reviews/me?order_id=other`)
          .set('Authorization', 'Bearer owner')
      ).status,
    ).toBe(400)
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/api/reviews/${review}`)
          .set('Authorization', 'Bearer owner')
      ).status,
    ).toBe(400)
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/reviews/admin?visibility=unknown')
          .set('Authorization', 'Bearer admin')
      ).status,
    ).toBe(400)
  })
})
