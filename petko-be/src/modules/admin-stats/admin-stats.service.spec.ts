import type { ProductsService } from '@/modules/products/products.service'
import type { UsersService } from '@/modules/users/users.service'
import type { AdminAccessEmailsService } from '@/modules/admin-access-emails/admin-access-emails.service'
import { AdminStatsService } from './admin-stats.service'

describe('AdminStatsService', () => {
  it('combines product, user and access-list counts', async () => {
    const service = new AdminStatsService(
      {
        countProducts: jest.fn().mockResolvedValue({ total: 60, active: 57 }),
      } as unknown as ProductsService,
      {
        countByEffectiveRole: jest
          .fn()
          .mockResolvedValue({ total: 10, admins: 4, customers: 6 }),
      } as unknown as UsersService,
      {
        findAll: jest.fn().mockResolvedValue([{}, {}, {}]),
      } as unknown as AdminAccessEmailsService,
    )

    await expect(service.getStats()).resolves.toEqual({
      products: { total: 60, active: 57 },
      users: { total: 10, admins: 4, customers: 6 },
      accessEmails: 3,
    })
  })
})
