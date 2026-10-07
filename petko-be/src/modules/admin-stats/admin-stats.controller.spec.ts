import { GUARDS_METADATA } from '@nestjs/common/constants'
import { ROLES_KEY } from '@/common/decorators/roles.decorator'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { AdminStatsController } from './admin-stats.controller'

describe('AdminStatsController', () => {
  it('is restricted to admins at class level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminStatsController)).toEqual([
      AuthGuard,
      RolesGuard,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, AdminStatsController)).toEqual([
      'admin',
    ])
  })
})
