/**
 * In-memory mock data used by mock-setup.ts when VITE_MOCK=true.
 * Arrays are mutable so create / update / delete feel real within a session.
 */
import type { Product } from '@/features/products/products-api'
import type { UserProfile } from '@/store/auth.store'
import type {
  AdminUser,
  AdminAccessEmail,
  AdminStats,
} from '@/features/admin/admin-api'
import type { OrderDetail, OrderList, OrderSummary } from '@/lib/order-types'

// ─── Mock admin profile ──────────────────────────────────────────────────────

export const mockProfile: UserProfile = {
  id: 'mock-admin-0001',
  email: 'admin@petko.ph',
  full_name: 'Petko Admin',
  avatar_url: '',
  role: 'admin',
  tos_accepted: true,
}

// ─── Products ────────────────────────────────────────────────────────────────

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'PetKo Salmon & Rice Adult Dog Food 2kg',
    description:
      'Premium dry food with real salmon as the first ingredient. Supports healthy skin, coat, and digestion.',
    price: 850,
    stock: 32,
    category: 'food',
    pet_type: 'dog',
    image_url:
      'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-01T08:00:00Z',
  },
  {
    id: 'prod-002',
    name: 'Whiskas Tuna Cat Food 1.2kg',
    description:
      'Complete and balanced nutrition for adult cats with real tuna.',
    price: 420,
    stock: 5,
    category: 'food',
    pet_type: 'cat',
    image_url:
      'https://images.unsplash.com/photo-1587625186751-6c8b2c9c5e92?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-05T08:00:00Z',
  },
  {
    id: 'prod-003',
    name: 'PetKo Squeaky Rubber Bone Toy',
    description:
      'Durable rubber bone toy with built-in squeaker. Non-toxic and safe for all dogs.',
    price: 199,
    stock: 50,
    category: 'toys',
    pet_type: 'dog',
    image_url:
      'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-10T08:00:00Z',
  },
  {
    id: 'prod-004',
    name: 'Cat Teaser Wand with Feathers',
    description:
      'Interactive wand toy with colorful feathers and bell. Encourages exercise.',
    price: 149,
    stock: 28,
    category: 'toys',
    pet_type: 'cat',
    image_url:
      'https://images.unsplash.com/photo-1574158622682-e40e6988f06f?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-12T08:00:00Z',
  },
  {
    id: 'prod-005',
    name: 'PetKo Oatmeal Dog Shampoo 500ml',
    description:
      'Gentle oatmeal-based shampoo for sensitive skin. pH-balanced and tear-free.',
    price: 320,
    stock: 18,
    category: 'grooming',
    pet_type: 'dog',
    image_url:
      'https://images.unsplash.com/photo-1601758124510-52e02f13f2b5?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-14T08:00:00Z',
  },
  {
    id: 'prod-006',
    name: 'PetKo Dental Treats for Cats 120g',
    description:
      'Crunchy treats that clean teeth and freshen breath. Made with real chicken.',
    price: 180,
    stock: 0,
    category: 'treats',
    pet_type: 'cat',
    image_url:
      'https://images.unsplash.com/photo-1601758228042-6a93d8b1f4d5?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-16T08:00:00Z',
  },
  {
    id: 'prod-007',
    name: 'Premium Clumping Cat Litter 10kg',
    description:
      'Highly absorbent clumping litter with odor control. Dust-free formula.',
    price: 550,
    stock: 3,
    category: 'litter',
    pet_type: 'cat',
    image_url:
      'https://images.unsplash.com/photo-1601758125946-6ec53f5d0d6e?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-18T08:00:00Z',
  },
  {
    id: 'prod-008',
    name: 'Orthopedic Pet Bed Medium',
    description:
      'Memory foam orthopedic bed for joint support. Removable, washable cover.',
    price: 1200,
    stock: 12,
    category: 'bedding',
    pet_type: 'both',
    image_url:
      'https://images.unsplash.com/photo-1601758177127-5b0b0d3e3e8c?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-20T08:00:00Z',
  },
  {
    id: 'prod-009',
    name: 'PetKo Reflective Dog Collar Medium',
    description:
      'Adjustable nylon collar with reflective stitching for night safety.',
    price: 250,
    stock: 40,
    category: 'accessories',
    pet_type: 'dog',
    image_url:
      'https://images.unsplash.com/photo-1601758126357-5e2e3f6f2e7a?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-22T08:00:00Z',
  },
  {
    id: 'prod-010',
    name: 'PetKo Multivitamin Supplement 60 tablets',
    description:
      'Daily multivitamin for dogs and cats. Supports immune system and joint health.',
    price: 680,
    stock: 15,
    category: 'wellness',
    pet_type: 'both',
    image_url:
      'https://images.unsplash.com/photo-1601758178129-5b0b0d3e3f9c?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-24T08:00:00Z',
  },
  {
    id: 'prod-011',
    name: 'PetKo Travel Water Bottle 500ml',
    description:
      'Leak-proof travel bottle with built-in drinking bowl for walks and hikes.',
    price: 350,
    stock: 22,
    category: 'travel',
    pet_type: 'both',
    image_url:
      'https://images.unsplash.com/photo-1601758180304-5b0b0d3e3fac?w=600&auto=format&fit=crop',
    is_active: false,
    created_at: '2025-10-26T08:00:00Z',
  },
  {
    id: 'prod-012',
    name: 'PetKo Dog Raincoat Large',
    description:
      'Waterproof raincoat with adjustable straps and reflective strips for safety.',
    price: 450,
    stock: 8,
    category: 'apparel',
    pet_type: 'dog',
    image_url:
      'https://images.unsplash.com/photo-1601758190376-5e2e3f6f2e8b?w=600&auto=format&fit=crop',
    is_active: true,
    created_at: '2025-10-28T08:00:00Z',
  },
]

