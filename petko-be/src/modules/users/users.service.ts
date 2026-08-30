import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import type { Role } from '@/common/decorators/roles.decorator'

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select('id, email, full_name, avatar_url, role, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return data as UserProfile
  }

  async findAll(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select('id, email, full_name, avatar_url, role, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw new BadRequestException(`Failed to fetch users: ${error.message}`)
    }

    return (data as UserProfile[]) || []
  }

  async updateRole(id: string, role: Role): Promise<UserProfile> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, email, full_name, avatar_url, role, created_at')
      .single()

    if (error || !data) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return data as UserProfile
  }

  async promoteByEmail(
    email: string,
    role: Role = 'admin',
  ): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase()

    // 1. Check if user already exists in public.users
    const { data: existingUser } = await this.supabase.admin
      .from('users')
      .select('id, email, full_name, avatar_url, role, created_at')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingUser) {
      const { data: updated, error: updateError } = await this.supabase.admin
        .from('users')
        .update({ role })
        .eq('id', existingUser.id)
        .select('id, email, full_name, avatar_url, role, created_at')
        .single()

      if (updateError || !updated) {
        throw new BadRequestException('Failed to update user role')
      }

      return updated as UserProfile
    }

    // 2. Check if user exists in auth.users
    const { data: authData } =
      await this.supabase.admin.auth.admin.listUsers()
    const matchedAuthUser = authData?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail,
    )

    if (matchedAuthUser) {
      const { data: inserted, error: insertError } = await this.supabase.admin
        .from('users')
        .upsert({
          id: matchedAuthUser.id,
          email: matchedAuthUser.email,
          full_name:
            matchedAuthUser.user_metadata?.full_name ||
            matchedAuthUser.user_metadata?.name ||
            cleanEmail.split('@')[0],
          avatar_url: matchedAuthUser.user_metadata?.avatar_url || '',
          role,
        })
        .select('id, email, full_name, avatar_url, role, created_at')
        .single()

      if (insertError || !inserted) {
        throw new BadRequestException(
          `Failed to provision user: ${insertError?.message}`,
        )
      }

      return inserted as UserProfile
    }

    // 3. If user has never signed in before, pre-create the auth user in Supabase
    const { data: createdAuthUser, error: createAuthError } =
      await this.supabase.admin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: {
          full_name: cleanEmail.split('@')[0],
        },
      })

    if (createAuthError || !createdAuthUser.user) {
      throw new BadRequestException(
        `Failed to pre-register user: ${createAuthError?.message}`,
      )
    }

    const { data: createdProfile, error: profileInsertError } =
      await this.supabase.admin
        .from('users')
        .upsert({
          id: createdAuthUser.user.id,
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          avatar_url: '',
          role,
        })
        .select('id, email, full_name, avatar_url, role, created_at')
        .single()

    if (profileInsertError || !createdProfile) {
      throw new BadRequestException(
        `Failed to create user profile: ${profileInsertError?.message}`,
      )
    }

    return createdProfile as UserProfile
  }

  async removeUser(
    id: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own active account')
    }

    // Delete from public.users
    const { error: dbError } = await this.supabase.admin
      .from('users')
      .delete()
      .eq('id', id)

    if (dbError) {
      throw new BadRequestException(
        `Failed to remove user from database: ${dbError.message}`,
      )
    }

    // Delete from auth.users (Supabase Auth)
    try {
      await this.supabase.admin.auth.admin.deleteUser(id)
    } catch {}

    return { message: 'User account removed successfully' }
  }
}
