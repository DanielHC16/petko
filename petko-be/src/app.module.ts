import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { envValidationSchema } from './config/env.validation'
import { SupabaseModule } from './supabase/supabase.module'
import { UsersModule } from './modules/users/users.module'
import { ProductsModule } from './modules/products/products.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    // Config — loads .env locally (never on Vercel) and validates against Joi schema
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: Boolean(process.env.VERCEL),
      validationSchema: envValidationSchema,
    }),

    // Supabase — @Global(), available everywhere via DI
    SupabaseModule,

    // Feature modules
    UsersModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
