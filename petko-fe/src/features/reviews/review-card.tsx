import { BadgeCheck } from 'lucide-react'
import { PawRating } from '@/components/ui/paw-rating'
import type { PublicReview } from './review-types'
import { reviewDate } from './review-validation'

export default function ReviewCard({ review }: { review: PublicReview }) {
  return <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1"><p className="break-words font-bold text-petko-blue [overflow-wrap:anywhere]">{review.author_name}</p><span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-green-800"><BadgeCheck size={14} aria-hidden="true" />Verified purchase</span></div>
      <time dateTime={review.created_at} className="shrink-0 text-xs text-gray-500">{reviewDate(review.created_at)}</time>
    </div>
    <div className="my-3"><PawRating value={review.rating} /></div>
    <p className="mb-2 break-words text-xs font-semibold text-gray-500">Variant: {review.variant_label || review.product_name}</p>
    {review.comment && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">{review.comment}</p>}
  </article>
}
