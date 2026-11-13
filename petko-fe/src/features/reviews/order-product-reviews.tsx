import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import type { OrderDetail } from '@/lib/order-types'
import OwnReviewPanel from './own-review-panel'

export default function OrderProductReviews({ order }: { order: OrderDetail }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [visible, setVisible] = useState(5)
  const onChanged = useCallback((): void => {}, [])
  if (!order.delivery_confirmed_at || order.fulfillment_status === 'cancelled') return null
  const products = order.items.filter((item, index, items) => items.findIndex(other => other.product_id === item.product_id) === index)
  return <section aria-label="Review your purchased products" className="mt-5 rounded-2xl border border-orange-200 bg-white p-4 sm:p-6">
    <h2 className="font-display text-lg font-extrabold text-petko-blue">How did your pet like it?</h2><p className="mb-4 mt-1 text-sm text-gray-600">Share a paw rating for the products you received.</p>
    <div className="space-y-3">{products.slice(0, visible).map(item => <div key={item.product_id} className="min-w-0 rounded-xl border border-gray-200 p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/products/${item.product_id}#reviews`} className="min-w-0 flex-1 break-words text-sm font-bold text-petko-blue hover:underline">{item.product_name}</Link><button type="button" aria-expanded={expanded === item.product_id} onClick={() => setExpanded(value => value === item.product_id ? null : item.product_id)} className="rounded-lg bg-petko-blue px-3 py-2 text-xs font-bold text-white focus-visible:ring-2 focus-visible:ring-orange-500">{expanded === item.product_id ? 'Close review' : 'Review product'}</button></div>{expanded === item.product_id && <div className="mt-4"><OwnReviewPanel productId={item.product_id} orderId={order.id} onChanged={onChanged} /></div>}</div>)}</div>
    {visible < products.length && <button type="button" onClick={() => setVisible(value => value + 5)} className="mt-4 text-sm font-bold text-petko-blue underline">Show more products</button>}
  </section>
}
