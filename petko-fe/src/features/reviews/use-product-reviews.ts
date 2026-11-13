import { useCallback } from 'react'
import { fetchProductReviews } from './reviews-api'
import type { ProductReviewList } from './review-types'
import { useReviewResource, type ReviewResource } from './use-review-resource'

export function useProductReviews(productId: string, page: number): ReviewResource<ProductReviewList> {
  const fetcher = useCallback((signal: AbortSignal) => fetchProductReviews(productId, page, signal), [productId, page])
  return useReviewResource(`${productId}:${page}`, fetcher)
}
