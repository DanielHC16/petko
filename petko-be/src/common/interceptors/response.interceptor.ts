import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, map } from 'rxjs'

interface SuccessResponse<T> {
  success: true
  data: T | null
  message: string
}

/**
 * ResponseInterceptor — wraps all successful controller return values
 * in the standard Petko response envelope: { success, data, message }.
 *
 * Registered globally in main.ts — do NOT register per-module.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        message: '',
      })),
    )
  }
}
