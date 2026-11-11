import { Test } from '@nestjs/testing'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { OrdersRepository } from './orders.repository'
import { OrdersService } from './orders.service'
import { OrderListQueryDto } from './dto/order-list-query.dto'
import type { CreateOrderDto } from './dto/create-order.dto'

const owner: UserProfile = {
  id: 'owner',
  email: 'owner@example.invalid',
  full_name: 'Owner',
  avatar_url: '',
  role: 'customer',
  tos_accepted: false,
}
const admin: UserProfile = { ...owner, id: 'admin', role: 'admin' }
const payload: CreateOrderDto = {
  checkout_request_id: 'request',
  payment_method: 'cod',
  delivery_method: 'standard',
  shipping: {
    full_name: 'Owner',
    email: 'owner@example.invalid',
    phone: '09171234567',
    address_line1: 'Street',
    city: 'Manila',
    province: 'Metro Manila',
    postal_code: '1000',
  },
  items: [
    { product_id: 'b', quantity: 1 },
    { product_id: 'a', quantity: 2 },
  ],
}

describe('OrdersService', () => {
  let service: OrdersService
  const repository = {
    list: jest.fn(),
    findDetail: jest.fn(),
    create: jest.fn(),
    mutate: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: repository },
      ],
    }).compile()
    service = module.get(OrdersService)
  })

  it('always scopes storefront reads to the signed-in identity, including admins', async () => {
    const query = new OrderListQueryDto()
    await service.listMine(admin, query)
    await service.detailMine('order', admin)
    expect(repository.list).toHaveBeenCalledWith(query, admin.id)
    expect(repository.findDetail).toHaveBeenCalledWith('order', admin.id)
  })

  it('normalizes item order and missing address_line2 without accepting client identity or totals', async () => {
    await service.create(owner, payload)
    expect(repository.create).toHaveBeenCalledWith(owner.id, {
      ...payload,
      shipping: { ...payload.shipping, address_line2: '' },
      items: [
        { product_id: 'a', quantity: 2 },
        { product_id: 'b', quantity: 1 },
      ],
    })
    expect(payload.items[0].product_id).toBe('b')
  })

  it('rejects duplicate cart products before any reservation', async () => {
    await expect(
      service.create(owner, {
        ...payload,
        items: [
          { product_id: 'a', quantity: 1 },
          { product_id: 'a', quantity: 2 },
        ],
      }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('denies customer fulfillment changes and issue resolution even outside the HTTP guard', async () => {
    await expect(
      service.updateFulfillment('order', owner, {
        expected_version: 0,
        status: 'processing',
      }),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      service.resolveIssue('order', owner, {
        expected_version: 0,
        resolution: 'No',
      }),
    ).rejects.toThrow(ForbiddenException)
    expect(repository.mutate).not.toHaveBeenCalled()
  })

  it('passes actor and expected version into the atomic confirmation and report operations', async () => {
    await service.confirmReceipt('order', owner, { expected_version: 4 })
    await service.reportIssue('order', owner, {
      expected_version: 4,
      message: 'Not received',
    })
    expect(repository.mutate).toHaveBeenNthCalledWith(
      1,
      'order',
      owner,
      'confirm_receipt',
      4,
      {},
    )
    expect(repository.mutate).toHaveBeenNthCalledWith(
      2,
      'order',
      owner,
      'report_issue',
      4,
      { message: 'Not received' },
    )
  })

  it('admin resolution carries only the resolution note, never a receipt confirmation', async () => {
    await service.resolveIssue('order', admin, {
      expected_version: 5,
      resolution: 'Courier contacted',
    })
    expect(repository.mutate).toHaveBeenCalledWith(
      'order',
      admin,
      'resolve_issue',
      5,
      { resolution: 'Courier contacted' },
    )
  })
})
