import { GUARDS_METADATA } from '@nestjs/common/constants'
import { ROLES_KEY } from '@/common/decorators/roles.decorator'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import type { UserProfile } from '@/common/types/authenticated-request.type'
import { UsersController } from './users.controller'
import type { UsersService } from './users.service'

/** Reads decorator metadata from a controller method without unbinding it. */
function metadataOf(key: string, method: keyof UsersController): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    UsersController.prototype,
    method,
  )
  return Reflect.getMetadata(key, descriptor?.value as object) as unknown
}

describe('UsersController', () => {
  it.each([
    'getAllUsers',
    'updateUserRole',
    'promoteUserByEmail',
    'removeUser',
  ] as const)('%s requires AuthGuard + RolesGuard + admin', (method) => {
    expect(metadataOf(GUARDS_METADATA, method)).toEqual([AuthGuard, RolesGuard])
    expect(metadataOf(ROLES_KEY, method)).toEqual(['admin'])
  })

  it('getMe only requires authentication', () => {
    expect(metadataOf(GUARDS_METADATA, 'getMe')).toEqual([AuthGuard])
    expect(metadataOf(ROLES_KEY, 'getMe')).toBeUndefined()
  })

  it('saves TOS acceptance only for the current user without requiring an admin role', async () => {
    expect(metadataOf(GUARDS_METADATA, 'acceptTos')).toEqual([AuthGuard])
    expect(metadataOf(ROLES_KEY, 'acceptTos')).toBeUndefined()
    const service = {
      acceptTos: jest.fn().mockResolvedValue({ tos_accepted: true }),
    }
    const controller = new UsersController(service as unknown as UsersService)
    await expect(
      controller.acceptTos({ tos_accepted: true }, {
        id: 'current-user',
      } as UserProfile),
    ).resolves.toEqual({ tos_accepted: true })
    expect(service.acceptTos).toHaveBeenCalledWith('current-user')
  })

  it('passes the current user id to role changes', async () => {
    const service = {
      updateRole: jest.fn().mockResolvedValue({}),
      promoteByEmail: jest.fn().mockResolvedValue({}),
    }
    const controller = new UsersController(service as unknown as UsersService)
    const me = { id: 'me-id' } as UserProfile

    await controller.updateUserRole('target', { role: 'customer' }, me)
    await controller.promoteUserByEmail({ email: 'a@x.com' }, me)

    expect(service.updateRole).toHaveBeenCalledWith(
      'target',
      'customer',
      'me-id',
    )
    expect(service.promoteByEmail).toHaveBeenCalledWith(
      'a@x.com',
      'admin',
      'me-id',
    )
  })
})
