import { useState } from 'react'
import { PawPrint } from 'lucide-react'
import { PawRating } from '@/components/ui/paw-rating'
import type { Product } from '@/lib/product-catalog'
import { useProductReviews } from './use-product-reviews'
import OwnReviewPanel from './own-review-panel'
import ReviewCard from './review-card'

export default function ProductReviews({ product }: { product: Product }) {
  const [page, setPage] = useState(1)
  const resource = useProductReviews(product.id, page)
  const summary = resource.data?.summary
  const pageCount = Math.max(1, resource.data?.totalPages ?? 1)
  return <section id="reviews" aria-labelledby="product-reviews-title" className="mt-6 scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-md sm:mt-8 sm:p-8">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
      <div><h2 id="product-reviews-title" className="flex items-center gap-2 font-display text-xl font-extrabold text-petko-blue"><PawPrint size={23} aria-hidden="true" />Customer reviews</h2><p className="mt-1 text-xs text-gray-500">Real feedback from verified purchases{resource.data?.scope === 'family' ? ' across all variants' : ''}.</p></div>
      <button type="button" disabled={resource.isLoading} onClick={resource.refresh} className="rounded-lg px-3 py-2 text-sm font-bold text-petko-blue underline focus-visible:ring-2 focus-visible:ring-petko-blue disabled:opacity-50">Refresh reviews</button>
    </div>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-5">
        {summary && <div className="rounded-2xl bg-petko-cream/50 p-5">
          {summary.total_reviews > 0 && summary.average_rating !== null ? <><p className="font-display text-4xl font-extrabold text-petko-blue">{Number(summary.average_rating).toFixed(1)} <span className="text-base text-gray-500">/ 5</span></p><div className="my-2"><PawRating value={Number(summary.average_rating)} /></div><p className="text-sm text-gray-600">{summary.total_reviews} {summary.total_reviews === 1 ? 'review' : 'reviews'}</p></> : <p className="font-semibold text-petko-blue">No ratings yet</p>}
          <dl aria-label="Rating distribution" className="mt-4 space-y-2">
            {([5, 4, 3, 2, 1] as const).map(rating => <div key={rating} className="flex items-center gap-2 text-xs text-gray-700"><dt className="flex w-12 shrink-0 items-center gap-1">{rating}<PawPrint size={12} aria-hidden="true" /></dt><dd className="flex flex-1 items-center gap-2"><span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${summary.total_reviews ? summary.ratings[rating] / summary.total_reviews * 100 : 0}%` }} /></span><span className="w-6 text-right">{summary.ratings[rating]}</span></dd></div>)}
          </dl>
        </div>}
        <OwnReviewPanel productId={product.id} onChanged={resource.refresh} />
      </div>
      <div className="min-w-0 space-y-4" aria-busy={resource.isLoading}>
        {resource.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{resource.error}</p><button type="button" onClick={resource.refresh} className="mt-2 font-bold underline">Try loading reviews again</button></div>}
        {resource.isLoading && <p role="status" className="py-4 text-sm text-gray-500">Loading reviews…</p>}
        {resource.data && resource.data.reviews.length === 0 && !resource.isLoading && <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-5 py-10 text-center"><PawPrint className="mx-auto mb-3 text-orange-700" size={32} aria-hidden="true" /><h3 className="font-display font-bold text-petko-blue">{resource.data.total === 0 ? 'Be the first to share a review' : 'No reviews on this page'}</h3><p className="mt-2 text-sm text-gray-600">{resource.data.total === 0 ? 'Your pet’s experience can help other pet parents choose.' : 'Choose an earlier page to read more reviews.'}</p></div>}
        {resource.data?.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
        {resource.data && (pageCount > 1 || page > 1) && <nav aria-label="Review pages" className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs"><button type="button" disabled={page <= 1 || resource.isLoading} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-gray-300 px-3 py-2 font-bold disabled:opacity-40">Previous reviews</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount || resource.isLoading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-gray-300 px-3 py-2 font-bold disabled:opacity-40">Next reviews</button></nav>}
      </div>
    </div>
  </section>
}
