import { api } from './axios'
import type { ApiResponse } from './api-types'
import type {
  OrderAction,
  OrderDetail,
  OrderList,
  OrderListQuery,
  PlaceOrderInput,
} from './order-types'

export async function fetchOrders(
  query: OrderListQuery,
  admin: boolean,
  signal?: AbortSignal,
): Promise<OrderList> {
  const { data } = await api.get<ApiResponse<OrderList>>(
    admin ? '/orders/admin/all' : '/orders',
    { params: query, signal },
  )
  return data.data
}

export async function fetchOrder(
  id: string,
  admin: boolean,
  signal?: AbortSignal,
): Promise<OrderDetail> {
  const { data } = await api.get<ApiResponse<OrderDetail>>(
    admin ? `/orders/admin/${id}` : `/orders/${id}`,
    { signal },
  )
  return data.data
}

export async function placeOrder(input: PlaceOrderInput, accessToken: string): Promise<OrderDetail> {
  const { data } = await api.post<ApiResponse<OrderDetail>>('/orders', input, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data.data
}

export async function updateOrder(
  order: OrderDetail,
  action: OrderAction,
): Promise<OrderDetail> {
  const expected_version = order.tracking_version
  if (action.type === 'fulfillment') {
    const { type: _type, ...fields } = action
    const { data } = await api.patch<ApiResponse<OrderDetail>>(
      `/orders/${order.id}/fulfillment`,
      { ...fields, expected_version },
    )
    return data.data
  }
  const paths = {
    confirm: 'confirm-receipt',
    report: 'delivery-issue',
    resolve: 'resolve-delivery-issue',
    cancel: 'cancel',
  }
  const body =
    action.type === 'report'
      ? { message: action.message }
      : action.type === 'resolve'
        ? { resolution: action.resolution }
        : action.type === 'cancel'
          ? { reason: action.reason }
          : {}
  const { data } = await api.post<ApiResponse<OrderDetail>>(
    `/orders/${order.id}/${paths[action.type]}`,
    { ...body, expected_version },
  )
  return data.data
}
