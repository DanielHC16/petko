import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import type { CreateOrderDto } from './dto/create-order.dto'
import type { OrderListQueryDto } from './dto/order-list-query.dto'
import type {
  OrderAction,
  OrderDetail,
  OrderEvent,
  OrderList,
  OrderSummary,
} from './orders.types'

const SUMMARY_SELECT =
  'id,user_id,status,fulfillment_status,tracking_version,total_amount,subtotal_amount,shipping_fee,payment_method,payment_simulated,delivery_method,created_at,updated_at,delivery_confirmed_at,courier_name,tracking_number,delivery_issue,shipping,items:order_items(id,product_id,product_name,image_url,quantity,unit_price)'

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name)

  constructor(private readonly supabase: SupabaseService) {}

  async list(query: OrderListQueryDto, userId?: string): Promise<OrderList> {
    let builder = this.supabase.admin
      .from('orders')
      .select(SUMMARY_SELECT, { count: 'exact' })
    if (userId) builder = builder.eq('user_id', userId)
    if (query.fulfillment_status)
      builder = builder.eq('fulfillment_status', query.fulfillment_status)
    if (query.unresolved_only === 'true')
      builder = builder
        .not('delivery_issue', 'is', null)
        .is('delivery_issue->>resolved_at', null)
    const { data, error, count } = await builder
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range((query.page - 1) * query.limit, query.page * query.limit - 1)
      .returns<OrderSummary[]>()
    if (error) this.fail(error)
    return {
      orders: data ?? [],
      total: count ?? 0,
      page: query.page,
      limit: query.limit,
    }
  }

  async findDetail(id: string, userId?: string): Promise<OrderDetail> {
    let builder = this.supabase.admin
      .from('orders')
      .select(SUMMARY_SELECT)
      .eq('id', id)
    if (userId) builder = builder.eq('user_id', userId)
    const { data, error } = await builder.maybeSingle<OrderSummary>()
    if (error) this.fail(error)
    if (!data) throw new NotFoundException('Order not found')
    const { data: events, error: eventsError } = await this.supabase.admin
      .from('order_tracking_events')
      .select(
        'id,version,event_type,from_status,to_status,actor_role,created_at,note',
      )
      .eq('order_id', id)
      .lte('version', data.tracking_version)
      .order('version', { ascending: true })
      .returns<OrderEvent[]>()
    if (eventsError) this.fail(eventsError)
    return { ...data, events: events ?? [] }
  }

  async create(userId: string, payload: CreateOrderDto): Promise<OrderDetail> {
    const { data, error } = await this.supabase.admin
      .rpc('petko_create_order', { p_user_id: userId, p_payload: payload })
      .returns<string>()
    if (error) this.fail(error)
    if (typeof data !== 'string')
      throw new InternalServerErrorException(
        'Could not save the order. Please try again.',
      )
    return this.findDetail(data, userId)
  }

  async mutate(
    id: string,
    actor: UserProfile,
    action: OrderAction,
    expectedVersion: number,
    payload: Record<string, unknown>,
  ): Promise<OrderDetail> {
    const { error } = await this.supabase.admin.rpc('petko_mutate_order', {
      p_order_id: id,
      p_actor_id: actor.id,
      p_actor_role: actor.role,
      p_action: action,
      p_expected_version: expectedVersion,
      p_payload: payload,
    })
    if (error) this.fail(error)
    return this.findDetail(
      id,
      action === 'fulfillment' ||
        action === 'resolve_issue' ||
        (action === 'cancel' && actor.role === 'admin')
        ? undefined
        : actor.id,
    )
  }

  private fail(error: PostgrestError): never {
    // SQL uses fixed codes so private database messages never enter responses.
    if (error.code === 'P4040') throw new NotFoundException('Order not found')
    if (error.code === 'P4090')
      throw new ConflictException(
        'The order has changed. Refresh it and try again.',
      )
    if (error.code === 'P4091')
      throw new ConflictException(
        'This order action is no longer available. Refresh the order.',
      )
    if (error.code === 'P4092')
      throw new ConflictException(
        'Some items are unavailable or do not have enough stock. Update your cart and try again.',
      )
    if (error.code === 'P4093')
      throw new ConflictException(
        'This checkout request was already used with different details. Start a new checkout.',
      )
    if (error.code === 'P4000')
      throw new BadRequestException('Check the order details and try again.')
    this.logger.error(`Orders database request failed: ${error.code}`)
    throw new InternalServerErrorException(
      'Could not load or update the order. Please try again.',
    )
  }
}
