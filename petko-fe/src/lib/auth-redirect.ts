const RETURN_KEY = 'petko-auth-return'
const MAX_AGE = 30 * 60 * 1000
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ALLOWED_PATH = new RegExp(`^(?:/|/products/${UUID}|/cart|/checkout|/orders|/profile)$`, 'i')

/** Accept only known app routes; never turn a sign-in link into an external redirect. */
export function safeAuthReturnPath(value: string | null | undefined): string {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) return '/'
  try {
    let decoded = value
    for (let pass = 0; pass < 3; pass++) {
      if ([...decoded].some(character => character === '\\' || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127) || decoded.startsWith('//')) return '/'
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    const url = new URL(value, 'https://petko.invalid')
    if (url.origin !== 'https://petko.invalid' || !ALLOWED_PATH.test(url.pathname)) return '/'
    return url.pathname + url.search + url.hash
  } catch { return '/' }
}

export function loginPath(returnTo: string): string {
  return `/login?next=${encodeURIComponent(safeAuthReturnPath(returnTo))}`
}

export function rememberAuthReturn(returnTo: string): void {
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: safeAuthReturnPath(returnTo), at: Date.now() })) }
  catch { /* Sign-in remains available if tab storage is blocked. */ }
}

export function consumeAuthReturn(): string {
  try {
    const stored = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    const value: unknown = stored ? JSON.parse(stored) : null
    if (value && typeof value === 'object' && 'path' in value && 'at' in value
      && typeof value.path === 'string' && typeof value.at === 'number'
      && Date.now() - value.at >= 0 && Date.now() - value.at < MAX_AGE) return safeAuthReturnPath(value.path)
  } catch { /* Missing or invalid state safely returns to the storefront. */ }
  return '/'
}
