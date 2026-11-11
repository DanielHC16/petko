import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { AnalyticsService } from './analytics.service'
import { OptionalAuthGuard } from './optional-auth.guard'
import { RecordAnalyticsEventDto } from './dto/record-analytics-event.dto'
import { AnalyticsQueryDto } from './dto/analytics-query.dto'
import type { AnalyticsReport } from './analytics.types'

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('analytics/events')
  @HttpCode(202)
  @UseGuards(OptionalAuthGuard)
  async record(
    @Body() event: RecordAnalyticsEventDto,
    @CurrentUser() actor?: UserProfile,
  ): Promise<{ accepted: boolean }> {
    return this.analytics.record(event, actor)
  }

  @Get('admin/analytics')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async report(@Query() query: AnalyticsQueryDto): Promise<AnalyticsReport> {
    return this.analytics.report(query)
  }
}
