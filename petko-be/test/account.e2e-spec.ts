import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import type { ExecutionContext } from '@nestjs/common'
import { UnauthorizedException } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { configureApp } from '../src/bootstrap'
import { AuthGuard } from '../src/common/guards/auth.guard'
import type { AuthenticatedRequest } from '../src/common/types/authenticated-request.type'
import { UsersController } from '../src/modules/users/users.controller'
import { UsersService } from '../src/modules/users/users.service'

describe('Self-service account HTTP contract', () => {
  let app: NestExpressApplication
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    full_name: 'Original',
    email: 'customer@example.invalid',
    avatar_url: '',
    role: 'customer' as const,
    tos_accepted: true,
  }
  const service = {
    updateOwnName: jest.fn(),
    deleteOwnAccount: jest.fn(),
    removeUser: jest.fn(),
    updateOwnShipping: jest.fn(),
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: service },
        {
          provide: ConfigService,
          useValue: { get: (): undefined => undefined },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
          if (req.headers.authorization !== 'Bearer owner')
            throw new UnauthorizedException()
          req.user = user
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
    service.updateOwnName.mockResolvedValue({ ...user, full_name: 'New Name' })
    service.deleteOwnAccount.mockResolvedValue({
      message: 'Your account has been permanently deleted.',
    })
  })
  afterAll(async () => app.close())

  it.each(['patch', 'delete'] as const)(
    'rejects anonymous %s account changes',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method]('/api/users/me')
        .send({ full_name: 'New' })
      expect(response.status).toBe(401)
      expect(service.updateOwnName).not.toHaveBeenCalled()
      expect(service.deleteOwnAccount).not.toHaveBeenCalled()
    },
  )

  it('updates only the signed-in profile with a trimmed name', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', 'Bearer owner')
      .send({ full_name: '  New Name  ' })
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: { full_name: 'New Name' },
    })
    expect(service.updateOwnName).toHaveBeenCalledWith(user, 'New Name')
  })

  it.each([
    {},
    { full_name: '' },
    { full_name: '   ' },
    { full_name: 'x'.repeat(121) },
    { full_name: 'New', role: 'admin' },
    { full_name: 'New', id: 'another-owner' },
  ])('rejects invalid names or forged ownership/roles: %j', async (payload) => {
    const response = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', 'Bearer owner')
      .send(payload)
    expect(response.status).toBe(400)
    expect(service.updateOwnName).not.toHaveBeenCalled()
  })

  it('routes self-deletion before the admin UUID route', async () => {
    const response = await request(app.getHttpServer())
      .delete('/api/users/me')
      .set('Authorization', 'Bearer owner')
    expect(response.status).toBe(200)
    expect(service.deleteOwnAccount).toHaveBeenCalledWith(user.id)
    expect(service.removeUser).not.toHaveBeenCalled()
  })

  it('clears saved shipping for only the authenticated owner', async () => {
    service.updateOwnShipping.mockResolvedValue({ saved_shipping: null })
    const response = await request(app.getHttpServer())
      .patch('/api/users/me/shipping')
      .set('Authorization', 'Bearer owner')
      .send({ saved_shipping: null })
    expect(response.status).toBe(200)
    expect(service.updateOwnShipping).toHaveBeenCalledWith(user.id, null)
  })

  it.each([
    {},
    { saved_shipping: {} },
    { saved_shipping: 'invalid' },
    { saved_shipping: null, user_id: 'another-user' },
  ])('validates shipping before saving metadata: %j', async (payload) => {
    const response = await request(app.getHttpServer())
      .patch('/api/users/me/shipping')
      .set('Authorization', 'Bearer owner')
      .send(payload)
    expect(response.status).toBe(400)
    expect(service.updateOwnShipping).not.toHaveBeenCalled()
  })
})
