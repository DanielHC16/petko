import { useCallback } from 'react'
import { fetchOwnReview, saveReview, withdrawReview } from './reviews-api'
import type { ReviewActor, ReviewContext, ReviewDraft } from './review-types'
import { useReviewResource, type ReviewResource } from './use-review-resource'
import { useReviewMutation } from './use-review-mutation'

interface OwnReviewResource extends ReviewResource<ReviewContext> {
  save: (draft: ReviewDraft) => Promise<boolean>
  withdraw: () => Promise<boolean>
  isPending: boolean
  mutationError: string | null
}

export function useOwnReview(productId: string, actor: ReviewActor, onChanged: () => void, orderId?: string): OwnReviewResource {
  const { userId, token } = actor
  const fetcher = useCallback((signal: AbortSignal) => fetchOwnReview(productId, { userId, token }, signal, orderId), [productId, userId, token, orderId])
  const resource = useReviewResource(`${actor.userId}:${actor.token}:${productId}:${orderId ?? ''}`, fetcher)
  const mutation = useReviewMutation(actor)

  async function save(draft: ReviewDraft): Promise<boolean> {
    const context = resource.data
    if (!context?.eligible || !context.order_item_id || resource.isLoading) return false
    const orderItemId = context.order_item_id
    const result = await mutation.run(signal => saveReview(productId, actor, orderItemId, draft, context.review, signal))
    if (!result) return false
    resource.replace({ ...context, review: result })
    onChanged()
    return true
  }
  async function withdraw(): Promise<boolean> {
    const context = resource.data
    const review = context?.review
    if (!context || !review || resource.isLoading) return false
    const result = await mutation.run(async signal => { await withdrawReview(review, actor, signal); return true })
    if (!result) return false
    // The successful write is authoritative even if the following refresh fails.
    resource.replace({ ...context, review: { ...review, version: review.version + 1, withdrawn_at: new Date().toISOString() } })
    onChanged()
    resource.refresh()
    return true
  }
  return { ...resource, save, withdraw, isPending: mutation.isPending, mutationError: mutation.error }
}
