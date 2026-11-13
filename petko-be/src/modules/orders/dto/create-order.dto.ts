import { Type } from 'class-transformer'
import { OrderShippingDto } from '@/common/dto/order-shipping.dto'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateOrderItemDto {
  @IsUUID()
  product_id!: string

  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number
}

export class CreateOrderDto {
  @IsUUID()
  checkout_request_id!: string

  @IsArray()
  @IsObject({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping!: OrderShippingDto

  @IsIn(['standard', 'express'])
  delivery_method!: 'standard' | 'express'

  @IsIn(['cod', 'gcash', 'maya', 'card'])
  payment_method!: 'cod' | 'gcash' | 'maya' | 'card'

  @IsOptional()
  @IsIn(['cart', 'direct'])
  checkout_source?: 'cart' | 'direct'
}
