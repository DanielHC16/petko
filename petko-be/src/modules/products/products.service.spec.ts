import { Test, TestingModule } from '@nestjs/testing'
import { SupabaseService } from '@/supabase/supabase.service'
import { ProductsService } from './products.service'

interface QueryResult {
  data: unknown[]
  error: null
}

/** Minimal chainable stand-in for the Supabase/PostgREST query builder. */
interface QueryBuilderMock {
  select: jest.Mock
  order: jest.Mock
  eq: jest.Mock
  or: jest.Mock
  then: (resolve: (value: QueryResult) => void) => void
}

function createQueryBuilder(): QueryBuilderMock {
  const builder: QueryBuilderMock = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    or: jest.fn(() => builder),
    then: (resolve) => resolve({ data: [], error: null }),
  }
  return builder
}

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
})
