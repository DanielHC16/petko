import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import type { SavedShipping, TosAcceptance } from './users.types'

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name)

  constructor(private readonly supabase: SupabaseService) {}

  async updateShipping(
    userId: string,
    savedShipping: SavedShipping['saved_shipping'],
  ): Promise<SavedShipping> {
    const { data, error } = await this.supabase.admin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: { saved_shipping: savedShipping },
      },
    )
    if (error || data.user?.id !== userId) {
      this.logger.error(
        `users.updateShipping failed: ${error?.code ?? 'missing user'}`,
      )
      throw new InternalServerErrorException(
        'Could not save your shipping details. Please try again.',
      )
    }
    return { saved_shipping: savedShipping }
  }

  async updateName(userId: string, fullName: string): Promise<UserProfile> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ full_name: fullName })
      .eq('id', userId)
      .select('id, email, full_name, avatar_url, role, tos_accepted')
      .single<UserProfile>()
    if (error || !data) {
      this.logger.error(
        `users.updateName failed: ${error?.code ?? 'missing profile'}`,
      )
      throw new InternalServerErrorException(
        'Could not save your display name. Please try again.',
      )
    }
    return data
  }

  async deleteOwnAccount(userId: string): Promise<void> {
    const { data, error } = await this.supabase.admin
      .rpc('petko_delete_own_account', { p_user_id: userId })
      .returns<boolean>()
    if (error?.code === 'P4094')
      throw new ConflictException(
        'Complete or cancel your active orders before deleting your account.',
      )
    if (error?.code === 'P4095')
      throw new ConflictException('The last admin account cannot be deleted.')
    if (error?.code === 'P4040')
      throw new NotFoundException('Account not found')
    if (error || data !== true) {
      this.logger.error(
        `users.deleteOwnAccount failed: ${error?.code ?? 'missing confirmation'}`,
      )
      throw new InternalServerErrorException(
        'Could not delete your account. Please try again.',
      )
    }
  }

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
