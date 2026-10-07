import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
import { ADMIN_ACCESS_EMAILS_TABLE } from '@/common/constants/admin-access.constants'
import { normalizeEmail } from '@/common/utils/email.util'
import type { UserProfile } from '@/common/types/authenticated-request.type'

export interface AdminAccessEmail {
  id: string
  email: string
  added_by: string | null
  created_at: string
}

const COLUMNS = 'id, email, added_by, created_at'

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505'

/**
 * Manages public.admin_access_emails: confirmed accounts whose email is
 * listed are treated as admins by AuthGuard.
 */
@Injectable()
export class AdminAccessEmailsService {
  private readonly logger = new Logger(AdminAccessEmailsService.name)

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<AdminAccessEmail[]> {
    const { data, error } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .select(COLUMNS)
      .order('email', { ascending: true })
      .returns<AdminAccessEmail[]>()

    if (error) {
      this.logDbError('findAll', error)
      throw new BadRequestException(
        'Could not load the admin access list. Please try again.',
      )
    }

    return data ?? []
  }

  /** All listed emails, normalized, for effective-role calculations. */
  async findEmailSet(): Promise<Set<string>> {
    const rows = await this.findAll()
    return new Set(rows.map((row) => normalizeEmail(row.email)))
  }

  async isListed(email: string): Promise<boolean> {
    const clean = normalizeEmail(email)
    if (!clean) return false

    const { data, error } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .select('id')
      .eq('email', clean)
      .maybeSingle()

    if (error) {
      this.logDbError('isListed', error)
      throw new BadRequestException(
        'Could not check the admin access list. Please try again.',
      )
    }

    return Boolean(data)
  }

  async add(email: string, addedBy: string): Promise<AdminAccessEmail> {
    const { data, error } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .insert({ email: normalizeEmail(email), added_by: addedBy })
      .select(COLUMNS)
      .single<AdminAccessEmail>()

    if (error?.code === UNIQUE_VIOLATION) {
      throw new ConflictException('That email already has admin access')
    }
    if (error || !data) {
      this.logDbError('add', error)
      throw new BadRequestException(
        'Could not add this email to the admin access list. Please try again.',
      )
    }

    return data
  }

  async remove(
    id: string,
    currentUser: UserProfile,
  ): Promise<{ message: string }> {
    const { data: row, error: findError } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle<AdminAccessEmail>()

    if (findError) {
      this.logDbError('remove.find', findError)
      throw new BadRequestException(
        'Could not remove this email. Please try again.',
      )
    }
    if (!row) {
      throw new NotFoundException('Access email not found')
    }

    if (normalizeEmail(row.email) === normalizeEmail(currentUser.email)) {
      throw new BadRequestException(
        'You cannot remove your own email from the admin access list',
      )
    }

    const { count, error: countError } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .select('id', { count: 'exact', head: true })

    if (countError) {
      this.logDbError('remove.count', countError)
      throw new BadRequestException(
        'Could not remove this email. Please try again.',
      )
    }
    if ((count ?? 0) <= 1) {
      throw new ConflictException('At least one email must keep admin access')
    }

    const { error: deleteError } = await this.supabase.admin
      .from(ADMIN_ACCESS_EMAILS_TABLE)
      .delete()
      .eq('id', id)

    if (deleteError) {
      this.logDbError('remove.delete', deleteError)
      throw new BadRequestException(
        'Could not remove this email. Please try again.',
      )
    }

    return { message: 'Email removed from the admin access list' }
  }

  private logDbError(operation: string, error: PostgrestError | null): void {
    this.logger.error(
      `admin_access_emails.${operation} failed: ${error?.code ?? 'no-code'} ${error?.message ?? 'no data returned'}`,
    )
  }
}
