import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderListQueryDto } from './dto/order-list-query.dto'
import {
  CancelOrderDto,
  OrderVersionDto,
  ReportDeliveryIssueDto,
  ResolveDeliveryIssueDto,
  UpdateFulfillmentDto,
} from './dto/update-order.dto'
import type { OrderDetail, OrderList } from './orders.types'

@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(
    @CurrentUser() user: UserProfile,
    @Query() query: OrderListQueryDto,
  ): Promise<OrderList> {
    return this.orders.listMine(user, query)
  }

  @Get('admin/all')
  @Roles('admin')
  async listAdmin(@Query() query: OrderListQueryDto): Promise<OrderList> {
    return this.orders.listAdmin(query)
  }

  @Get('admin/:id')
  @Roles('admin')
  async detailAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetail> {
    return this.orders.detailAdmin(id)
  }

  @Get(':id')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.detailMine(id, user)
  }

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.create(user, dto)
  }

  @Patch(':id/fulfillment')
  @Roles('admin')
  async updateFulfillment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFulfillmentDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.updateFulfillment(id, user, dto)
  }

  @Post(':id/confirm-receipt')
  async confirmReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderVersionDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.confirmReceipt(id, user, dto)
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.cancel(id, user, dto)
  }

  @Post(':id/delivery-issue')
  async reportIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportDeliveryIssueDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.reportIssue(id, user, dto)
  }

  @Post(':id/resolve-delivery-issue')
  @Roles('admin')
  async resolveIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDeliveryIssueDto,
    @CurrentUser() user: UserProfile,
  ): Promise<OrderDetail> {
    return this.orders.resolveIssue(id, user, dto)
  }
}
