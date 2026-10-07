import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY, type Role } from '@/common/decorators/roles.decorator'
import type { AuthenticatedRequest } from '@/common/types/authenticated-request.type'

/**
 * RolesGuard — checks that request.user.role matches one of the required roles.
 * Must run AFTER AuthGuard (which populates request.user).
 *
 * If no @Roles() decorator is present on the handler or class, access is granted.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    const userRole = request.user?.role

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      )
    }

    return true
  }
}
