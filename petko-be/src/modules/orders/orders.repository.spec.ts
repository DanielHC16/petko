import { Test } from '@nestjs/testing'
import { HttpException, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import { createSupabaseQueryMock } from '@/common/testing/supabase-query.mock'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { OrdersRepository } from './orders.repository'
import { OrderListQueryDto } from './dto/order-list-query.dto'
import type { CreateOrderDto } from './dto/create-order.dto'

describe('OrdersRepository', () => {
  let repository: OrdersRepository
  let queries: ReturnType<typeof createSupabaseQueryMock>
  const rpc = jest.fn()

  beforeEach(async () => {
    jest.clearAllMocks()
    queries = createSupabaseQueryMock()
    const module = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        {
          provide: SupabaseService,
          useValue: { admin: { from: queries.from, rpc } },
        },
      ],
    }).compile()
    repository = module.get(OrdersRepository)
  })

  it('bounds and scopes lists and orders tied timestamps by id', async () => {
    queries.queue('orders', { data: [], error: null, count: 21 })
    const result = await repository.list(
      { ...new OrderListQueryDto(), page: 2, limit: 10 },
      'owner',
    )
    expect(result).toEqual({ orders: [], total: 21, page: 2, limit: 10 })
    expect(queries.queries[0].argsOf('eq')).toEqual(['user_id', 'owner'])
    expect(queries.queries[0].argsOf('range')).toEqual([10, 19])
    expect(
      queries.queries[0].calls
        .filter((c) => c.method === 'order')
        .map((c) => c.args[0]),
    ).toEqual(['created_at', 'id'])
  })

  it('returns a hidden 404 for foreign/missing orders without querying their history', async () => {
    queries.queue('orders', { data: null })
    await expect(repository.findDetail('order', 'owner')).rejects.toThrow(
      NotFoundException,
    )
    expect(
      queries.queries[0].calls
        .filter((c) => c.method === 'eq')
        .map((c) => c.args),
    ).toEqual([
      ['id', 'order'],
      ['user_id', 'owner'],
    ])
    expect(queries.from).toHaveBeenCalledTimes(1)
  })

  it('reads event history only after an owner-scoped order lookup', async () => {
    queries.queue('orders', {
      data: { id: 'order', user_id: 'owner', tracking_version: 4 },
    })
    queries.queue('order_tracking_events', { data: [] })
    expect(await repository.findDetail('order', 'owner')).toEqual({
      id: 'order',
      user_id: 'owner',
      tracking_version: 4,
      events: [],
    })
    expect(queries.queries[1].argsOf('eq')).toEqual(['order_id', 'order'])
    expect(queries.queries[1].argsOf('lte')).toEqual(['version', 4])
    expect(queries.queries[1].argsOf('order')).toEqual([
      'version',
      { ascending: true },
    ])
  })

  it.each([
    ['P4040', 404],
    ['P4090', 409],
    ['P4091', 409],
    ['P4092', 409],
    ['P4093', 409],
    ['P4000', 400],
    ['XX000', 500],
  ])('maps SQL code %s to a safe HTTP error', async (code, status) => {
    rpc.mockReturnValue({
      returns: jest.fn().mockResolvedValue({
        data: null,
        error: { code, message: 'PRIVATE database error details' },
      }),
    })
    try {
      await repository.create('owner', {} as CreateOrderDto)
      throw new Error('Expected an HTTP error')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException)
      if (!(error instanceof HttpException)) throw error
      expect(error.getStatus()).toBe(status)
      expect(error.message).not.toContain('PRIVATE')
    }
  })

  it('propagates the authenticated actor and version into one atomic mutation', async () => {
    rpc.mockResolvedValue({ data: 'order', error: null })
    queries.queue('orders', { data: { id: 'order' } })
    queries.queue('order_tracking_events', { data: [] })
    const owner: UserProfile = {
      id: 'owner',
      email: 'owner@example.invalid',
      full_name: '',
      avatar_url: '',
      role: 'customer',
    }
    await repository.mutate('order', owner, 'confirm_receipt', 4, {})
    expect(rpc).toHaveBeenCalledWith('petko_mutate_order', {
      p_order_id: 'order',
      p_actor_id: 'owner',
      p_actor_role: 'customer',
      p_action: 'confirm_receipt',
      p_expected_version: 4,
      p_payload: {},
    })
    expect(
      queries.queries[0].calls
        .filter((c) => c.method === 'eq')
        .map((c) => c.args),
    ).toContainEqual(['user_id', 'owner'])
  })
})
