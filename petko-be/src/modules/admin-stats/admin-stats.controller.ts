import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { AdminStatsService, type AdminStats } from './admin-stats.service'

/** Admin dashboard counts. */
@Controller('admin/stats')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  async getStats(): Promise<AdminStats> {
    return this.stats.getStats()
  }
}
