import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { ROLES_KEY } from '@/common/decorators/roles.decorator'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

/** Reads decorator metadata from a controller method without unbinding it. */
function metadataOf(key: string, method: keyof ProductsController): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    ProductsController.prototype,
    method,
  )
  return Reflect.getMetadata(key, descriptor?.value as object) as unknown
}

describe('ProductsController', () => {
  let controller: ProductsController
  const findAll = jest.fn().mockResolvedValue([])

  beforeEach(async () => {
    findAll.mockClear()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: { findAll } }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ProductsController>(ProductsController)
  })

  it('restricts the admin listing to admins', () => {
    expect(metadataOf(ROLES_KEY, 'getAllProductsAdmin')).toEqual(['admin'])
    expect(metadataOf(GUARDS_METADATA, 'getAllProductsAdmin')).toEqual([
      AuthGuard,
      RolesGuard,
    ])
  })

  it('leaves the public listing unguarded', () => {
    expect(metadataOf(GUARDS_METADATA, 'getAllProducts')).toBeUndefined()
  })

  it('admin listing includes inactive products', async () => {
    await controller.getAllProductsAdmin('food', 'cat', 'kibble')
    expect(findAll).toHaveBeenCalledWith({
      category: 'food',
      pet_type: 'cat',
      search: 'kibble',
      all: true,
    })
  })

  it('public listing never requests inactive products', async () => {
    await controller.getAllProducts('food', 'dog', undefined)
    expect(findAll).toHaveBeenCalledWith({
      category: 'food',
      pet_type: 'dog',
      search: undefined,
    })
  })
})
