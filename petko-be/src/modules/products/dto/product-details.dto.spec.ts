import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateProductDto } from './create-product.dto'
import { UpdateProductDto } from './update-product.dto'

const product = {
  name: 'PetKo Collar (Blue)',
  price: 249,
  stock: 12,
  category: 'accessories',
  pet_type: 'both',
}
const validationOptions = { whitelist: true, forbidNonWhitelisted: true }

describe('Product variation DTOs', () => {
  it('accepts existing standalone product requests', async () => {
    const dto = plainToInstance(CreateProductDto, product)
    await expect(validate(dto, validationOptions)).resolves.toHaveLength(0)
  })

  it('accepts and trims the bounded variation fields', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...product,
      sku: ' PK-COL-BLU ',
      parent_product_name: ' PetKo Collar ',
      variant_attributes: { color: ' Blue ', size: ' Small ' },
      ingredients_materials: ' Nylon ',
      guaranteed_analysis: '',
      usage_instructions: 'Adjust before use.',
      safety_warnings: 'Inspect for wear.',
    })
    await expect(validate(dto, validationOptions)).resolves.toHaveLength(0)
    expect(dto.sku).toBe('PK-COL-BLU')
    expect(dto.parent_product_name).toBe('PetKo Collar')
    expect(dto.variant_attributes).toEqual({ color: 'Blue', size: 'Small' })
  })

  it.each([
    null,
    [],
    'Blue',
    { arbitrary: 'Blue' },
    { color: null },
    { color: 1 },
    { color: { name: 'Blue' } },
    { color: ['Blue'] },
    { color: '   ' },
    { color: 'B'.repeat(101) },
  ])(
    'rejects invalid variation attributes %p on create and patch',
    async (attributes) => {
      const create = plainToInstance(CreateProductDto, {
        ...product,
        variant_attributes: attributes,
      })
      const update = plainToInstance(UpdateProductDto, {
        variant_attributes: attributes,
      })
      expect(await validate(create, validationOptions)).not.toHaveLength(0)
      expect(await validate(update, validationOptions)).not.toHaveLength(0)
    },
  )

  it.each([
    { stock: 0.5 },
    { stock: -1 },
    { sku: 'S'.repeat(101) },
    { parent_product_name: 'P'.repeat(241) },
    { parent_product_name: null },
    { ingredients_materials: null },
    { usage_instructions: 'U'.repeat(10001) },
  ])('rejects invalid product data %p', async (fields) => {
    const dto = plainToInstance(CreateProductDto, { ...product, ...fields })
    expect(await validate(dto, validationOptions)).not.toHaveLength(0)
  })

  it('allows patch to clear optional details and remove a SKU', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      sku: null,
      parent_product_name: '',
      variant_attributes: {},
      ingredients_materials: '',
    })
    await expect(validate(dto, validationOptions)).resolves.toHaveLength(0)
  })
})
