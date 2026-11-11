import type { UserProfile } from '@/store/auth.store'
import { recordAnalyticsEvent } from './analytics-api'
import type { AnalyticsPage } from './analytics-types'

const STORAGE_KEY = 'petko.analytics.session.v1'
const IDLE_MS = 30 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface BrowserSession {
  id: string
  lastActivity: number
  userId: string | null
  role: 'admin' | 'customer' | null
  identified: boolean
}

interface Observation {
  navigationKey: string
  path: string
  actor: UserProfile | null
  token: string | null
}

interface PendingView extends Observation { session: BrowserSession }

let session: BrowserSession | null = null
let storageLoaded = false
let lastObservation = ''
let pending: PendingView | null = null
let processing = false
const identities = new WeakMap<BrowserSession, Promise<void>>()
const rotations = new WeakMap<BrowserSession, Promise<void>>()

async function save(current: BrowserSession): Promise<void> {
  // Keep the previous session in storage until its required identity attempt finishes.
  await rotations.get(current)
  if (session !== current) return
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current)) } catch { /* Memory fallback. */ }
}

function getSession(): BrowserSession {
  if (!storageLoaded) {
    storageLoaded = true
    try {
      const stored: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null')
      if (stored && typeof stored === 'object' && 'id' in stored && typeof stored.id === 'string' && UUID.test(stored.id)
        && 'lastActivity' in stored && typeof stored.lastActivity === 'number' && Number.isFinite(stored.lastActivity)
        && 'userId' in stored && (stored.userId === null || typeof stored.userId === 'string')
        && 'role' in stored && (stored.role === null || stored.role === 'admin' || stored.role === 'customer')
        && 'identified' in stored && typeof stored.identified === 'boolean') {
        session = { id: stored.id, lastActivity: stored.lastActivity, userId: stored.userId, role: stored.role, identified: stored.identified }
      }
    } catch { /* Unavailable/invalid storage must never block the storefront. */ }
  }
  if (!session) session = freshSession()
  return session
}

function freshSession(): BrowserSession {
  return { id: crypto.randomUUID(), lastActivity: Date.now(), userId: null, role: null, identified: false }
}

function pageFor(path: string): AnalyticsPage | null {
  if (path === '/login') return 'login'
  if (path === '/') return 'catalog'
  if (path.startsWith('/products/') && UUID.test(path.slice('/products/'.length))) return 'product'
  if (path === '/cart') return 'cart'
  if (path === '/checkout') return 'checkout'
  if (path === '/orders') return 'orders'
  return null
}

function identify(current: BrowserSession, actor: UserProfile, token: string): void {
  const sameIdentity = current.userId === actor.id && current.role === actor.role
  if (sameIdentity && (identities.has(current) || current.identified)) return
  const priorIdentity = identities.get(current)
  current.userId = actor.id
  current.role = actor.role
  current.identified = false
  async function send(): Promise<void> {
    try {
      const result = await recordAnalyticsEvent(current.id, crypto.randomUUID(), 'identify', token)
      if (result === 'conflict') {
        current.id = crypto.randomUUID()
        current.identified = await recordAnalyticsEvent(current.id, crypto.randomUUID(), 'identify', token) === 'ok'
      } else current.identified = result === 'ok'
    } catch { /* Authentication and sign-out never depend on capture. */ }
  }
  let task: Promise<void>
  async function complete(): Promise<void> {
    await Promise.all([priorIdentity, send()])
    if (identities.get(current) === task) identities.delete(current)
    void save(current)
  }
  task = complete()
  identities.set(current, task)
}

async function capture(observation: PendingView): Promise<void> {
  const { session: current, actor, token } = observation
  await rotations.get(current)
  await identities.get(current)
  await save(current)
  const page = pageFor(observation.path)
  if (!page || actor?.role === 'admin' || (!actor && page !== 'login') || (actor && !token)) return
  await recordAnalyticsEvent(current.id, crypto.randomUUID(), page, token)
}

/** Keep only the latest waiting page view; identity requests are dispatched separately. */
async function drain(): Promise<void> {
  if (processing) return
  processing = true
  try {
    while (pending) {
      const observation = pending
      pending = null
      try { await capture(observation) } catch { /* Telemetry is never a browsing dependency. */ }
    }
  } finally { processing = false }
}

export function observeAnalytics(observation: Observation): void {
  const key = `${observation.navigationKey}:${observation.path}:${observation.actor?.id ?? 'guest'}:${observation.actor?.role ?? ''}`
  // Module state survives StrictMode's extra setup; revisits have another location key.
  if (key === lastObservation) return
  lastObservation = key
  try {
    let current = getSession()
    const { actor, token } = observation
    if ((current.userId && current.userId !== actor?.id) || Date.now() - current.lastActivity >= IDLE_MS) {
      if (!current.userId && actor && token) identify(current, actor, token)
      const priorIdentity = identities.get(current)
      session = freshSession()
      current = session
      if (priorIdentity) rotations.set(current, priorIdentity)
    }
    current.lastActivity = Date.now()
    // Do this before coalescing page observations so rapid sign-out cannot erase admin exclusion.
    if (actor && token) identify(current, actor, token)
    void save(current)
    pending = { ...observation, session: current }
    void drain()
  } catch { /* Storage/randomness failures cannot affect navigation. */ }
}
