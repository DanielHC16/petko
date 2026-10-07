import { Injectable } from '@nestjs/common'
import { ProductsService } from '@/modules/products/products.service'
import {
  UsersService,
  type UserRoleCounts,
} from '@/modules/users/users.service'
import { AdminAccessEmailsService } from '@/modules/admin-access-emails/admin-access-emails.service'

export interface AdminStats {
  products: { total: number; active: number }
  users: UserRoleCounts
  accessEmails: number
}

@Injectable()
export class AdminStatsService {
  constructor(
    private readonly products: ProductsService,
    private readonly users: UsersService,
    private readonly accessEmails: AdminAccessEmailsService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const [products, users, emails] = await Promise.all([
      this.products.countProducts(),
      this.users.countByEffectiveRole(),
      this.accessEmails.findAll(),
    ])
    return { products, users, accessEmails: emails.length }
  }
}
