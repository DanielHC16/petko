import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type {
  AuthenticatedRequest,
  UserProfile,
} from '@/common/types/authenticated-request.type'

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 * Requires AuthGuard to have run first.
 *
 * @example
 * @Get('me')
 * @UseGuards(AuthGuard)
 * getMe(@CurrentUser() user: UserProfile) {
 *   return user
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserProfile => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    return request.user
  },
)
