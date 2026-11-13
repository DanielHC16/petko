import { BadRequestException, Injectable } from '@nestjs/common'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { AnalyticsRepository } from './analytics.repository'
import type { AnalyticsQueryDto } from './dto/analytics-query.dto'
import type { RecordAnalyticsEventDto } from './dto/record-analytics-event.dto'
import type { AnalyticsReport } from './analytics.types'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async record(
    event: RecordAnalyticsEventDto,
    actor?: UserProfile,
  ): Promise<{ accepted: boolean }> {
    if (!actor && !['login', 'catalog', 'product'].includes(event.page))
      throw new BadRequestException(
        'Anonymous analytics only accepts public store views.',
      )
    return { accepted: await this.repository.record(event, actor) }
  }

  async report(query: AnalyticsQueryDto): Promise<AnalyticsReport> {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    let { start, end } = query
    if (start === undefined && end === undefined) {
      end = today
      start = new Date(new Date(`${today}T00:00:00Z`).getTime() - 29 * DAY_MS)
        .toISOString()
        .slice(0, 10)
    }
    if (!start || !end || !this.validDate(start) || !this.validDate(end))
      throw new BadRequestException(
        'Provide valid start and end dates (YYYY-MM-DD).',
      )
    if (start > end || end > today)
      throw new BadRequestException(
        'Choose dates in order, ending today or earlier.',
      )
    if ((Date.parse(end) - Date.parse(start)) / DAY_MS > 365)
      throw new BadRequestException('Choose a date range of at most 366 days.')
    return this.repository.report(start, end)
  }

  private validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-'))
      return false
    const date = new Date(`${value}T00:00:00Z`)
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    )
  }
}
