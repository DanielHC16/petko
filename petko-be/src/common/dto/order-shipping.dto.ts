import { Transform } from 'class-transformer'
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
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
