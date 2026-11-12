import type { VariantAttributes } from '@/lib/product-catalog'

export interface ProductContentForm {
  sku: string
  parent_product_name: string
  variant_attributes: VariantAttributes
  ingredients_materials: string
  guaranteed_analysis: string
  usage_instructions: string
  safety_warnings: string
}

export const EMPTY_PRODUCT_CONTENT: ProductContentForm = {
  sku: '', parent_product_name: '', variant_attributes: {},
  ingredients_materials: '', guaranteed_analysis: '', usage_instructions: '', safety_warnings: '',
}

