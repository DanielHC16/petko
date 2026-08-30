import { IsEmail, IsIn, IsOptional } from 'class-validator'
import type { Role } from '@/common/decorators/roles.decorator'

export class PromoteUserDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string

  @IsOptional()
  @IsIn(['admin', 'customer'], {
    message: 'Role must be either "admin" or "customer"',
  })
  role?: Role
}
