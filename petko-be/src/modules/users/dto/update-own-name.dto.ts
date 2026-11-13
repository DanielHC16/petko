import { Transform } from 'class-transformer'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateOwnNameDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  full_name!: string
}
