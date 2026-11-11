import { Test } from '@nestjs/testing'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { ROLES_KEY } from '@/common/decorators/roles.decorator'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { OptionalAuthGuard } from './optional-auth.guard'

describe('AnalyticsController', () => {
  let controller: AnalyticsController
  const service = { record: jest.fn(), report: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: service }],
    })
      .overrideGuard(OptionalAuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .compile()
    controller = module.get(AnalyticsController)
  })

  it('requires effective admin authorization on reports and optional auth on capture', () => {
    const report = Object.getOwnPropertyDescriptor(
      AnalyticsController.prototype,
      'report',
    )?.value as object
    const record = Object.getOwnPropertyDescriptor(
      AnalyticsController.prototype,
      'record',
    )?.value as object
    expect(Reflect.getMetadata(GUARDS_METADATA, report)).toEqual([
      AuthGuard,
      RolesGuard,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, report)).toEqual(['admin'])
    expect(Reflect.getMetadata(GUARDS_METADATA, record)).toEqual([
      OptionalAuthGuard,
    ])
  })

  it('forwards validated input without business logic or database calls', async () => {
    const query = { start: '2026-10-01', end: '2026-10-31' }
    const event = {
      session_id: 'session',
      event_id: 'event',
      page: 'login' as const,
    }
    service.record.mockResolvedValue({ accepted: true })
    await controller.report(query)
    expect(service.report).toHaveBeenCalledWith(query)
    expect(await controller.record(event)).toEqual({ accepted: true })
    expect(service.record).toHaveBeenCalledWith(event, undefined)
  })
})
