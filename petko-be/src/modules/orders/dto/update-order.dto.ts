import { Transform } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import type { AdminFulfillmentStatus } from '../orders.types'

export class OrderVersionDto {
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expected_version!: number
}

export class UpdateFulfillmentDto extends OrderVersionDto {
  @IsIn(['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'])
  status!: AdminFulfillmentStatus

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  courier_name?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  tracking_number?: string
}

export class ReportDeliveryIssueDto extends OrderVersionDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string
}

export class ResolveDeliveryIssueDto extends OrderVersionDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  resolution!: string
}

export class CancelOrderDto extends OrderVersionDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  reason?: string
}
