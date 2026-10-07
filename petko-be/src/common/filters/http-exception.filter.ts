import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'

export interface ErrorResponse {
  success: false
  statusCode: number
  message: string
  errors: unknown[]
}

/**
 * HttpExceptionFilter — catches all exceptions and formats them into
 * the standard Petko error envelope: { success, statusCode, message, errors }.
 *
 * Registered globally in main.ts — do NOT register per-module.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error'

    // Extract field-level validation errors from class-validator
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    const errors: unknown[] =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as Record<string, unknown>).message)
        ? (exceptionResponse as Record<string, unknown[]>).message
        : []

    if (status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(exception)
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      errors,
    }

    response.status(status).json(errorResponse)
  }
}
