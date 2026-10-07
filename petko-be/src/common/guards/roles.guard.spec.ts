import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@/common/decorators/roles.decorator'
import { RolesGuard } from './roles.guard'

function contextFor(role: Role): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext
}

describe('RolesGuard', () => {
  let reflector: Reflector
  let guard: RolesGuard

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  it('allows any user when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    expect(guard.canActivate(contextFor('customer'))).toBe(true)
  })

  it('allows an admin on an admin route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin'])
    expect(guard.canActivate(contextFor('admin'))).toBe(true)
  })

  it('forbids a customer on an admin route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin'])
    expect(() => guard.canActivate(contextFor('customer'))).toThrow(
      ForbiddenException,
    )
  })
})
