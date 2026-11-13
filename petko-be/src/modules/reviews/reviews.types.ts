export interface PublicReview {
  id: string
  product_id: string
  product_name: string
  variant_label: string
  author_name: string
  rating: number
  comment: string
  created_at: string
  updated_at: string
}

export interface OwnReview extends PublicReview {
  version: number
  is_hidden: boolean
  withdrawn_at: string | null
}

export interface ReviewPage<T> {
  reviews: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PublicReviewPage extends ReviewPage<PublicReview> {
  scope: 'family' | 'product'
  summary: {
    average_rating: number | null
    total_reviews: number
    ratings: Record<1 | 2 | 3 | 4 | 5, number>
  }
}

export interface ReviewContext {
  eligible: boolean
  reason: 'eligible' | 'purchase_required' | 'receipt_required'
  order_item_id: string | null
  review: OwnReview | null
}
