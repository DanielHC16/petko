import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, PawPrint } from 'lucide-react'
import PageBanner from '@/components/layout/PageBanner'
import OrderActionDialog from '@/components/orders/order-action-dialog'
import { PawRating } from '@/components/ui/paw-rating'
import { useShoppingSession } from '@/hooks/use-shopping-session'
import { fetchAdminReviews, moderateReview } from './reviews-api'
import type { OwnReview, ReviewActor, ReviewVisibility } from './review-types'
import { useReviewResource } from './use-review-resource'
import { useReviewMutation } from './use-review-mutation'
import { reviewDate } from './review-validation'

function AdminReviews({ actor }: { actor: ReviewActor }) {
  const { userId, token } = actor
  const [params, setParams] = useSearchParams()
  const requestedPage = Number(params.get('page') ?? '1')
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100000 ? requestedPage : 1
  const requestedVisibility = params.get('visibility')
  const visibility: ReviewVisibility = requestedVisibility === 'visible' || requestedVisibility === 'hidden' ? requestedVisibility : 'all'
  const fetcher = useCallback((signal: AbortSignal) => fetchAdminReviews(page, visibility, { userId, token }, signal), [page, visibility, userId, token])
  const resource = useReviewResource(`${actor.userId}:${page}:${visibility}`, fetcher)
  const mutation = useReviewMutation(actor)
  const [target, setTarget] = useState<OwnReview | null>(null)
  const pageCount = Math.max(1, resource.data?.totalPages ?? 1)
  function changePage(next: number): void { setParams({ page: String(next), visibility }) }
  return <div className="min-h-screen bg-petko-cream px-6 pb-10 pt-6 lg:px-10 lg:pt-10">
    <PageBanner title="Product Reviews" subtitle="Help keep customer feedback useful and respectful." />
    <div className="mx-auto mt-5 max-w-6xl space-y-5">
      <Link to="/admin" className="inline-flex rounded-lg bg-petko-blue px-3 py-2 text-xs font-bold text-white hover:bg-petko-blue-dark">← Back to Admin Portal</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-orange-200 bg-white p-4 sm:p-5"><div><label htmlFor="review-visibility" className="mb-2 block text-sm font-bold text-petko-blue">Review visibility</label><select id="review-visibility" value={visibility} disabled={mutation.isPending} onChange={event => setParams({ visibility: event.target.value, page: '1' })} className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus-visible:ring-2 focus-visible:ring-petko-blue"><option value="all">All reviews</option><option value="visible">Visible reviews</option><option value="hidden">Hidden reviews</option></select></div><button type="button" disabled={resource.isLoading || mutation.isPending} onClick={resource.refresh} className="rounded-xl border border-petko-blue px-4 py-2.5 text-sm font-bold text-petko-blue disabled:opacity-50">Refresh reviews</button></div>
      <p className="text-sm text-gray-600">Only customers can edit their rating or comment. Hidden and removed reviews do not contribute to public ratings.</p>
      {(resource.error || mutation.error) && !target && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{resource.error || mutation.error}</p><button type="button" onClick={resource.refresh} className="mt-2 font-bold underline">Reload reviews</button></div>}
      {resource.isLoading && <p role="status" className="text-sm text-petko-blue">Loading customer reviews…</p>}
      {resource.data && resource.data.reviews.length === 0 && <div className="rounded-2xl border border-dashed border-orange-300 bg-white p-10 text-center"><PawPrint size={36} aria-hidden="true" className="mx-auto text-orange-700" /><h2 className="mt-3 font-display text-lg font-bold text-petko-blue">No reviews to show</h2><p className="mt-1 text-sm text-gray-600">Customer reviews will appear here after they are submitted.</p></div>}
      <div className="space-y-4">{resource.data?.reviews.map(review => <article key={review.id} className="min-w-0 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><Link to={`/products/${review.product_id}#reviews`} className="break-words font-display text-lg font-extrabold text-petko-blue hover:underline">{review.product_name}</Link><p className="mt-1 break-words text-xs text-gray-500">{review.variant_label} · {review.author_name} · {reviewDate(review.created_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${review.withdrawn_at ? 'bg-gray-100 text-gray-700' : review.is_hidden ? 'bg-orange-100 text-orange-900' : 'bg-green-100 text-green-800'}`}>{review.withdrawn_at ? 'Removed by customer' : review.is_hidden ? 'Hidden' : 'Visible'}</span></div><div className="my-3"><PawRating value={review.rating} /></div>{review.comment ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">{review.comment}</p> : <p className="text-sm italic text-gray-500">Rating only</p>}<button type="button" disabled={mutation.isPending || resource.isLoading} onClick={() => setTarget(review)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-petko-blue px-4 py-2 text-sm font-bold text-petko-blue focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{review.is_hidden ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}{review.is_hidden ? 'Restore review' : 'Hide review'}</button></article>)}</div>
      {resource.data && <nav aria-label="Admin review pages" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 text-xs"><button type="button" disabled={page <= 1 || resource.isLoading || mutation.isPending} onClick={() => changePage(page - 1)} className="rounded-lg border border-gray-300 px-3 py-2 font-bold disabled:opacity-40">Previous</button><span>Page {page} of {pageCount} · {resource.data.total} reviews</span><button type="button" disabled={page >= pageCount || resource.isLoading || mutation.isPending} onClick={() => changePage(page + 1)} className="rounded-lg border border-gray-300 px-3 py-2 font-bold disabled:opacity-40">Next</button></nav>}
    </div>
    {target && <OrderActionDialog title={target.is_hidden ? 'Restore this review?' : 'Hide this review?'} description={target.is_hidden ? 'This review will appear publicly and contribute to the rating, unless the customer has removed it.' : 'This review will be removed from public view and excluded from the rating. Its author can still see and edit it.'} confirmLabel={target.is_hidden ? 'Restore review' : 'Hide review'} isPending={mutation.isPending} error={mutation.error} onClose={() => setTarget(null)} onSubmit={async () => { const result = await mutation.run(signal => moderateReview(target, !target.is_hidden, actor, signal)); if (!result) return false; resource.refresh(); return true }} />}
  </div>
}

export default function AdminReviewsPage() {
  const { userId, token } = useShoppingSession()
  return userId && token ? <AdminReviews key={`${userId}:${token}`} actor={{ userId, token }} /> : <p role="status" className="p-6 text-sm text-petko-blue">Loading your account…</p>
}
