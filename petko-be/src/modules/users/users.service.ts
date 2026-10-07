import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import type { User } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import type { Role } from '@/common/decorators/roles.decorator'
import { escapeLikePattern, normalizeEmail } from '@/common/utils/email.util'
import { AdminAccessEmailsService } from '@/modules/admin-access-emails/admin-access-emails.service'

export interface UserRecord extends UserProfile {
  created_at: string
}

/** A user as shown to admins: `role` is the effective role. */
export interface UserListItem extends UserRecord {
  /** True when admin access comes from the admin access email list. */
  admin_access_listed: boolean
}

export interface UserRoleCounts {
  total: number
  admins: number
  customers: number
}

const USER_COLUMNS = 'id, email, full_name, avatar_url, role, created_at'

/** auth.admin.listUsers page size and page cap (20k users) for promote lookups. */
const AUTH_PAGE_SIZE = 1000
const AUTH_MAX_PAGES = 20

const PROMOTE_FAILED =
  'Could not assign the role for this email. Please try again.'
const REMOVE_FAILED =
  'Could not remove this account. It may have orders linked to it.'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly accessEmails: AdminAccessEmailsService,
  ) {}

  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', id)
      .maybeSingle<UserRecord>()

    if (error) {
      this.logger.error(`users.findById failed: ${error.code} ${error.message}`)
    }
    return data ?? null
  }

  async findAll(): Promise<UserListItem[]> {
    const [users, listed] = await Promise.all([
      this.loadAllUsers(),
      this.accessEmails.findEmailSet(),
    ])

    return users.map((user) => {
      const isListed = listed.has(normalizeEmail(user.email ?? ''))
      return {
        ...user,
        role: isListed ? 'admin' : user.role,
        admin_access_listed: isListed,
      }
    })
  }

  /** User totals by effective role, for the admin dashboard. */
  async countByEffectiveRole(): Promise<UserRoleCounts> {
    const users = await this.findAll()
    const admins = users.filter((user) => user.role === 'admin').length
    return { total: users.length, admins, customers: users.length - admins }
  }

  async updateRole(
    id: string,
    role: Role,
    currentUserId: string,
  ): Promise<UserRecord> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot change your own role')
    }

    const target = await this.findById(id)
    if (!target) {
      throw new NotFoundException('User not found')
    }

    if (role === 'customer') {
      await this.assertCanLoseAdmin(target)
    }

    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ role })
      .eq('id', id)
      .select(USER_COLUMNS)
      .single<UserRecord>()

    if (error || !data) {
      this.logger.error(
        `users.updateRole failed: ${error?.code} ${error?.message}`,
      )
      throw new BadRequestException(
        'Could not update this role. Please try again.',
      )
    }

    return data
  }

  async promoteByEmail(
    email: string,
    role: Role,
    currentUserId: string,
  ): Promise<UserRecord> {
    const cleanEmail = normalizeEmail(email)

    // 1. Existing profile in public.users (literal, case-insensitive match).
    const { data: existingUser, error: lookupError } = await this.supabase.admin
      .from('users')
      .select(USER_COLUMNS)
      .ilike('email', escapeLikePattern(cleanEmail))
      .maybeSingle<UserRecord>()

    if (lookupError) {
      this.failPromote('lookup', lookupError.message)
    }

    if (existingUser) {
      if (role === 'customer') {
        if (existingUser.id === currentUserId) {
          throw new BadRequestException('You cannot change your own role')
        }
        await this.assertCanLoseAdmin(existingUser)
      }

      const { data: updated, error: updateError } = await this.supabase.admin
        .from('users')
        .update({ role })
        .eq('id', existingUser.id)
        .select(USER_COLUMNS)
        .single<UserRecord>()

      if (updateError || !updated) {
        this.failPromote('update', updateError?.message)
      }
      return updated
    }

    // 2. Auth user without a profile row yet (signed up, profile missing).
    const matchedAuthUser = await this.findAuthUserByEmail(cleanEmail)

    if (matchedAuthUser) {
      const metadata = matchedAuthUser.user_metadata as Record<
        string,
        string | undefined
      >
      const { data: inserted, error: insertError } = await this.supabase.admin
        .from('users')
        .upsert({
          id: matchedAuthUser.id,
          email: matchedAuthUser.email,
          full_name:
            metadata.full_name || metadata.name || cleanEmail.split('@')[0],
          avatar_url: metadata.avatar_url || '',
          role,
        })
        .select(USER_COLUMNS)
        .single<UserRecord>()

      if (insertError || !inserted) {
        this.failPromote('provision', insertError?.message)
      }
      return inserted
    }

    // 3. Never signed in: pre-create the auth user and its profile.
    const { data: createdAuthUser, error: createAuthError } =
      await this.supabase.admin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: {
          full_name: cleanEmail.split('@')[0],
        },
      })

    if (createAuthError || !createdAuthUser.user) {
      this.failPromote('createUser', createAuthError?.message)
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
        .select(USER_COLUMNS)
        .single<UserRecord>()

    if (profileInsertError || !createdProfile) {
      this.failPromote('createProfile', profileInsertError?.message)
    }

    return createdProfile
  }

  async removeUser(
    id: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own active account')
    }

    const target = await this.findById(id)
    if (!target) {
      throw new NotFoundException('User not found')
    }

    if (await this.isEffectiveAdmin(target)) {
      if ((await this.countEffectiveAdmins()) <= 1) {
        throw new ConflictException('Cannot remove the last admin account')
      }
    }

    // Auth first: supabase-js returns (does not throw) errors. The profile row
    // cascades from auth.users; deleting it afterwards is idempotent cleanup.
    const { error: authError } =
      await this.supabase.admin.auth.admin.deleteUser(id)
    if (authError) {
      this.logger.error(
        `users.removeUser auth delete failed: ${authError.message}`,
      )
      throw new BadRequestException(REMOVE_FAILED)
    }

    const { error: dbError } = await this.supabase.admin
      .from('users')
      .delete()
      .eq('id', id)

    if (dbError) {
      this.logger.error(
        `users.removeUser profile delete failed: ${dbError.code} ${dbError.message}`,
      )
      throw new BadRequestException(REMOVE_FAILED)
    }

    return { message: 'User account removed successfully' }
  }

  /** Blocks demoting list-granted admins and the last effective admin. */
  private async assertCanLoseAdmin(target: UserRecord): Promise<void> {
    if (await this.accessEmails.isListed(target.email ?? '')) {
      throw new ConflictException(
        'This user has admin access through the admin access list. Remove their email from the list first.',
      )
    }
    if (target.role === 'admin' && (await this.countEffectiveAdmins()) <= 1) {
      throw new ConflictException('Cannot demote the last admin account')
    }
  }

  private async isEffectiveAdmin(user: UserRecord): Promise<boolean> {
    return (
      user.role === 'admin' ||
      (await this.accessEmails.isListed(user.email ?? ''))
    )
  }

  private async countEffectiveAdmins(): Promise<number> {
    return (await this.countByEffectiveRole()).admins
  }

  private async loadAllUsers(): Promise<UserRecord[]> {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(USER_COLUMNS)
      .order('created_at', { ascending: false })
      .returns<UserRecord[]>()

    if (error) {
      this.logger.error(`users.findAll failed: ${error.code} ${error.message}`)
      throw new BadRequestException('Could not load users. Please try again.')
    }

    return data ?? []
  }

  /** Pages through auth.users (listUsers has no email filter). */
  private async findAuthUserByEmail(email: string): Promise<User | null> {
    for (let page = 1; page <= AUTH_MAX_PAGES; page++) {
      const { data, error } = await this.supabase.admin.auth.admin.listUsers({
        page,
        perPage: AUTH_PAGE_SIZE,
      })
      if (error) {
        this.failPromote('listUsers', error.message)
      }

      const match = data.users.find(
        (user) => normalizeEmail(user.email ?? '') === email,
      )
      if (match) return match
      if (data.users.length < AUTH_PAGE_SIZE) return null
    }
    return null
  }

  private failPromote(step: string, detail: string | undefined): never {
    this.logger.error(
      `users.promoteByEmail ${step} failed: ${detail ?? 'no data'}`,
    )
    throw new BadRequestException(PROMOTE_FAILED)
  }
}
