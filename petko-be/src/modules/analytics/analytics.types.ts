export const ANALYTICS_PAGES = [
  'login',
  'catalog',
  'product',
  'cart',
  'checkout',
  'orders',
  'identify',
] as const

export type AnalyticsPage = (typeof ANALYTICS_PAGES)[number]

export interface AnalyticsDaily {
  date: string
  placedOrders: number
  placedValue: number
  completedOrders: number
  completedSales: number
  sessions: number
  pageViews: number
}

export interface AnalyticsReport {
  range: { start: string; end: string; timezone: 'Asia/Manila' }
  generatedAt: string
  collectionStartedAt: string
  summary: {
    placedOrders: number
    placedValue: number
    completedOrders: number
    completedSales: number
    buyers: number
    newBuyers: number
    returningBuyers: number
    sessions: number
    guestSessions: number
    customerSessions: number
    pageViews: number
    guestPageViews: number
    customerPageViews: number
  }
  daily: AnalyticsDaily[]
  topProducts: {
    productId: string
    name: string
    units: number
    placedValue: number
  }[]
}
