import { Module } from '@nestjs/common'
import { ProductsModule } from '@/modules/products/products.module'
import { UsersModule } from '@/modules/users/users.module'
import { AdminAccessEmailsModule } from '@/modules/admin-access-emails/admin-access-emails.module'
import { AdminStatsController } from './admin-stats.controller'
import { AdminStatsService } from './admin-stats.service'

@Module({
  imports: [ProductsModule, UsersModule, AdminAccessEmailsModule],
  controllers: [AdminStatsController],
  providers: [AdminStatsService],
})
export class AdminStatsModule {}
