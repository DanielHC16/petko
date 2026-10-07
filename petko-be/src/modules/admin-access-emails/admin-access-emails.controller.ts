import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import {
  AdminAccessEmailsService,
  type AdminAccessEmail,
} from './admin-access-emails.service'
import { CreateAdminAccessEmailDto } from './dto/create-admin-access-email.dto'

/** Admin-only management of the admin access email list. */
@Controller('admin-access-emails')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminAccessEmailsController {
  constructor(private readonly accessEmails: AdminAccessEmailsService) {}

  @Get()
  async findAll(): Promise<AdminAccessEmail[]> {
    return this.accessEmails.findAll()
  }

  @Post()
  async add(
    @Body() dto: CreateAdminAccessEmailDto,
    @CurrentUser() user: UserProfile,
  ): Promise<AdminAccessEmail> {
    return this.accessEmails.add(dto.email, user.id)
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserProfile,
  ): Promise<{ message: string }> {
    return this.accessEmails.remove(id, user)
  }
}
