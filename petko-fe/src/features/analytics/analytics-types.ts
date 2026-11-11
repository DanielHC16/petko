export type AnalyticsPage = 'login' | 'catalog' | 'product' | 'cart' | 'checkout' | 'orders' | 'identify'

export interface AnalyticsRange {
  start: string
  end: string
}

export interface AnalyticsDay {
  date: string
  placedOrders: number
  placedValue: number
  completedOrders: number
  completedSales: number
  sessions: number
  pageViews: number
}

export interface AnalyticsReport {
  range: AnalyticsRange & { timezone: 'Asia/Manila' }
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
  daily: AnalyticsDay[]
  topProducts: { productId: string; name: string; units: number; placedValue: number }[]
}
