import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { getEnvConfig } from './config/env.config'
import { SupabaseModule } from './supabase/supabase.module'
import { UsersModule } from './modules/users/users.module'
import { ProductsModule } from './modules/products/products.module'
import { AdminAccessEmailsModule } from './modules/admin-access-emails/admin-access-emails.module'
import { AdminStatsModule } from './modules/admin-stats/admin-stats.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { OrdersModule } from './modules/orders/orders.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { ReviewsModule } from './modules/reviews/reviews.module'

@Module({
  imports: [
    // Config — local overrides + pulled Vercel Development env; Joi validates both.
    ConfigModule.forRoot(getEnvConfig()),

    // Supabase — @Global(), available everywhere via DI
    SupabaseModule,

    // Feature modules
    UsersModule,
    ProductsModule,
    AdminAccessEmailsModule,
    AdminStatsModule,
    OrdersModule,
    AnalyticsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
