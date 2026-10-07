import { Module } from '@nestjs/common'
import { AdminAccessEmailsModule } from '@/modules/admin-access-emails/admin-access-emails.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [AdminAccessEmailsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
