import { PRODUCT_DETAIL_FIELDS, VARIANT_FIELDS } from '@/lib/product-catalog'
import type { ProductContentForm } from './admin-product-form'


interface ProductFieldsProps {
  value: ProductContentForm
  onChange: (patch: Partial<ProductContentForm>) => void
}

const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-orange-50/50 px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

export default function AdminProductFields({ value, onChange }: ProductFieldsProps) {
  return (
    <>
      <fieldset className="space-y-4 rounded-xl border border-orange-200 p-4">
        <legend className="px-1 text-sm font-bold text-petko-blue">Product family & variation</legend>
        <p className="text-xs leading-relaxed text-gray-600">Each variation has its own price, photo, and stock. Use exactly the same parent product name to group variations together in the store. The product name is generated from the family and options so the cart and orders identify the variation. Leave the parent name blank for a standalone item.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product-sku" className="text-xs font-bold text-petko-blue">SKU</label>
            <input id="product-sku" value={value.sku} maxLength={100} className={inputClass}
              placeholder="e.g. PK-COL-BLU-13" onChange={(event) => onChange({ sku: event.target.value })} />
          </div>
          <div>
            <label htmlFor="product-parent" className="text-xs font-bold text-petko-blue">Parent product name</label>
            <input id="product-parent" value={value.parent_product_name} maxLength={240} className={inputClass}
              placeholder="e.g. PetKo Kuwintas ng Lambing Pet Collar" onChange={(event) => onChange({ parent_product_name: event.target.value })} />
          </div>
          {VARIANT_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={`product-variant-${key}`} className="text-xs font-bold text-petko-blue">{label}</label>
              <input id={`product-variant-${key}`} value={value.variant_attributes[key] || ''} maxLength={100} className={inputClass}
                onChange={(event) => onChange({ variant_attributes: { ...value.variant_attributes, [key]: event.target.value } })} />
            </div>
          ))}
        </div>
      </fieldset>
      {PRODUCT_DETAIL_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label htmlFor={`product-${key}`} className="text-xs font-bold text-petko-blue">{label}</label>
          <textarea id={`product-${key}`} rows={3} value={value[key]} maxLength={10000} className={inputClass}
            onChange={(event) => onChange({ [key]: event.target.value })} />
        </div>
      ))}
    </>
  )
}
