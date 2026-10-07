import { BadRequestException, Logger, NotFoundException } from '@nestjs/common'
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
      ['update', (s: ProductsService) => s.update('id', { name: 'x' })],
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
      await expect(service.update('id', { name: 'x' })).rejects.toThrow(
        new NotFoundException('Product not found'),
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
})
