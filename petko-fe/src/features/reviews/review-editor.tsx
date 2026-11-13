import { useId, useState } from 'react'
import { PawRatingInput } from '@/components/ui/paw-rating'
import OrderActionDialog from '@/components/orders/order-action-dialog'
import type { OwnReview, ReviewDraft } from './review-types'
import { REVIEW_COMMENT_LIMIT, validateReview } from './review-validation'

interface ReviewEditorProps {
  review: OwnReview | null
  isPending: boolean
  isLoading: boolean
  error: string | null
  onSave: (draft: ReviewDraft) => Promise<boolean>
  onWithdraw: () => Promise<boolean>
  onRefresh: () => void
}

export default function ReviewEditor({ review, isPending, isLoading, error, onSave, onWithdraw, onRefresh }: ReviewEditorProps) {
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [comment, setComment] = useState(review?.comment ?? '')
  const [validation, setValidation] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const id = useId()
  const disabled = isPending || isLoading
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (disabled) return
    const problem = validateReview({ rating, comment })
    setValidation(problem)
    setSuccess('')
    if (problem) return
    if (await onSave({ rating, comment })) setSuccess('Your review has been saved. Thank you for sharing!')
  }
  return <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
    <h3 className="font-display text-lg font-extrabold text-petko-blue">{review && !review.withdrawn_at ? 'Your review' : 'Share your pet’s experience'}</h3>
    <p className="mb-4 mt-1 text-xs text-gray-600">Your purchase is verified. One review per customer for this product variant.</p>
    {review?.is_hidden && <p className="mb-3 rounded-lg border border-orange-300 bg-white p-3 text-sm text-orange-900">An admin has hidden this review. You can edit it, but it will stay hidden until an admin restores it.</p>}
    {review?.withdrawn_at && <p className="mb-3 text-sm text-gray-700">You removed this review from public view. You can publish it again below.</p>}
    <form onSubmit={submit} className="space-y-4">
      <PawRatingInput value={rating} onChange={value => { setRating(value); setSuccess('') }} disabled={disabled} />
      <div>
        <label htmlFor={id} className="mb-2 block text-sm font-bold text-petko-blue">Review <span className="font-normal text-gray-500">(optional)</span></label>
        <textarea id={id} value={comment} onChange={event => { setComment(event.target.value); setSuccess('') }} disabled={disabled} maxLength={REVIEW_COMMENT_LIMIT} rows={4} placeholder="What did you and your pet like about this product?" className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20 disabled:opacity-60" />
        <p className="mt-1 text-right text-xs text-gray-500">{[...comment].length.toLocaleString()} / 2,000</p>
      </div>
      {(validation || error) && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800"><p>{validation || error}</p>{error && <button type="button" disabled={disabled} onClick={onRefresh} className="mt-2 font-bold underline">Refresh review details</button>}</div>}
      {success && <p role="status" className="text-sm font-semibold text-green-800">{success}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={disabled} className="rounded-xl bg-petko-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-petko-blue-dark focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{isPending ? 'Saving…' : review && !review.withdrawn_at ? 'Update review' : 'Publish review'}</button>
        {review && !review.withdrawn_at && <button type="button" disabled={disabled} onClick={() => setConfirmRemove(true)} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 underline focus-visible:ring-2 focus-visible:ring-petko-blue disabled:opacity-50">Remove review</button>}
      </div>
    </form>
    {confirmRemove && <OrderActionDialog title="Remove your review?" description="Your rating and comment will no longer appear publicly. You can publish your review again later." confirmLabel="Remove review" confirmVariant="danger" isPending={isPending} error={error} onClose={() => setConfirmRemove(false)} onSubmit={async () => { const removed = await onWithdraw(); if (removed) setSuccess('Your review has been removed from public view.'); return removed }} />}
  </div>
}
