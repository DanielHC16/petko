import { Module } from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsRepository } from './analytics.repository'
import { AnalyticsService } from './analytics.service'
import { OptionalAuthGuard } from './optional-auth.guard'

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRepository,
    OptionalAuthGuard,
    AuthGuard,
  ],
})
export class AnalyticsModule {}
