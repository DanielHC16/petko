import { Global, Module } from '@nestjs/common'
import { SupabaseService } from './supabase.service'

/**
 * @Global() — import this module once in AppModule.
 * All feature modules will receive SupabaseService via DI without re-importing.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
