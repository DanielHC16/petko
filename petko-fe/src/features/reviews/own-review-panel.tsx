import { Link } from 'react-router-dom'
import { useShoppingSession } from '@/hooks/use-shopping-session'
import { loginPath } from '@/lib/auth-redirect'
import type { ReviewActor } from './review-types'
import { useOwnReview } from './use-own-review'
import ReviewEditor from './review-editor'

interface OwnReviewPanelProps { productId: string; orderId?: string; onChanged: () => void }

function CustomerReview({ productId, orderId, actor, onChanged }: OwnReviewPanelProps & { actor: ReviewActor }) {
  const own = useOwnReview(productId, actor, onChanged, orderId)
  if (!own.data) return <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
    {own.error ? <div role="alert"><p>{own.error}</p><button type="button" onClick={own.refresh} className="mt-2 font-bold text-petko-blue underline">Try loading your review again</button></div> : <p role="status">Checking your purchased product…</p>}
  </div>
  if (!own.data.eligible) return <p className="rounded-xl bg-blue-50 p-4 text-sm text-petko-blue">{own.data.reason === 'receipt_required' ? 'You can review this product after you receive your order and confirm receipt from Your Orders.' : 'Reviews are available to customers who purchased this product and confirmed receipt.'} <Link to="/orders" className="font-bold underline">View your orders</Link></p>
  return <ReviewEditor review={own.data.review} isPending={own.isPending} isLoading={own.isLoading} error={own.mutationError || own.error} onSave={own.save} onWithdraw={own.withdraw} onRefresh={own.refresh} />
}

export default function OwnReviewPanel(props: OwnReviewPanelProps) {
  const { userId, token, isLoading } = useShoppingSession()
  if (isLoading) return <p role="status" className="text-sm text-gray-600">Loading your account…</p>
  if (!userId || !token) return <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700">
    <p>Purchased this product? Sign in to leave a review after confirming receipt.</p>
    <Link to={loginPath(`/products/${props.productId}#reviews`)} className="mt-3 inline-flex rounded-xl bg-petko-blue px-4 py-2.5 font-bold text-white hover:bg-petko-blue-dark focus-visible:ring-2 focus-visible:ring-orange-500">Sign in / Sign up to review</Link>
  </div>
  return <CustomerReview key={`${userId}:${token}:${props.productId}:${props.orderId ?? ''}`} {...props} actor={{ userId, token }} />
}
