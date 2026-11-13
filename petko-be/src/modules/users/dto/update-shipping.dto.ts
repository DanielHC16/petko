import { Type } from 'class-transformer'
import {
  IsDefined,
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { OrderShippingDto } from '@/common/dto/order-shipping.dto'

export class UpdateShippingDto {
  @ValidateIf((_object: unknown, value: unknown): boolean => value !== null)
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OrderShippingDto)
  saved_shipping!: OrderShippingDto | null
}
