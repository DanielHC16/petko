import { Injectable } from '@nestjs/common'

export interface HealthStatus {
  status: 'ok'
}

@Injectable()
export class AppService {
  /** Liveness check — does not touch the database. */
  getHealth(): HealthStatus {
    return { status: 'ok' }
  }
}
