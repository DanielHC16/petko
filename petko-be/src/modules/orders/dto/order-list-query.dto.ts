import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
import { FULFILLMENT_STATUSES, type FulfillmentStatus } from '../orders.types'

export class OrderListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20

  @IsOptional()
  @IsIn(FULFILLMENT_STATUSES)
  fulfillment_status?: FulfillmentStatus

  @IsOptional()
  @IsIn(['true', 'false'])
  unresolved_only?: 'true' | 'false'
}
