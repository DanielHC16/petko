import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import type { ExecutionContext } from '@nestjs/common'
import { UnauthorizedException, NotFoundException } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { configureApp } from '../src/bootstrap'
import { AuthGuard } from '../src/common/guards/auth.guard'
import type { AuthenticatedRequest } from '../src/common/types/authenticated-request.type'
import { OrdersModule } from '../src/modules/orders/orders.module'
import { OrdersRepository } from '../src/modules/orders/orders.repository'

const orderId = '00000000-0000-4000-8000-000000000010'
const ownerId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'
const adminId = '00000000-0000-4000-8000-000000000003'
const validPayload = {
  checkout_request_id: '00000000-0000-4000-8000-000000000020',
  payment_method: 'cod',
  delivery_method: 'standard',
  shipping: {
    full_name: 'Customer',
    email: 'customer@example.invalid',
    phone: '09171234567',
    address_line1: 'Test Street',
    city: 'Manila',
    province: 'Metro Manila',
    postal_code: '1000',
  },
  items: [{ product_id: '00000000-0000-4000-8000-000000000030', quantity: 1 }],
}

describe('Orders HTTP contract', () => {
  let app: NestExpressApplication
  const repository = {
    list: jest.fn(),
    findDetail: jest.fn(),
    create: jest.fn(),
    mutate: jest.fn(),
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [OrdersModule],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: (): undefined => undefined },
        },
      ],
    })
      .overrideProvider(OrdersRepository)
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
            id:
              token === 'Bearer admin'
                ? adminId
                : token === 'Bearer other'
                  ? otherId
                  : ownerId,
            email: 'test@example.invalid',
            full_name: 'Test',
            avatar_url: '',
            role: token === 'Bearer admin' ? 'admin' : 'customer',
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
      orders: [],
      total: 0,
      page: 1,
      limit: 20,
    })
    repository.create.mockResolvedValue({ id: orderId })
    repository.findDetail.mockResolvedValue({ id: orderId, events: [] })
    repository.mutate.mockResolvedValue({ id: orderId })
  })

  afterAll(async () => {
    await app.close()
  })

  it.each([
    ['get', '/api/orders'],
    ['get', '/api/orders/admin/all'],
    ['get', `/api/orders/${orderId}`],
    ['post', '/api/orders'],
    ['patch', `/api/orders/${orderId}/fulfillment`],
    ['post', `/api/orders/${orderId}/confirm-receipt`],
    ['post', `/api/orders/${orderId}/delivery-issue`],
    ['post', `/api/orders/${orderId}/resolve-delivery-issue`],
  ] as const)('rejects anonymous %s %s', async (method, path) => {
    const response = await request(app.getHttpServer())[method](path).send({})
    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ success: false, statusCode: 401 })
  })

  it.each([
    ['get', '/api/orders/admin/all'],
    ['get', `/api/orders/admin/${orderId}`],
    ['patch', `/api/orders/${orderId}/fulfillment`],
    ['post', `/api/orders/${orderId}/resolve-delivery-issue`],
  ] as const)('denies customer admin route %s %s', async (method, path) => {
    const response = await request(app.getHttpServer())
      [method](path)
      .set('Authorization', 'Bearer owner')
      .send({})
    expect(response.status).toBe(403)
    expect(repository.mutate).not.toHaveBeenCalled()
  })

  it('passes authenticated owner identity, page bounds and the existing success envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/orders?page=2&limit=5')
      .set('Authorization', 'Bearer owner')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: { orders: [], total: 0 },
      message: '',
    })
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5 }),
      ownerId,
    )
  })

  it('routes static admin endpoints before dynamic UUID routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/orders/admin/all')
      .set('Authorization', 'Bearer admin')
    expect(response.status).toBe(200)
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    )
  })

  it.each([
    {},
    { ...validPayload, shipping: null },
    { ...validPayload, shipping: [] },
    { ...validPayload, shipping: [validPayload.shipping] },
    { ...validPayload, items: [validPayload.items[0], []] },
    { ...validPayload, payment_method: 'gcash' },
    { ...validPayload, total_amount: 1 },
    { ...validPayload, user_id: otherId },
    { ...validPayload, items: [{ ...validPayload.items[0], quantity: 0 }] },
    { ...validPayload, items: [{ ...validPayload.items[0], quantity: 1.5 }] },
  ])(
    'rejects incomplete, unsupported or forged checkout payload',
    async (payload) => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer owner')
        .send(payload)
      expect(response.status).toBe(400)
      expect(repository.create).not.toHaveBeenCalled()
    },
  )

  it('creates COD orders under the signed-in user and returns 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', 'Bearer owner')
      .send(validPayload)
    expect(response.status).toBe(201)
    expect(repository.create).toHaveBeenCalledWith(
      ownerId,
      expect.objectContaining({ payment_method: 'cod' }),
    )
  })

  it.each([
    { status: 'completed', expected_version: 0 },
    { status: 'processing' },
    { status: 'processing', expected_version: -1 },
    {
      status: 'processing',
      expected_version: 0,
      delivery_confirmed_at: '2026-01-01',
    },
  ])(
    'rejects invalid admin mutation or forged customer confirmation',
    async (payload) => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/fulfillment`)
        .set('Authorization', 'Bearer admin')
        .send(payload)
      expect(response.status).toBe(400)
      expect(repository.mutate).not.toHaveBeenCalled()
    },
  )

  it('returns hidden 404 for foreign owner reads and confirmations', async () => {
    repository.findDetail.mockRejectedValue(
      new NotFoundException('Order not found'),
    )
    repository.mutate.mockRejectedValue(
      new NotFoundException('Order not found'),
    )
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/orders/${orderId}`)
          .set('Authorization', 'Bearer other')
      ).status,
    ).toBe(404)
    expect(
      (
        await request(app.getHttpServer())
          .post(`/api/orders/${orderId}/confirm-receipt`)
          .set('Authorization', 'Bearer other')
          .send({ expected_version: 4 })
      ).status,
    ).toBe(404)
    expect(repository.findDetail).toHaveBeenCalledWith(orderId, otherId)
    expect(repository.mutate).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({ id: otherId }),
      'confirm_receipt',
      4,
      {},
    )
  })

  it.each([
    '/api/orders?limit=1000',
    '/api/orders?page=0',
    '/api/orders?fulfillment_status=made_up',
    '/api/orders/not-a-uuid',
  ])('validates bounded list and UUID input %s', async (path) => {
    expect(
      (
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', 'Bearer owner')
      ).status,
    ).toBe(400)
  })
})
