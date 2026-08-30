import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { SupabaseService } from '@/supabase/supabase.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'

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
}

@Injectable()
export class ProductsService {
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

    if (filters?.pet_type && filters.pet_type !== 'all') {
      query = query.or(`pet_type.eq.${filters.pet_type},pet_type.eq.both`)
    }

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim()
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      throw new BadRequestException(`Failed to fetch products: ${error.message}`)
    }

    return (data as ProductEntity[]) || []
  }

  async findById(id: string): Promise<ProductEntity> {
    const { data, error } = await this.supabase.admin
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }

    return data as ProductEntity
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    const { data, error } = await this.supabase.admin
      .from('products')
      .insert({
        name: dto.name.trim(),
        description: dto.description?.trim() || '',
        price: dto.price,
        stock: dto.stock,
        category: dto.category.toLowerCase().trim(),
        pet_type: dto.pet_type,
        image_url:
          dto.image_url?.trim() ||
          'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        is_active: dto.is_active ?? true,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new BadRequestException(
        `Failed to create product: ${error?.message}`,
      )
    }

    return data as ProductEntity
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const updatePayload: Record<string, unknown> = {}

    if (dto.name !== undefined) updatePayload.name = dto.name.trim()
    if (dto.description !== undefined)
      updatePayload.description = dto.description.trim()
    if (dto.price !== undefined) updatePayload.price = dto.price
    if (dto.stock !== undefined) updatePayload.stock = dto.stock
    if (dto.category !== undefined)
      updatePayload.category = dto.category.toLowerCase().trim()
    if (dto.pet_type !== undefined) updatePayload.pet_type = dto.pet_type
    if (dto.image_url !== undefined)
      updatePayload.image_url = dto.image_url.trim()
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active

    const { data, error } = await this.supabase.admin
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      throw new NotFoundException(
        `Failed to update product ${id}: ${error?.message || 'Not found'}`,
      )
    }

    return data as ProductEntity
  }

  async delete(id: string): Promise<{ message: string }> {
    const { error } = await this.supabase.admin
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      throw new BadRequestException(
        `Failed to delete product ${id}: ${error.message}`,
      )
    }

    return { message: `Product ${id} deleted successfully` }
  }
}
