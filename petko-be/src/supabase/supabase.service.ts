import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * SupabaseService provides two pre-configured Supabase clients:
 *
 * - `admin`: Uses the SERVICE ROLE key — bypasses RLS.
 *   Use for all database read/write operations inside NestJS services.
 *   NEVER expose this client or its key to the frontend.
 *
 * - `anon`: Uses the ANON key — respects RLS.
 *   Use ONLY for verifying user JWTs via `supabase.auth.getUser(token)`.
 */
@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient
  private readonly anonClient: SupabaseClient

  constructor(private readonly config: ConfigService) {
    this.adminClient = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    )
    this.anonClient = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_ANON_KEY'),
    )
  }

  /** All DB operations — service role, bypasses RLS. */
  get admin(): SupabaseClient {
    return this.adminClient
  }

  /** JWT verification only — anon key, respects RLS. */
  get anon(): SupabaseClient {
    return this.anonClient
  }
}
