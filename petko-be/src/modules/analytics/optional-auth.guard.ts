import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import type { Request } from 'express'
import { AuthGuard } from '@/common/guards/auth.guard'

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    if (request.headers.authorization === undefined) return true
    return this.auth.canActivate(context)
  }
}
