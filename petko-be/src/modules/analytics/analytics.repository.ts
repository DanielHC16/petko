import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import type { RecordAnalyticsEventDto } from './dto/record-analytics-event.dto'
import type { AnalyticsReport } from './analytics.types'

@Injectable()
export class AnalyticsRepository {
  private readonly logger = new Logger(AnalyticsRepository.name)

  constructor(private readonly supabase: SupabaseService) {}

  async record(
    event: RecordAnalyticsEventDto,
    actor?: UserProfile,
  ): Promise<boolean> {
    const { data, error } = await this.supabase.admin
      .rpc('petko_record_analytics_event', {
        p_session_id: event.session_id,
        p_event_id: event.event_id,
        p_page: event.page,
        p_actor_id: actor?.id ?? null,
        p_is_admin: actor?.role === 'admin',
      })
      .returns<boolean>()
    if (error) this.fail(error)
    if (typeof data !== 'boolean') this.unavailable()
    return data
  }

  async report(start: string, end: string): Promise<AnalyticsReport> {
    const { data, error } = await this.supabase.admin
      .rpc('petko_admin_analytics', { p_start: start, p_end: end })
      // Normalize the shared untyped client's array inference for this scalar JSON RPC.
      .returns<unknown>()
      .overrideTypes<AnalyticsReport, { merge: false }>()
    if (error) this.fail(error)
    if (!data) this.unavailable()
    return data
  }

  private fail(error: PostgrestError): never {
    if (error.code === 'P4000')
      throw new BadRequestException(
        'Check the analytics request and try again.',
      )
    if (error.code === 'P4094')
      throw new ConflictException(
        'Start a new analytics session and try again.',
      )
    this.logger.error(`Analytics database request failed: ${error.code}`)
    return this.unavailable()
  }

  private unavailable(): never {
    throw new InternalServerErrorException(
      'Analytics are unavailable. Please try again later.',
    )
  }
}
