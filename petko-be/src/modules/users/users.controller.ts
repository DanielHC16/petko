import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import {
  UsersService,
  type UserListItem,
  type UserRecord,
} from './users.service'
import { UpdateUserRoleDto } from './dto/update-user-role.dto'
import { PromoteUserDto } from './dto/promote-user.dto'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: UserProfile): UserProfile {
    return user
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers(): Promise<UserListItem[]> {
    return this.usersService.findAll()
  }

  @Patch(':id/role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: UserProfile,
  ): Promise<UserRecord> {
    return this.usersService.updateRole(id, dto.role, user.id)
  }

  @Post('promote')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async promoteUserByEmail(
    @Body() dto: PromoteUserDto,
    @CurrentUser() user: UserProfile,
  ): Promise<UserRecord> {
    return this.usersService.promoteByEmail(
      dto.email,
      dto.role || 'admin',
      user.id,
    )
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserProfile,
  ): Promise<{ message: string }> {
    return this.usersService.removeUser(id, user.id)
  }
}
