import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import type { TosAcceptance } from './users.types'

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name)

  constructor(private readonly supabase: SupabaseService) {}

  async acceptTos(userId: string): Promise<TosAcceptance> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ tos_accepted: true })
      .eq('id', userId)
      .select('tos_accepted')
      .single<{ tos_accepted: boolean }>()

    if (error || data?.tos_accepted !== true) {
      this.logger.error(
        `users.acceptTos failed: ${error?.code ?? 'missing acceptance'}`,
      )
      throw new InternalServerErrorException(
        'Could not save your agreement. Please try again.',
      )
    }
    return { tos_accepted: true }
  }
}
