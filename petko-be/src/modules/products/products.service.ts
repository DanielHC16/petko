import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import type { PostgrestError } from '@supabase/supabase-js'
import { SupabaseService } from '@/supabase/supabase.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import type { VariantAttributesDto } from './dto/product-details.dto'

export interface ProductEntity {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  pet_type: 'cat' | 'dog' | 'both'
  image_url: string
  is_active: boolean
  created_at: string
  sku: string | null
  parent_product_name: string
  variant_attributes: VariantAttributesDto
  ingredients_materials: string
  guaranteed_analysis: string
  usage_instructions: string
  safety_warnings: string
}

const PET_TYPES: readonly ProductEntity['pet_type'][] = ['cat', 'dog', 'both']

/** Characters with meaning in PostgREST filter syntax (`or=(...)`, `ilike` wildcards, quoting). */
const POSTGREST_RESERVED_CHARS = /[,()*%\\:"']/g

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(filters?: {
    category?: string
    pet_type?: string
    search?: string
    all?: boolean
  }): Promise<ProductEntity[]> {
    let query = this.supabase.admin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (!filters?.all) {
      query = query.eq('is_active', true)
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    // Only known pet types reach the raw PostgREST `or` filter; anything else is ignored.
    const petType = filters?.pet_type
    if (petType && this.isPetType(petType)) {
      query = query.or(`pet_type.eq.${petType},pet_type.eq.both`)
    }

    const term = this.sanitizeSearchTerm(filters?.search)
    if (term) {
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      this.logDbError('findAll', error)
      throw new BadRequestException(
        'Could not load products. Please try again.',
      )
    }

    return (data as ProductEntity[]) || []
  }

  async findById(id: string): Promise<ProductEntity> {
    const { data, error } = await this.supabase.admin
      .from('products')
      .select('*')
      .eq('id', id)
      .single<ProductEntity>()

    if (error || !data) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }

    return data
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    const isActive = dto.stock <= 0 ? false : (dto.is_active ?? true)
    const parentName = dto.parent_product_name?.trim() || ''
    const { data, error } = await this.supabase.admin
      .from('products')
      .insert({
        name: parentName
          ? this.variantName(parentName, dto.variant_attributes ?? {})
          : dto.name.trim(),
        description: dto.description?.trim() || '',
        price: dto.price,
        stock: dto.stock,
        category: dto.category.toLowerCase().trim(),
        pet_type: dto.pet_type,
        image_url:
          dto.image_url?.trim() ||
          'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        is_active: isActive,
        sku: dto.sku?.trim() || null,
        parent_product_name: parentName,
        variant_attributes: dto.variant_attributes ?? {},
        ingredients_materials: dto.ingredients_materials?.trim() || '',
        guaranteed_analysis: dto.guaranteed_analysis?.trim() || '',
        usage_instructions: dto.usage_instructions?.trim() || '',
        safety_warnings: dto.safety_warnings?.trim() || '',
      })
      .select('*')
      .single<ProductEntity>()

    if (error || !data) {
      this.logDbError('create', error)
      this.throwIfDuplicateSku(error)
      throw new BadRequestException(
        'Could not create the product. Check the fields and try again.',
      )
    }

    return data
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const updatePayload: Record<string, unknown> = {}
    let current: ProductEntity | undefined

    if (dto.sku !== undefined) updatePayload.sku = dto.sku?.trim() || null
    if (dto.parent_product_name !== undefined)
      updatePayload.parent_product_name = dto.parent_product_name.trim()
    if (dto.variant_attributes !== undefined)
      updatePayload.variant_attributes = dto.variant_attributes
    if (dto.ingredients_materials !== undefined)
      updatePayload.ingredients_materials = dto.ingredients_materials.trim()
    if (dto.guaranteed_analysis !== undefined)
      updatePayload.guaranteed_analysis = dto.guaranteed_analysis.trim()
    if (dto.usage_instructions !== undefined)
      updatePayload.usage_instructions = dto.usage_instructions.trim()
    if (dto.safety_warnings !== undefined)
      updatePayload.safety_warnings = dto.safety_warnings.trim()

    if (dto.name !== undefined) updatePayload.name = dto.name.trim()
    if (
      dto.name !== undefined ||
      dto.parent_product_name !== undefined ||
      dto.variant_attributes !== undefined
    ) {
      current = await this.findById(id)
      const parentName = (
        dto.parent_product_name ??
        current.parent_product_name ??
        ''
      ).trim()
      if (parentName) {
        updatePayload.name = this.variantName(
          parentName,
          dto.variant_attributes ?? current.variant_attributes ?? {},
        )
      }
    }
    if (dto.description !== undefined)
      updatePayload.description = dto.description.trim()
    if (dto.price !== undefined) updatePayload.price = dto.price
    if (dto.stock !== undefined) {
      updatePayload.stock = dto.stock
      if (dto.stock <= 0) {
        updatePayload.is_active = false
      }
    }
    if (dto.category !== undefined)
      updatePayload.category = dto.category.toLowerCase().trim()
    if (dto.pet_type !== undefined) updatePayload.pet_type = dto.pet_type
    if (dto.image_url !== undefined)
      updatePayload.image_url = dto.image_url.trim()
    if (dto.is_active !== undefined) {
      if (dto.is_active) {
        if (dto.stock !== undefined && dto.stock <= 0) {
          throw new BadRequestException(
            'Cannot activate a product that is out of stock.',
          )
        }
        if (dto.stock === undefined) {
          current ??= await this.findById(id)
          if (current.stock <= 0) {
            throw new BadRequestException(
              'Cannot activate a product that is out of stock.',
            )
          }
        }
        updatePayload.is_active = true
      } else {
        updatePayload.is_active = false
      }
    }

    const { data, error } = await this.supabase.admin
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single<ProductEntity>()

    // PGRST116: `.single()` matched zero rows, i.e. the product does not exist.
    if (!data && (!error || error.code === 'PGRST116')) {
      throw new NotFoundException('Product not found')
    }
    if (error || !data) {
      this.logDbError('update', error)
      this.throwIfDuplicateSku(error)
      throw new BadRequestException(
        'Could not update the product. Check the fields and try again.',
      )
    }

    return data
  }

  async delete(id: string): Promise<{ message: string }> {
    const { error } = await this.supabase.admin
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      this.logDbError('delete', error)
      throw new BadRequestException(
        'Could not delete the product. It may be referenced by existing orders.',
      )
    }

    return { message: 'Product deleted successfully' }
  }

  /** Logs the raw Supabase error server-side; callers return a generic message. */
  private logDbError(operation: string, error: PostgrestError | null): void {
    this.logger.error(
      `products.${operation} failed: ${error?.code ?? 'no-code'} ${error?.message ?? 'no data returned'}`,
    )
  }

  private throwIfDuplicateSku(error: PostgrestError | null): void {
    if (error?.code === '23505') {
      throw new ConflictException('This SKU is already assigned to a product.')
    }
  }

  /** Cart and order snapshots use this name, so it must identify the selected SKU. */
  private variantName(
    parentName: string,
    attributes: VariantAttributesDto,
  ): string {
    const values = Object.values(attributes).filter(
      (value): value is string =>
        typeof value === 'string' && value.trim() !== '',
    )
    const label = [...new Set(values.map((value) => value.trim()))].join(' / ')
    return label ? `${parentName} (${label})` : parentName
  }

  /** Catalog counts for the admin dashboard (all products and active ones). */
  async countProducts(): Promise<{ total: number; active: number }> {
    const [totalResult, activeResult] = await Promise.all([
      this.supabase.admin
        .from('products')
        .select('id', { count: 'exact', head: true }),
      this.supabase.admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    const error = totalResult.error ?? activeResult.error
    if (error) {
      this.logDbError('countProducts', error)
      throw new BadRequestException(
        'Could not load product counts. Please try again.',
      )
    }

    return { total: totalResult.count ?? 0, active: activeResult.count ?? 0 }
  }

  private isPetType(value: string): value is ProductEntity['pet_type'] {
    return (PET_TYPES as readonly string[]).includes(value)
  }

  /** Strips PostgREST-reserved characters so user input cannot alter the filter. */
  private sanitizeSearchTerm(search?: string): string {
    return (search ?? '').replace(POSTGREST_RESERVED_CHARS, '').trim()
  }
}
