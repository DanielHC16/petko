import { IsIn, IsUUID } from 'class-validator'
import { ANALYTICS_PAGES, type AnalyticsPage } from '../analytics.types'

export class RecordAnalyticsEventDto {
  @IsUUID('4')
  session_id!: string

  @IsUUID('4')
  event_id!: string

  @IsIn(ANALYTICS_PAGES)
  page!: AnalyticsPage
}
