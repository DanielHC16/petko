import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(relative, mocks = {}) {
  const source = readFileSync(new URL(`../src/${relative}`, import.meta.url), 'utf8').replaceAll('import.meta.env.VITE_API_URL', "''")
  const code = ts.transpileModule(source, { fileName: relative, compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
const redirect = load('lib/auth-redirect.ts')
const productPath = '/products/20000000-0000-4000-8000-000000000001'

test('sign-in return paths preserve product destination and review anchor', () => {
  assert.equal(redirect.safeAuthReturnPath(productPath + '#reviews'), productPath + '#reviews')
  assert.equal(redirect.safeAuthReturnPath('/?cat=food&pet=cat'), '/?cat=food&pet=cat')
  assert.equal(redirect.safeAuthReturnPath('/orders?order=abc'), '/orders?order=abc')
  assert.equal(new URL(redirect.loginPath(productPath), 'https://petko.invalid').searchParams.get('next'), productPath)
})

test('external, encoded, malformed and auth-loop destinations fall back safely', () => {
  for (const value of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/%5cevil.invalid', '/%255cevil.invalid', '/%2f%2fevil.invalid', '/login', '/auth/callback', '/admin', '/products/invalid', '/%00', '/?x=%0a', '/?x=%250a', '/?x=%E0%A4%A']) {
    assert.equal(redirect.safeAuthReturnPath(value), '/', value)
  }
})

test('OAuth destination is scoped to one tab and consumed only once', () => {
  const values = new Map()
  globalThis.sessionStorage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) }
  redirect.rememberAuthReturn(productPath)
  assert.equal(redirect.consumeAuthReturn(), productPath)
  assert.equal(redirect.consumeAuthReturn(), '/')
  values.set('petko-auth-return', JSON.stringify({ path: productPath, at: Date.now() - 31 * 60 * 1000 }))
  assert.equal(redirect.consumeAuthReturn(), '/')
  values.set('petko-auth-return', 'not-json')
  assert.equal(redirect.consumeAuthReturn(), '/')
})

test('blocked session storage never prevents sign-in or safe fallback', () => {
  globalThis.sessionStorage = { setItem: () => { throw new Error('blocked') }, getItem: () => { throw new Error('blocked') }, removeItem: () => {} }
  assert.doesNotThrow(() => redirect.rememberAuthReturn(productPath))
  assert.equal(redirect.consumeAuthReturn(), '/')
})

const validation = load('features/reviews/review-validation.ts')
test('review permits rating-only posts and requires integer paws', () => {
  for (let rating = 1; rating <= 5; rating++) assert.equal(validation.validateReview({ rating, comment: '' }), null)
  for (const rating of [0, 6, 1.5, NaN, Infinity, '5']) assert.match(validation.validateReview({ rating, comment: 'Nice' }), /rating/)
})
test('review normalizes whitespace and caps plain-text comments without interpreting HTML', () => {
  assert.equal(validation.validateReview({ rating: 5, comment: '  ' + 'x'.repeat(2000) + '  ' }), null)
  assert.notEqual(validation.validateReview({ rating: 5, comment: 'x'.repeat(2001) }), null)
  assert.equal(validation.validateReview({ rating: 4, comment: '<script>alert(1)</script>' }), null)
  assert.equal(validation.reviewDate('invalid'), '')
})

function reviewApi() {
  const calls = []
  const actor = { userId: 'a', token: 'token-a' }
  const state = { session: { user: { id: 'a' }, access_token: 'token-a' }, profile: { id: 'a' }, isLoading: false }
  const result = { id: 'review', version: 3 }
  const privateApi = Object.fromEntries(['get', 'post', 'delete', 'patch'].map(method => [method, async (...args) => { calls.push({ method, args }); return { data: { data: result } } }]))
  const publicClient = { get: async (...args) => { calls.push({ method: 'public-get', args }); return { data: { data: { reviews: [] } } } } }
  const api = load('features/reviews/reviews-api.ts', {
    axios: { create: () => publicClient }, '@/lib/axios': { api: privateApi },
    '@/store/auth.store': { useAuthStore: { getState: () => state } },
  })
  return { api, actor, state, calls }
}

test('public reviews use no auth interceptor, including after account changes', async () => {
  const { api, state, calls } = reviewApi()
  state.session = null
  state.profile = null
  await api.fetchProductReviews('product', 2, new AbortController().signal)
  assert.equal(calls[0].method, 'public-get')
  assert.equal(calls[0].args[1].headers, undefined)
  assert.deepEqual(calls[0].args[1].params, { page: 2, limit: 10 })
})

test('review create binds initiating identity, omits moderation and normalizes comment', async () => {
  const { api, actor, calls } = reviewApi()
  await api.saveReview('product', actor, 'order-item', { rating: 5, comment: '  Useful  ' }, null, new AbortController().signal)
  assert.deepEqual(calls[0].args[1], { order_item_id: 'order-item', rating: 5, comment: 'Useful' })
  assert.equal(calls[0].args[2].headers.Authorization, 'Bearer token-a')
})

test('review edit and withdrawal send the current optimistic version', async () => {
  const { api, actor, calls } = reviewApi()
  const review = { id: 'review', version: 3, is_hidden: true }
  await api.saveReview('product', actor, 'order-item', { rating: 2, comment: '' }, review, new AbortController().signal)
  assert.equal(calls[0].args[1].expected_version, 3)
  assert.equal('is_hidden' in calls[0].args[1], false)
  await api.withdrawReview(review, actor, new AbortController().signal)
  assert.deepEqual(calls[1].args[1].params, { expected_version: 3 })
})

test('private requests from a previous account or token never reach the API', async () => {
  const { api, actor, state, calls } = reviewApi()
  state.session = { user: { id: 'b' }, access_token: 'token-b' }
  state.profile = { id: 'b' }
  await assert.rejects(() => api.fetchOwnReview('product', actor, new AbortController().signal), /account changed/)
  await assert.rejects(() => api.saveReview('product', actor, 'item', { rating: 5, comment: '' }, null, new AbortController().signal), /account changed/)
  assert.deepEqual(calls, [])
})

test('order context is explicitly scoped and moderation accepts only visibility/version', async () => {
  const { api, actor, calls } = reviewApi()
  await api.fetchOwnReview('product', actor, new AbortController().signal, 'owned-order')
  assert.deepEqual(calls[0].args[1].params, { order_id: 'owned-order' })
  await api.moderateReview({ id: 'review', version: 4, comment: 'Customer words', rating: 1 }, true, actor, new AbortController().signal)
  assert.deepEqual(calls[1].args[1], { is_hidden: true, expected_version: 4 })
})

test('successful withdrawal updates public reviews even when owner refresh cannot load', async () => {
  let context = { eligible: true, order_item_id: 'item', review: { id: 'review', version: 2, withdrawn_at: null, is_hidden: true } }
  let publicRefreshes = 0
  let ownerRefreshes = 0
  const { useOwnReview } = load('features/reviews/use-own-review.ts', {
    react: { useCallback: callback => callback },
    './reviews-api': { withdrawReview: async () => {}, fetchOwnReview: async () => { throw new Error('offline') } },
    './use-review-resource': { useReviewResource: () => ({ data: context, isLoading: false, error: null, replace: value => { context = value }, refresh: () => { ownerRefreshes++ } }) },
    './use-review-mutation': { useReviewMutation: () => ({ run: operation => operation(new AbortController().signal), isPending: false, error: null }) },
  })
  const hook = useOwnReview('product', { userId: 'a', token: 'token-a' }, () => { publicRefreshes++ })
  assert.equal(await hook.withdraw(), true)
  assert.equal(publicRefreshes, 1)
  assert.equal(ownerRefreshes, 1)
  assert.equal(context.review.version, 3)
  assert.equal(context.review.is_hidden, true)
  assert.ok(context.review.withdrawn_at)
})
