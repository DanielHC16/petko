import { SetMetadata } from '@nestjs/common'

export type Role = 'admin' | 'customer'

export const ROLES_KEY = 'roles'

/**
 * @Roles('admin') — restricts a controller or handler to users with the given role(s).
 * Must be used together with RolesGuard (and AuthGuard must run first to populate request.user).
 *
 * @example
 * @UseGuards(AuthGuard, RolesGuard)
 * @Roles('admin')
 * @Controller('admin/products')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
