import type { ExecutionContext } from '@nestjs/common'
import { UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { OptionalAuthGuard } from './optional-auth.guard'

describe('OptionalAuthGuard', () => {
  const auth = { canActivate: jest.fn() }
  const context = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    }) as unknown as ExecutionContext

  beforeEach(() => jest.clearAllMocks())

  it('allows a missing header without attempting network authentication', async () => {
    const guard = new OptionalAuthGuard(auth as unknown as AuthGuard)
    expect(await guard.canActivate(context())).toBe(true)
    expect(auth.canActivate).not.toHaveBeenCalled()
  })

  it.each(['', 'invalid', 'Bearer expired'])(
    'delegates every present header, including %s',
    async (header) => {
      auth.canActivate.mockRejectedValue(new UnauthorizedException())
      const guard = new OptionalAuthGuard(auth as unknown as AuthGuard)
      await expect(guard.canActivate(context(header))).rejects.toThrow(
        UnauthorizedException,
      )
      expect(auth.canActivate).toHaveBeenCalledTimes(1)
    },
  )
})
