import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import type { User } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
import { ADMIN_ACCESS_EMAILS_TABLE } from '@/common/constants/admin-access.constants'
import { normalizeEmail } from '@/common/utils/email.util'
import type {
  AuthenticatedRequest,
  UserProfile,
} from '@/common/types/authenticated-request.type'

/**
 * AuthGuard — validates the Supabase-issued JWT from the Authorization header.
 *
 * Flow:
 * 1. Extract Bearer token from the Authorization header
 * 2. Verify the token with the Supabase anon client
 * 3. Fetch the user's profile (including role) from the public.users table,
 *    and in parallel check public.admin_access_emails for the verified,
 *    confirmed auth email
 * 4. Attach the profile to request.user with the EFFECTIVE role: 'admin' when
 *    the stored role is admin or the email is listed. Never written back.
 *
 * The list lookup fails closed: on error the stored role is kept.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    const authHeader = request.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }

    const token = authHeader.split(' ')[1]
    const {
      data: { user },
      error: authError,
    } = await this.supabase.anon.auth.getUser(token)

    if (authError || !user) {
      throw new UnauthorizedException('Invalid or expired token')
    }

    // Fetch full profile + role from public.users table, and the access list
    const [{ data: profile, error: profileError }, listed] = await Promise.all([
      this.supabase.admin
        .from('users')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', user.id)
        .single<UserProfile>(),
      this.isListedAdmin(user),
    ])

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found')
    }

    request.user = listed ? { ...profile, role: 'admin' } : profile
    return true
  }

  /** True only for a confirmed auth email present in the access list. */
  private async isListedAdmin(user: User): Promise<boolean> {
    if (!user.email || !user.email_confirmed_at) return false

    const { data, error } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .select('id')
      .eq('email', normalizeEmail(user.email))
      .maybeSingle()

    if (error) {
      this.logger.warn(
        `Admin access list lookup failed, using stored role: ${error.code} ${error.message}`,
      )
      return false
    }
    return Boolean(data)
  }
}
