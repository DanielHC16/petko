import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { AnalyticsRepository } from './analytics.repository'
import { AnalyticsService } from './analytics.service'

const customer: UserProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'customer@example.invalid',
  full_name: 'Customer',
  avatar_url: '',
  role: 'customer',
  tos_accepted: false,
}
const event = {
  session_id: '00000000-0000-4000-8000-000000000002',
  event_id: '00000000-0000-4000-8000-000000000003',
  page: 'login' as const,
}

describe('AnalyticsService', () => {
  let service: AnalyticsService
  const repository = { record: jest.fn(), report: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T16:15:00Z'))
    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: repository },
      ],
    }).compile()
    service = module.get(AnalyticsService)
    repository.record.mockResolvedValue(true)
  })

  afterEach(() => jest.useRealTimers())

  it('defaults to 30 calendar dates in Manila independently of server timezone', async () => {
    await service.report({})
    expect(repository.report).toHaveBeenCalledWith('2026-10-13', '2026-11-11')
  })

  it('allows leap dates and a 366-day inclusive window', async () => {
    await service.report({ start: '2024-02-29', end: '2025-02-28' })
    expect(repository.report).toHaveBeenCalledWith('2024-02-29', '2025-02-28')
  })

  it.each([
    { start: '2026-11-01' },
    { end: '2026-11-01' },
    { start: '2026-02-29', end: '2026-03-01' },
    { start: '2026-11-02', end: '2026-11-01' },
    { start: '2026-11-01', end: '2026-11-12' },
    { start: '2024-01-01', end: '2025-01-01' },
    { start: '0000-01-01', end: '0000-01-01' },
    { start: '2026-1-01', end: '2026-01-01' },
  ])(
    'rejects an invalid report range before accessing the database',
    async (query) => {
      await expect(service.report(query)).rejects.toThrow(BadRequestException)
      expect(repository.report).not.toHaveBeenCalled()
    },
  )

  it('accepts only login views from guests', async () => {
    expect(await service.record(event)).toEqual({ accepted: true })
    expect(repository.record).toHaveBeenCalledWith(event, undefined)
    await expect(service.record({ ...event, page: 'catalog' })).rejects.toThrow(
      BadRequestException,
    )
    await expect(
      service.record({ ...event, page: 'identify' }),
    ).rejects.toThrow(BadRequestException)
  })

  it('passes only the verified actor, including admins so earlier guest traffic is excluded', async () => {
    const admin = { ...customer, role: 'admin' as const }
    repository.record.mockResolvedValue(false)
    expect(await service.record({ ...event, page: 'identify' }, admin)).toEqual(
      {
        accepted: false,
      },
    )
    expect(repository.record).toHaveBeenCalledWith(
      { ...event, page: 'identify' },
      admin,
    )
  })
})
