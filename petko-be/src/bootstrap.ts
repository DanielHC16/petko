import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import {
  ExpressAdapter,
  type NestExpressApplication,
} from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

/** Every route is served under this prefix, locally and on Vercel. */
export const API_PREFIX = 'api'

/**
 * Applies the global app setup shared by local dev (`main.ts`) and the
 * Vercel serverless handler (`serverless.ts`). Add new global middleware,
 * pipes, filters or interceptors here only, so the two never diverge.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService)

  app.setGlobalPrefix(API_PREFIX)
  app.disable('x-powered-by')

  // CORS is only needed when the frontend is served from another origin.
  // On Vercel the frontend and API share one origin, so FRONTEND_URL stays unset.
  const origin = config.get<string>('FRONTEND_URL')
  if (origin) {
    app.enableCors({ origin, credentials: false })
  }

  // Global validation — strips unknown fields, enforces DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Global exception formatting
  app.useGlobalFilters(new HttpExceptionFilter())

  // Global success response wrapping
  app.useGlobalInterceptors(new ResponseInterceptor())
}

/** Creates the Nest app on the Express adapter with the shared configuration. */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
  )
  configureApp(app)
  return app
}
