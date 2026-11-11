import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

function trimValue({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value
}

export class OrderShippingDto {
  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  full_name!: string

  @Transform(trimValue)
  @IsEmail()
  @MaxLength(254)
  email!: string

  @Transform(trimValue)
  @IsString()
  @Matches(/^(?:\+63|0)9\d{9}$/)
  phone!: string

  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  address_line1!: string

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address_line2?: string

  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string

  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  province!: string

  @IsString()
  @Matches(/^\d{4}$/)
  postal_code!: string
}

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

  @Equals('cod', { message: 'Only Cash on Delivery is currently available' })
  payment_method!: 'cod'
}
