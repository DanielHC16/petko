import { Test } from '@nestjs/testing'
import { HttpException, Logger } from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import { AnalyticsRepository } from './analytics.repository'

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository
  const rpc = jest.fn()
  const result = jest.fn()
  const event = {
    session_id: 'session',
    event_id: 'event',
    page: 'login' as const,
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    rpc.mockImplementation((name: string) => ({
      returns:
        name === 'petko_admin_analytics'
          ? (): { overrideTypes: typeof result } => ({ overrideTypes: result })
          : result,
    }))
    const module = await Test.createTestingModule({
      providers: [
        AnalyticsRepository,
        { provide: SupabaseService, useValue: { admin: { rpc } } },
      ],
    }).compile()
    repository = module.get(AnalyticsRepository)
  })

  it('sends absent identity explicitly and uses the service-only RPC', async () => {
    result.mockResolvedValue({ data: true, error: null })
    expect(await repository.record(event)).toBe(true)
    expect(rpc).toHaveBeenCalledWith('petko_record_analytics_event', {
      p_session_id: 'session',
      p_event_id: 'event',
      p_page: 'login',
      p_actor_id: null,
      p_is_admin: false,
    })
  })

  it('derives admin exclusion from the authenticated server profile', async () => {
    result.mockResolvedValue({ data: false, error: null })
    expect(
      await repository.record(event, {
        id: 'admin',
        role: 'admin',
        email: 'admin@example.invalid',
        full_name: '',
        avatar_url: '',
      }),
    ).toBe(false)
    expect(rpc).toHaveBeenCalledWith(
      'petko_record_analytics_event',
      expect.objectContaining({ p_actor_id: 'admin', p_is_admin: true }),
    )
  })

  it('returns one database-aggregated object rather than fetching capped rows', async () => {
    const report = { summary: { placedOrders: 1004 } }
    result.mockResolvedValue({ data: report, error: null })
    expect(await repository.report('2026-10-01', '2026-10-31')).toBe(report)
    expect(rpc).toHaveBeenCalledWith('petko_admin_analytics', {
      p_start: '2026-10-01',
      p_end: '2026-10-31',
    })
  })

  it.each([
    ['P4000', 400],
    ['P4094', 409],
    ['PGRST202', 500],
    ['42P01', 500],
    ['XX000', 500],
  ])('maps database error %s safely to HTTP %s', async (code, status) => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {})
    result.mockResolvedValue({
      data: null,
      error: { code, message: 'PRIVATE database detail' },
    })
    try {
      await repository.report('2026-10-01', '2026-10-31')
      throw new Error('Expected HTTP error')
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpException)
      expect((err as HttpException).getStatus()).toBe(status)
      expect((err as HttpException).message).not.toContain('PRIVATE')
      expect(log.mock.calls.flat().join(' ')).not.toContain('PRIVATE')
    } finally {
      log.mockRestore()
    }
  })

  it('fails safely when the RPC returns no usable result', async () => {
    result.mockResolvedValue({ data: null, error: null })
    await expect(repository.record(event)).rejects.toThrow(
      'Analytics are unavailable',
    )
    await expect(repository.report('2026-10-01', '2026-10-31')).rejects.toThrow(
      'Analytics are unavailable',
    )
  })
})
