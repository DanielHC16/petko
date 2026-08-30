import {
  IsString,
  IsNumber,
  IsIn,
  IsBoolean,
  Min,
  IsOptional,
  IsNotEmpty,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @Type(() => Number)
  price!: number

  @IsNumber()
  @Min(0, { message: 'Stock must be greater than or equal to 0' })
  @Type(() => Number)
  stock!: number

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category!: string

  @IsIn(['cat', 'dog', 'both'], {
    message: 'Pet type must be "cat", "dog", or "both"',
  })
  pet_type!: 'cat' | 'dog' | 'both'

  @IsString()
  @IsOptional()
  image_url?: string

  @IsBoolean()
  @IsOptional()
  is_active?: boolean
}
