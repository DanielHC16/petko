import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchProductById,
  fetchProducts,
  fetchProductVariants,
  type Product,
} from './products-api'
import {
  groupProductFamilies,
  productFamilyKey,
  type ProductFamily,
} from '@/lib/product-catalog'
import { getApiErrorMessage } from '@/lib/api-error'

export type ProductDetailStatus = 'loading' | 'ready' | 'error'

export interface ProductDetailResult {
  product: Product | null
  variants: Product[]
  suggestions: ProductFamily[]
  status: ProductDetailStatus
  error: string | null
  retry: () => void
}

interface FamilyCache {
  familyKey: string
  variants: Product[]
  productsById: Map<string, Product>
}

/**
 * Hook managing product detail state and seamless family variation caching.
 * Resolves cached sibling variations synchronously from the route ID without
 * flashing full-page loaders or re-fetching sibling/recommendation queries.
 */
export function useProductDetail(id: string | undefined): ProductDetailResult {
  const [familyCache, setFamilyCache] = useState<FamilyCache | null>(null)
  const [suggestions, setSuggestions] = useState<ProductFamily[]>([])
  const [error, setError] = useState<string | null>(null)
  const [retryCounter, setRetryCounter] = useState<number>(0)

  const requestGenRef = useRef<number>(0)
  const recommendationGenRef = useRef<number>(0)
  const currentFamilyKeyRef = useRef<string | null>(null)
  const prefetchedImagesRef = useRef<Set<string>>(new Set())

  // Synchronous resolution of the selected product from current family cache
  const selectedProduct = (id && familyCache?.productsById.get(id)) || null
  const isCached = selectedProduct !== null

  let status: ProductDetailStatus = 'loading'
  if (isCached) {
    status = 'ready'
  } else if (error) {
    status = 'error'
  } else {
    status = 'loading'
  }

  // Do not expose a previous family's product under an uncached or error route
  const product = isCached ? selectedProduct : null
  const variants = isCached && familyCache ? familyCache.variants : []

  // Recommendation loading: family-scoped, unaffected by sibling switches
  const loadRecommendations = useCallback(async (data: Product, fKey: string) => {
    if (currentFamilyKeyRef.current === fKey) {
      return
    }
    currentFamilyKeyRef.current = fKey
    setSuggestions([])

    const recGen = ++recommendationGenRef.current

    try {
      const relatedData = await fetchProducts({
        category: data.category,
        pet_type: data.pet_type,
      })

      if (recGen === recommendationGenRef.current) {
        const related = groupProductFamilies(
          relatedData.filter((p) => productFamilyKey(p) !== fKey),
        ).slice(0, 4)
        setSuggestions(related)
      }
    } catch (recErr) {
      console.error('Failed to load suggestions', recErr)
      // A failed recommendation request does not block the product or purchase actions
    }
  }, [])

  // Cold load or family-switch load effect
  useEffect(() => {
    if (!id) return
    const productId = id

    // If already in the current family cache, do not re-fetch
    if (familyCache?.productsById.has(productId)) {
      return
    }

    const currentGen = ++requestGenRef.current
    let isMounted = true

    async function loadFamily(): Promise<void> {
      try {
        const data = await fetchProductById(productId)
        if (!isMounted || currentGen !== requestGenRef.current) return

        let familyVariants: Product[] = [data]
        try {
          const variantsData = await fetchProductVariants(data)
          if (variantsData.length > 0) {
            familyVariants = variantsData
          }
        } catch (variantErr) {
          console.error('Failed to load variants, falling back to primary product', variantErr)
        }

        if (!isMounted || currentGen !== requestGenRef.current) return

        // Ensure requested product is always in variants and dictionary
        const allVariants = familyVariants.some((v) => v.id === data.id)
          ? familyVariants
          : [data, ...familyVariants]

        const productsById = new Map<string, Product>()
        for (const v of allVariants) {
          productsById.set(v.id, v)
        }
        productsById.set(data.id, data)

        const fKey = productFamilyKey(data)

        // Prefetch family image URLs once
        for (const v of allVariants) {
          if (v.image_url && !prefetchedImagesRef.current.has(v.image_url)) {
            prefetchedImagesRef.current.add(v.image_url)
            const img = new Image()
            img.src = v.image_url
          }
        }

        setFamilyCache({
          familyKey: fKey,
          variants: allVariants,
          productsById,
        })
        setError(null)

        // Trigger family recommendations
        loadRecommendations(data, fKey)
      } catch (err: unknown) {
        if (!isMounted || currentGen !== requestGenRef.current) return
        setError(getApiErrorMessage(err, 'Product not found'))
      }
    }

    loadFamily()

    return () => {
      isMounted = false
    }
  }, [id, retryCounter, familyCache, loadRecommendations])

  const retry = useCallback(() => {
    setError(null)
    setRetryCounter((c) => c + 1)
  }, [])

  return {
    product,
    variants,
    suggestions: isCached ? suggestions : [],
    status,
    error,
    retry,
  }
}
