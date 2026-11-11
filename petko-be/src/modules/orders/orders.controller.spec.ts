import { GUARDS_METADATA } from '@nestjs/common/constants'
import { ROLES_KEY } from '@/common/decorators/roles.decorator'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { OrdersController } from './orders.controller'

describe('OrdersController', () => {
  it('requires authentication on every endpoint', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, OrdersController)).toEqual([
      AuthGuard,
      RolesGuard,
    ])
  })

  it.each([
    'listAdmin',
    'detailAdmin',
    'updateFulfillment',
    'resolveIssue',
  ] as const)('requires effective admin role for %s', (method) => {
    expect(
      // Metadata is inspected without invoking the controller method.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(ROLES_KEY, OrdersController.prototype[method]),
    ).toEqual(['admin'])
  })

  it('does not give admins a receipt-confirmation shortcut', () => {
    expect(
      // Metadata is inspected without invoking the controller method.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(ROLES_KEY, OrdersController.prototype.confirmReceipt),
    ).toBeUndefined()
  })
})
