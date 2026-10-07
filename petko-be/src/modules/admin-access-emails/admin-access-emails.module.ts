import { Module } from '@nestjs/common'
import { AdminAccessEmailsController } from './admin-access-emails.controller'
import { AdminAccessEmailsService } from './admin-access-emails.service'

@Module({
  controllers: [AdminAccessEmailsController],
  providers: [AdminAccessEmailsService],
  exports: [AdminAccessEmailsService],
})
export class AdminAccessEmailsModule {}
