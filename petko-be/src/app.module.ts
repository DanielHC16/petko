import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { envValidationSchema } from './config/env.validation'
import { SupabaseModule } from './supabase/supabase.module'
import { UsersModule } from './modules/users/users.module'
import { ProductsModule } from './modules/products/products.module'

@Module({
  imports: [
    // Config — loads .env and validates against Joi schema
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    // Supabase — @Global(), available everywhere via DI
    SupabaseModule,

    // Feature modules
    UsersModule,
    ProductsModule,
  ],
})
export class AppModule {}
