import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

export class ReviewPageDto {
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
  limit: number = 10
}

export class AdminReviewPageDto extends ReviewPageDto {
  limit: number = 20

  @IsOptional()
  @IsIn(['all', 'visible', 'hidden'])
  visibility: 'all' | 'visible' | 'hidden' = 'all'
}

export class ReviewContextDto {
  @IsOptional()
  @IsUUID('4')
  order_id?: string
}

export class SaveReviewDto {
  @IsUUID('4')
  order_item_id!: string

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  comment?: string

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expected_version?: number
}

export class ReviewVersionQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expected_version!: number
}

export class ReviewVisibilityDto {
  @IsBoolean()
  is_hidden!: boolean

  @IsInt()
  @Min(0)
  @Max(2147483646)
  expected_version!: number
}
