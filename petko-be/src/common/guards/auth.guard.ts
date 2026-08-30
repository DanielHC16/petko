import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import type { AuthenticatedRequest } from '@/common/types/authenticated-request.type'

/**
 * AuthGuard — validates the Supabase-issued JWT from the Authorization header.
 *
 * Flow:
 * 1. Extract Bearer token from the Authorization header
 * 2. Verify the token with the Supabase anon client
 * 3. Fetch the user's profile (including role) from the public.users table
 * 4. Attach the profile to request.user for downstream use
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>()

    const authHeader = request.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      )
    }

    const token = authHeader.split(' ')[1]
    const {
      data: { user },
      error: authError,
    } = await this.supabase.anon.auth.getUser(token)

    if (authError || !user) {
      throw new UnauthorizedException('Invalid or expired token')
    }

    // Fetch full profile + role from public.users table
    const { data: profile, error: profileError } = await this.supabase.admin
      .from('users')
      .select('id, email, full_name, avatar_url, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found')
    }

    request.user = profile
    return true
  }
}
