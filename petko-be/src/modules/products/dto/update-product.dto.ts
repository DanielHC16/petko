import {
  IsString,
  IsNumber,
  IsIn,
  IsBoolean,
  Min,
  IsOptional,
} from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @IsOptional()
  @Type(() => Number)
  price?: number

  @IsNumber()
  @Min(0, { message: 'Stock must be greater than or equal to 0' })
  @IsOptional()
  @Type(() => Number)
  stock?: number

  @IsString()
  @IsOptional()
  category?: string

  @IsIn(['cat', 'dog', 'both'], {
    message: 'Pet type must be "cat", "dog", or "both"',
  })
  @IsOptional()
  pet_type?: 'cat' | 'dog' | 'both'

  @IsString()
  @IsOptional()
  image_url?: string

  @IsBoolean()
  @IsOptional()
  is_active?: boolean
}
