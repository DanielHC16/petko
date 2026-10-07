import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  // CORS — allow requests from the Vite dev server
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  })

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

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)
  console.log(`🐾 Petko API running on http://localhost:${port}`)
}

void bootstrap()
