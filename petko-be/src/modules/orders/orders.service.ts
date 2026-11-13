import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { OrdersRepository } from './orders.repository'
import type { CreateOrderDto } from './dto/create-order.dto'
import type { OrderListQueryDto } from './dto/order-list-query.dto'
import type {
  CancelOrderDto,
  OrderVersionDto,
  ReportDeliveryIssueDto,
  ResolveDeliveryIssueDto,
  UpdateFulfillmentDto,
} from './dto/update-order.dto'
import type { OrderDetail, OrderList } from './orders.types'

@Injectable()
export class OrdersService {
  constructor(private readonly repository: OrdersRepository) {}

  async listMine(
    user: UserProfile,
    query: OrderListQueryDto,
  ): Promise<OrderList> {
    return this.repository.list(query, user.id)
  }

  async listAdmin(query: OrderListQueryDto): Promise<OrderList> {
    return this.repository.list(query)
  }

  async detailMine(id: string, user: UserProfile): Promise<OrderDetail> {
    return this.repository.findDetail(id, user.id)
  }

  async detailAdmin(id: string): Promise<OrderDetail> {
    return this.repository.findDetail(id)
  }

  async create(user: UserProfile, dto: CreateOrderDto): Promise<OrderDetail> {
    if (
      new Set(dto.items.map((item) => item.product_id)).size !==
      dto.items.length
    )
      throw new BadRequestException(
        'Each product may appear only once in an order',
      )
    return this.repository.create(user.id, {
      ...dto,
      shipping: {
        ...dto.shipping,
        address_line2: dto.shipping.address_line2 ?? '',
      },
      items: [...dto.items].sort((a, b) =>
        a.product_id.localeCompare(b.product_id),
      ),
    })
  }

  async updateFulfillment(
    id: string,
    user: UserProfile,
    dto: UpdateFulfillmentDto,
  ): Promise<OrderDetail> {
    this.requireAdmin(user)
    const { expected_version, ...payload } = dto
    return this.repository.mutate(
      id,
      user,
      'fulfillment',
      expected_version,
      payload,
    )
  }

  async confirmReceipt(
    id: string,
    user: UserProfile,
    dto: OrderVersionDto,
  ): Promise<OrderDetail> {
    return this.repository.mutate(
      id,
      user,
      'confirm_receipt',
      dto.expected_version,
      {},
    )
  }

  async cancel(
    id: string,
    user: UserProfile,
    dto: CancelOrderDto,
  ): Promise<OrderDetail> {
    return this.repository.mutate(id, user, 'cancel', dto.expected_version, {
      reason: dto.reason,
    })
  }

  async reportIssue(
    id: string,
    user: UserProfile,
    dto: ReportDeliveryIssueDto,
  ): Promise<OrderDetail> {
    return this.repository.mutate(
      id,
      user,
      'report_issue',
      dto.expected_version,
      { message: dto.message },
    )
  }

  async resolveIssue(
    id: string,
    user: UserProfile,
    dto: ResolveDeliveryIssueDto,
  ): Promise<OrderDetail> {
    this.requireAdmin(user)
    return this.repository.mutate(
      id,
      user,
      'resolve_issue',
      dto.expected_version,
      { resolution: dto.resolution },
    )
  }

  private requireAdmin(user: UserProfile): void {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can update fulfillment')
  }
}