// ─── Users ───────────────────────────────────────────────────────────────────

export const mockUsers: AdminUser[] = [
  {
    id: 'mock-admin-0001',
    email: 'admin@petko.ph',
    full_name: 'Petko Admin',
    avatar_url: '',
    role: 'admin',
    tos_accepted: true,
    created_at: '2025-09-01T08:00:00Z',
    admin_access_listed: true,
  },
  {
    id: 'mock-user-0002',
    email: 'maria.santos@gmail.com',
    full_name: 'Maria Santos',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    role: 'admin',
    tos_accepted: true,
    created_at: '2025-09-15T08:00:00Z',
    admin_access_listed: true,
  },
  {
    id: 'mock-user-0003',
    email: 'juan.delacruz@gmail.com',
    full_name: 'Juan Dela Cruz',
    avatar_url: 'https://i.pravatar.cc/150?img=12',
    role: 'customer',
    tos_accepted: true,
    created_at: '2025-10-01T08:00:00Z',
    admin_access_listed: false,
  },
  {
    id: 'mock-user-0004',
    email: 'ana.reyes@gmail.com',
    full_name: 'Ana Reyes',
    avatar_url: 'https://i.pravatar.cc/150?img=5',
    role: 'customer',
    tos_accepted: true,
    created_at: '2025-10-10T08:00:00Z',
    admin_access_listed: false,
  },
  {
    id: 'mock-user-0005',
    email: 'carlos.mendoza@gmail.com',
    full_name: 'Carlos Mendoza',
    avatar_url: '',
    role: 'customer',
    tos_accepted: false,
    created_at: '2025-10-20T08:00:00Z',
    admin_access_listed: false,
  },
  {
    id: 'mock-user-0006',
    email: 'sofia.garcia@gmail.com',
    full_name: 'Sofia Garcia',
    avatar_url: 'https://i.pravatar.cc/150?img=9',
    role: 'customer',
    tos_accepted: true,
    created_at: '2025-11-01T08:00:00Z',
    admin_access_listed: false,
  },
]

// ─── Admin access emails ──────────────────────────────────────────────────────

export const mockAccessEmails: AdminAccessEmail[] = [
  {
    id: 'acc-001',
    email: 'admin@petko.ph',
    added_by: 'system',
    created_at: '2025-09-01T08:00:00Z',
  },
  {
    id: 'acc-002',
    email: 'maria.santos@gmail.com',
    added_by: 'admin@petko.ph',
    created_at: '2025-09-15T08:00:00Z',
  },
]

// ─── Orders ───────────────────────────────────────────────────────────────────

function makeOrder(
  id: string,
  fulfillment: OrderSummary['fulfillment_status'],
  daysAgo: number,
  amount: number,
  name: string,
): OrderDetail {
  const created = new Date(
    Date.now() - daysAgo * 24 * 60 * 60 * 1000,
  ).toISOString()
  return {
    id,
    user_id: 'mock-user-0003',
    status: fulfillment === 'delivered' ? 'paid' : 'pending',
    fulfillment_status: fulfillment,
    tracking_version: 1,
    total_amount: amount,
    subtotal_amount: amount - 99,
    shipping_fee: 99,
    payment_method: 'cod',
    delivery_method: 'standard',
    created_at: created,
    updated_at: created,
    delivery_confirmed_at: fulfillment === 'delivered' ? created : null,
    courier_name: fulfillment !== 'placed' ? 'J&T Express' : null,
    tracking_number: fulfillment !== 'placed' ? 'JT000123456PH' : null,
    delivery_issue: null,
    shipping: {
      full_name: name,
      email: 'juan.delacruz@gmail.com',
      phone: '09171234567',
      address_line1: '12 Pet Residence 123 St., Brgy Woof',
      address_line2: '',
      city: 'Sta Mesa',
      province: 'Metro Manila',
      postal_code: '1016',
    },
    items: [
      {
        id: `item-${id}-1`,
        product_id: 'prod-001',
        product_name: 'PetKo Salmon & Rice Adult Dog Food 2kg',
        image_url:
          'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        quantity: 2,
        unit_price: 850,
      },
    ],
    events: [
      {
        id: `evt-${id}-1`,
        version: 1,
        event_type: 'order_placed',
        from_status: null,
        to_status: 'placed',
        actor_role: 'customer',
        created_at: created,
        note: null,
      },
    ],
  }
}

export const mockOrders: OrderDetail[] = [
  makeOrder('aaaa-0001-bbbb-cccc', 'delivered',       14, 1799, 'Juan Dela Cruz'),
  makeOrder('aaaa-0002-bbbb-cccc', 'out_for_delivery', 2, 850,  'Ana Reyes'),
  makeOrder('aaaa-0003-bbbb-cccc', 'processing',       1, 1030, 'Juan Dela Cruz'),
  makeOrder('aaaa-0004-bbbb-cccc', 'placed',           0, 420,  'Sofia Garcia'),
]

// ─── Computed stats ───────────────────────────────────────────────────────────

export function getMockStats(): AdminStats {
  return {
    products: {
      total: mockProducts.length,
      active: mockProducts.filter((p) => p.is_active).length,
    },
    users: {
      total: mockUsers.length,
      admins: mockUsers.filter((u) => u.role === 'admin').length,
      customers: mockUsers.filter((u) => u.role === 'customer').length,
    },
    accessEmails: mockAccessEmails.length,
  }
}

export function getMockOrderList(_admin: boolean): OrderList {
  return {
    orders: mockOrders,
    total: mockOrders.length,
    page: 1,
    limit: 10,
  }
}
