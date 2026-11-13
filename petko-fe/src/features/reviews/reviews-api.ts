import axios from 'axios'
import { api } from '@/lib/axios'
import type { ApiResponse } from '@/lib/api-types'
import { useAuthStore } from '@/store/auth.store'
import type { OwnReview, ProductReviewList, ReviewActor, ReviewContext, ReviewDraft, ReviewList, ReviewVisibility } from './review-types'

// Public reads never wait for a session or redirect because an old bearer token expired.
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: false })

export function reviewActorIsCurrent(actor: ReviewActor): boolean {
  const { session, profile, isLoading } = useAuthStore.getState()
  return !isLoading && session?.user.id === actor.userId && profile?.id === actor.userId && session.access_token === actor.token
}

function privateConfig(actor: ReviewActor, signal?: AbortSignal): { headers: { Authorization: string }; signal?: AbortSignal } {
  if (!reviewActorIsCurrent(actor)) throw new Error('Your account changed. Please reload and try again.')
  return { headers: { Authorization: `Bearer ${actor.token}` }, signal }
}

export async function fetchProductReviews(productId: string, page: number, signal: AbortSignal): Promise<ProductReviewList> {
  const response = await publicApi.get<ApiResponse<ProductReviewList>>(`/products/${productId}/reviews`, { params: { page, limit: 10 }, signal })
  return response.data.data
}

export async function fetchOwnReview(productId: string, actor: ReviewActor, signal: AbortSignal, orderId?: string): Promise<ReviewContext> {
  const response = await api.get<ApiResponse<ReviewContext>>(`/products/${productId}/reviews/me`, { ...privateConfig(actor, signal), params: orderId ? { order_id: orderId } : {} })
  return response.data.data
}

export async function saveReview(productId: string, actor: ReviewActor, orderItemId: string, draft: ReviewDraft, review: OwnReview | null, signal: AbortSignal): Promise<OwnReview> {
  const response = await api.post<ApiResponse<OwnReview>>(`/products/${productId}/reviews`, {
    order_item_id: orderItemId, rating: draft.rating, comment: draft.comment.trim(),
    ...(review ? { expected_version: review.version } : {}),
  }, privateConfig(actor, signal))
  return response.data.data
}

export async function withdrawReview(review: OwnReview, actor: ReviewActor, signal: AbortSignal): Promise<void> {
  await api.delete(`/reviews/${review.id}`, { ...privateConfig(actor, signal), params: { expected_version: review.version } })
}

export async function fetchAdminReviews(page: number, visibility: ReviewVisibility, actor: ReviewActor, signal: AbortSignal): Promise<ReviewList<OwnReview>> {
  const response = await api.get<ApiResponse<ReviewList<OwnReview>>>('/reviews/admin', { ...privateConfig(actor, signal), params: { page, limit: 20, visibility } })
  return response.data.data
}

export async function moderateReview(review: OwnReview, isHidden: boolean, actor: ReviewActor, signal: AbortSignal): Promise<OwnReview> {
  const response = await api.patch<ApiResponse<OwnReview>>(`/reviews/${review.id}/visibility`, { is_hidden: isHidden, expected_version: review.version }, privateConfig(actor, signal))
  return response.data.data
}
