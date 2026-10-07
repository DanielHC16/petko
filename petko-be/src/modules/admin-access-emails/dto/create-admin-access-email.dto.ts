import { Transform } from 'class-transformer'
import { IsEmail, MaxLength } from 'class-validator'
import { normalizeEmail } from '@/common/utils/email.util'

export class CreateAdminAccessEmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254, { message: 'Email must be at most 254 characters' })
  email!: string
}
