import { Module } from '@nestjs/common'
import { AdminAccessEmailsModule } from '@/modules/admin-access-emails/admin-access-emails.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'

@Module({
  imports: [AdminAccessEmailsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
