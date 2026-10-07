import { GUARDS_METADATA } from '@nestjs/common/constants'
import { ROLES_KEY } from '@/common/decorators/roles.decorator'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { AdminAccessEmailsController } from './admin-access-emails.controller'
import type { AdminAccessEmailsService } from './admin-access-emails.service'

describe('AdminAccessEmailsController', () => {
  it('guards every route with AuthGuard + RolesGuard at class level', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminAccessEmailsController),
    ).toEqual([AuthGuard, RolesGuard])
  })

  it('requires the admin role at class level', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminAccessEmailsController)).toEqual(
      ['admin'],
    )
  })

  it('passes the current user to add and remove', async () => {
    const service = {
      add: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({ message: 'ok' }),
    }
    const controller = new AdminAccessEmailsController(
      service as unknown as AdminAccessEmailsService,
    )
    const user = { id: 'me-id', email: 'me@x.com' } as UserProfile

    await controller.add({ email: 'new@x.com' }, user)
    await controller.remove('row-id', user)

    expect(service.add).toHaveBeenCalledWith('new@x.com', 'me-id')
    expect(service.remove).toHaveBeenCalledWith('row-id', user)
  })
})
