import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { SupabaseService } from '@/supabase/supabase.service'
import { ProductsService } from './products.service'

interface QueryResult {
  data: unknown
  error: { message: string; code: string } | null
  count?: number | null
}

/** Minimal chainable stand-in for the Supabase/PostgREST query builder. */
interface QueryBuilderMock {
  result: QueryResult
  select: jest.Mock
  order: jest.Mock
  eq: jest.Mock
  or: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  single: jest.Mock
  then: (resolve: (value: QueryResult) => void) => void
}

function createQueryBuilder(): QueryBuilderMock {
  const builder: QueryBuilderMock = {
    result: { data: [], error: null },
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    or: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    single: jest.fn(() => builder),
    then: (resolve) => resolve(builder.result),
  }
  return builder
}

const dbError = { message: 'secret pg detail', code: 'XX000' }

describe('ProductsService', () => {
  let service: ProductsService
  let builder: QueryBuilderMock

  beforeEach(async () => {
    builder = createQueryBuilder()
    const supabaseMock = { admin: { from: jest.fn(() => builder) } }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile()

    service = module.get<ProductsService>(ProductsService)
  })

  describe('findAll', () => {
    it('filters to active products by default', async () => {
      await service.findAll()
      expect(builder.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('does not filter by is_active when all is true', async () => {
      await service.findAll({ all: true })
      expect(builder.eq).not.toHaveBeenCalledWith('is_active', true)
    })

    it('applies a known pet_type filter', async () => {
      await service.findAll({ pet_type: 'cat' })
      expect(builder.or).toHaveBeenCalledWith(
        'pet_type.eq.cat,pet_type.eq.both',
      )
    })

    it('ignores an unknown or injected pet_type', async () => {
      await service.findAll({ pet_type: 'cat,is_active.eq.false' })
      await service.findAll({ pet_type: 'all' })
      expect(builder.or).not.toHaveBeenCalled()
    })

    it('strips PostgREST-reserved characters from the search term', async () => {
      await service.findAll({ search: ' kib*ble),is_active.eq.false:"\'%\\ ' })
      expect(builder.or).toHaveBeenCalledWith(
        'name.ilike.%kibbleis_active.eq.false%,description.ilike.%kibbleis_active.eq.false%',
      )
    })

    it('skips the search filter when nothing is left after sanitizing', async () => {
      await service.findAll({ search: ' ,()*% ' })
      expect(builder.or).not.toHaveBeenCalled()
    })
  })

  describe('error messages', () => {
    beforeEach(() => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it.each([
      ['findAll', (s: ProductsService) => s.findAll()],
      [
        'create',
        (s: ProductsService) =>
          s.create({
            name: 'x',
            price: 1,
            stock: 1,
            category: 'food',
            pet_type: 'cat',
          }),
      ],
      ['update', (s: ProductsService) => s.update('id', { price: 1 })],
      ['delete', (s: ProductsService) => s.delete('id')],
    ] as const)(
      '%s never leaks the Supabase error message',
      async (_name, call) => {
        builder.result = { data: null, error: dbError }
        const promise = call(service)
        await expect(promise).rejects.toBeInstanceOf(BadRequestException)
        await expect(promise).rejects.not.toThrow(/secret pg detail/)
      },
    )

    it('update maps a zero-row result to 404 Product not found', async () => {
      builder.result = {
        data: null,
        error: { message: 'JSON object requested', code: 'PGRST116' },
      }
      await expect(service.update('id', { price: 1 })).rejects.toThrow(
        new NotFoundException('Product not found'),
      )
    })
  })

  describe('out-of-stock auto-deactivation', () => {
    it('sets is_active to false when creating a product with 0 stock', async () => {
      builder.result = {
        data: { id: 'p1', stock: 0, is_active: false },
        error: null,
      }
      await service.create({
        name: 'Item',
        price: 100,
        stock: 0,
        category: 'food',
        pet_type: 'dog',
        is_active: true,
      })
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 0, is_active: false }),
      )
    })

    it('sets is_active to false when stock is updated to 0', async () => {
      builder.result = {
        data: { id: 'p1', stock: 0, is_active: false },
        error: null,
      }
      await service.update('p1', { stock: 0 })
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 0, is_active: false }),
      )
    })

    it('rejects activating a product if stock is updated to 0 at the same time', async () => {
      await expect(
        service.update('p1', { stock: 0, is_active: true }),
      ).rejects.toThrow(
        new BadRequestException(
          'Cannot activate a product that is out of stock.',
        ),
      )
    })

    it('rejects activating a product if its existing stock is 0', async () => {
      builder.result = {
        data: { id: 'p1', stock: 0, is_active: false },
        error: null,
      }
      await expect(service.update('p1', { is_active: true })).rejects.toThrow(
        new BadRequestException(
          'Cannot activate a product that is out of stock.',
        ),
      )
    })

    it('allows activating a product when stock > 0', async () => {
      builder.result = {
        data: { id: 'p1', stock: 10, is_active: true },
        error: null,
      }
      await service.update('p1', { stock: 10, is_active: true })
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 10, is_active: true }),
      )
    })
  })

  describe('countProducts', () => {
    it('returns total and active counts', async () => {
      builder.result = { data: null, error: null, count: 4 }
      await expect(service.countProducts()).resolves.toEqual({
        total: 4,
        active: 4,
      })
      expect(builder.eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  describe('product variations', () => {
    beforeEach(() => {
      builder.result = { data: { id: 'blue-collar' }, error: null }
    })

    it('persists a sellable variant with its own price, stock, grouping and details', async () => {
      await service.create({
        name: 'PetKo Collar (Blue)',
        price: 249,
        stock: 12,
        category: 'accessories',
        pet_type: 'both',
        sku: ' PK-COL-BLU ',
        parent_product_name: ' PetKo Collar ',
        variant_attributes: { color: 'Blue' },
        ingredients_materials: ' Nylon ',
        usage_instructions: 'Adjust before use.',
        safety_warnings: 'Inspect for wear.',
      })
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'PK-COL-BLU',
          parent_product_name: 'PetKo Collar',
          variant_attributes: { color: 'Blue' },
          ingredients_materials: 'Nylon',
          guaranteed_analysis: '',
          price: 249,
          stock: 12,
        }),
      )
    })

    it('patches only supplied fields without overwriting variant metadata', async () => {
      await service.update('blue-collar', { stock: 9 })
      expect(builder.update).toHaveBeenCalledWith({ stock: 9 })
      expect(builder.eq).toHaveBeenCalledWith('id', 'blue-collar')
      expect(builder.single).toHaveBeenCalledTimes(1)
    })

    it('derives a grouped product name on create instead of retaining a stale label', async () => {
      await service.create({
        name: 'PetKo Collar (Red)',
        price: 249,
        stock: 12,
        category: 'accessories',
        pet_type: 'both',
        parent_product_name: 'PetKo Collar',
        variant_attributes: { color: 'Blue', size: 'Small', style: 'Small' },
      })
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'PetKo Collar (Blue / Small)' }),
      )
    })

    it.each([
      [{ variant_attributes: { color: 'Blue' } }, 'PetKo Collar (Blue)'],
      [{ parent_product_name: 'PetKo New Collar' }, 'PetKo New Collar (Red)'],
      [{ name: 'Misleading unrelated name' }, 'PetKo Collar (Red)'],
      [{ variant_attributes: {} }, 'PetKo Collar'],
    ])(
      'recomputes grouped names from merged identity fields on patch %p',
      async (patch, name) => {
        builder.result = {
          data: {
            id: 'red-collar',
            name: 'PetKo Collar (Red)',
            parent_product_name: 'PetKo Collar',
            variant_attributes: { color: 'Red' },
          },
          error: null,
        }
        await service.update('red-collar', patch)
        expect(builder.update).toHaveBeenCalledWith(
          expect.objectContaining({ ...patch, name }),
        )
      },
    )

    it('retains the user-provided name for a standalone product', async () => {
      builder.result = {
        data: {
          id: 'standalone',
          name: 'Old name',
          parent_product_name: '',
          variant_attributes: {},
        },
        error: null,
      }
      await service.update('standalone', { name: ' Updated standalone ' })
      expect(builder.update).toHaveBeenCalledWith({
        name: 'Updated standalone',
      })
    })

    it('uses the parent name when a grouped product has no attributes on create', async () => {
      await service.create({
        name: 'Unrelated name',
        price: 249,
        stock: 12,
        category: 'accessories',
        pet_type: 'both',
        parent_product_name: 'PetKo Collar',
      })
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'PetKo Collar' }),
      )
    })

    it('supports explicitly clearing a SKU, grouping and attributes', async () => {
      await service.update('blue-collar', {
        sku: '',
        parent_product_name: '',
        variant_attributes: {},
      })
      expect(builder.update).toHaveBeenCalledWith({
        sku: null,
        parent_product_name: '',
        variant_attributes: {},
      })
    })

    it.each(['create', 'update'] as const)(
      'returns a safe conflict for a duplicate SKU on %s',
      async (operation) => {
        jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => undefined)
        builder.result = {
          data: null,
          error: { code: '23505', message: 'private duplicate detail' },
        }
        try {
          const result =
            operation === 'create'
              ? service.create({
                  name: 'Collar',
                  price: 249,
                  stock: 12,
                  category: 'accessories',
                  pet_type: 'both',
                  sku: 'PK-COL-BLU',
                })
              : service.update('blue-collar', { sku: 'PK-COL-BLU' })
          await expect(result).rejects.toThrow(
            new ConflictException('This SKU is already assigned to a product.'),
          )
        } finally {
          jest.restoreAllMocks()
        }
      },
    )
  })
})
