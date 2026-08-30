import { IsIn } from 'class-validator'
import type { Role } from '@/common/decorators/roles.decorator'

export class UpdateUserRoleDto {
  @IsIn(['admin', 'customer'], {
    message: 'Role must be either "admin" or "customer"',
  })
  role!: Role
}
