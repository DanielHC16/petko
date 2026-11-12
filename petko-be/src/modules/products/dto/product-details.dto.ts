import { Transform, Type } from 'class-transformer'
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

function trimValue({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value
}

/** Only these five dimensions may describe a sellable variation. */
export class VariantAttributesDto {
  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 100)
  size?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 100)
  color?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 100)
  weight_volume?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 100)
  flavor_scent?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 100)
  style?: string
}

/** Optional additions shared by create and patch; old product requests remain valid. */
export class ProductDetailsDto {
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(240)
  parent_product_name?: string

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => VariantAttributesDto)
  variant_attributes?: VariantAttributesDto

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  ingredients_materials?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  guaranteed_analysis?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  usage_instructions?: string

  @Transform(trimValue)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  safety_warnings?: string
}
