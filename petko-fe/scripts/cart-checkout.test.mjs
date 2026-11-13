import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(relative, mocks = {}) {
  const source = readFileSync(new URL(`../src/${relative}`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { fileName: relative, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)((id) => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
const item = (id, quantity = 1) => ({ product_id: id, name: id, quantity, price: 10, stock: 20, image_url: '' })
function cart(remote = [], writeError = false) {
  const state = { profile: { id: 'buyer-b' } }
  const calls = []
  const { useCartStore } = load('store/cart.store.ts', {
    './auth.store': { useAuthStore: { getState: () => state } },
    '@/features/cart/cart-api': {
      fetchRemoteCart: async () => typeof remote === 'function' ? remote() : remote,
      syncRemoteCartItem: async (...args) => { if (writeError) throw new Error('network error'); calls.push(args) },
      removeRemoteCartItem: async () => {}, clearRemoteCart: async () => {},
    },
    'react-hot-toast': { error: () => {} },
    '@/lib/api-error': { getApiErrorMessage: (_error, fallback) => fallback },
  })
  return { store: useCartStore, state, calls }
}

test('loading another account never merges or uploads the previous local cart', async () => {
  const { store, calls } = cart([item('b')])
  store.setState({ items: [item('a')], ownerId: 'buyer-a' })
  await store.getState().syncWithRemote('buyer-b')
  assert.deepEqual(store.getState().items.map(i => i.product_id), ['b'])
  assert.deepEqual(calls, [])
})
test('switching or signing out immediately clears visible items', () => {
  const { store } = cart()
  store.setState({ items: [item('a')], ownerId: 'buyer-a' })
  store.getState().setOwner('buyer-b')
  assert.deepEqual(store.getState().items, [])
  store.getState().setOwner(null)
  assert.equal(store.getState().ownerId, null)
})
test('completed checkout removes purchased quantities locally without a second remote deletion', () => {
  const { store, calls } = cart()
  store.setState({ items: [item('a', 5), item('b', 2)], ownerId: 'buyer-b' })
  store.getState().consumePurchased([{ product_id: 'a', quantity: 2 }])
  assert.deepEqual(store.getState().items.map(i => [i.product_id, i.quantity]), [['a', 3], ['b', 2]])
  assert.deepEqual(calls, [])
})

test('a delayed response for the previous account cannot repopulate the cart', async () => {
  let resolve
  const { store, state } = cart(() => new Promise(done => { resolve = done }))
  const loading = store.getState().syncWithRemote('buyer-b')
  await Promise.resolve()
  state.profile = { id: 'buyer-c' }
  store.getState().setOwner('buyer-c')
  resolve([item('b')])
  await loading
  assert.equal(store.getState().ownerId, 'buyer-c')
  assert.deepEqual(store.getState().items, [])
})
test('a stale remote response cannot resurrect an item removed while loading', async () => {
  let resolve
  const { store } = cart(() => new Promise(done => { resolve = done }))
  store.setState({ ownerId: 'buyer-b', items: [item('a')] })
  const loading = store.getState().syncWithRemote('buyer-b')
  await Promise.resolve()
  store.getState().removeItem('a')
  resolve([item('a')])
  await loading
  assert.deepEqual(store.getState().items, [])
})
test('a failed cart write blocks checkout until an authoritative refresh', async () => {
  const { store } = cart([], true)
  store.setState({ ownerId: 'buyer-b' })
  store.getState().addItem(item('a'))
  await assert.rejects(store.getState().flushPending(), /refresh/)
  assert.ok(store.getState().error)
  await store.getState().syncWithRemote('buyer-b')
  await store.getState().flushPending()
  assert.deepEqual(store.getState().items, [])
})
test('rapid quantity writes are sent in order and checkout waits for them', async () => {
  const { store, calls } = cart()
  store.setState({ ownerId: 'buyer-b' })
  store.getState().addItem(item('a'))
  store.getState().updateQuantity('a', 3)
  store.getState().updateQuantity('a', 2)
  await store.getState().flushPending()
  assert.deepEqual(calls.map(call => call[2]), [1, 3, 2])
})

const selection = load('lib/checkout-selection.ts')
test('checkout selects only chosen current cart lines and current quantities', () => {
  assert.deepEqual(selection.selectCheckoutItems([item('a', 4), item('b', 2)], ['a']), [item('a', 4)])
  assert.deepEqual(selection.selectCheckoutItems([item('a')], ['removed-product']), [])
  assert.deepEqual(selection.selectCheckoutItems([item('a')], []), [])
})
test('checkout selections and direct purchases are scoped to the customer', () => {
  const storage = new Map()
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  selection.saveCheckoutSelection('a', ['a-product'])
  selection.saveDirectCheckout('a', item('a-product'))
  assert.equal(selection.readCheckoutSelection('b'), null)
  assert.equal(selection.readDirectCheckout('b'), null)
  assert.deepEqual(selection.readCheckoutSelection('a'), ['a-product'])
  selection.clearCheckoutSelection('a')
  selection.clearDirectCheckout('a')
  assert.equal(selection.readDirectCheckout('a'), null)
})

test('cart mutations are locked across navigation while checkout is pending', async () => {
  const { store, calls } = cart()
  store.setState({ ownerId: 'buyer-b', items: [item('a', 2)] })
  const token = store.getState().beginCheckout()
  assert.equal(typeof token, 'number')
  store.getState().addItem(item('a', 1))
  store.getState().updateQuantity('a', 6)
  store.getState().removeItem('a')
  store.getState().clearCart()
  assert.deepEqual(store.getState().items, [item('a', 2)])
  assert.equal(store.getState().beginCheckout(), null)
  await store.getState().flushPending()
  assert.deepEqual(calls, [])
  store.getState().endCheckout(token)
  store.getState().addItem(item('a', 1))
  assert.equal(store.getState().items[0].quantity, 3)
})
test('a previous account checkout cannot release a new account checkout lock', () => {
  const { store, state } = cart()
  store.setState({ ownerId: 'buyer-b', items: [item('a')] })
  const oldToken = store.getState().beginCheckout()
  state.profile = { id: 'buyer-c' }
  store.getState().setOwner('buyer-c')
  store.setState({ isLoading: false })
  const token = store.getState().beginCheckout()
  store.getState().endCheckout(oldToken)
  assert.equal(store.getState().isCheckingOut, true)
  store.getState().endCheckout(token)
  assert.equal(store.getState().isCheckingOut, false)
})

test('protected routes reject stale/missing profiles and remount for each account', () => {
  const auth = { session: { user: { id: 'b' } }, profile: { id: 'a' }, isLoading: false }
  const Outlet = () => null
  const Navigate = () => null
  const { default: Guard } = load('components/layout/ProtectedRoute.tsx', {
    '@/store/auth.store': { useAuthStore: selector => selector(auth) },
    '@/lib/auth-redirect': load('lib/auth-redirect.ts'),
    'react-router-dom': { Outlet, Navigate, useLocation: () => ({ pathname: '/cart', search: '', hash: '' }) },
  })
  assert.notEqual(Guard({}).type, Outlet)
  auth.profile = null
  assert.notEqual(Guard({}).type, Outlet)
  auth.profile = { id: 'b' }
  assert.equal(Guard({}).type, Outlet)
  assert.equal(Guard({}).key, 'b')
  auth.session = null
  assert.equal(Guard({}).type, Navigate)
  assert.equal(Guard({}).props.to, '/login?next=%2Fcart')
})

test('profile and deletion requests remain bound to the initiating account token', async () => {
  const auth = { session: { user: { id: 'a' }, access_token: 'token-a' }, profile: { id: 'a' } }
  const calls = []
  const api = {
    patch: async (...args) => { calls.push(args); return { data: { data: { id: 'a', full_name: 'New name' } } } },
    delete: async (...args) => calls.push(args),
  }
  const account = load('lib/account-api.ts', {
    '@/lib/supabase': { supabase: {} }, '@/lib/axios': { api },
    '@/store/auth.store': { useAuthStore: { getState: () => auth } },
  })
  const update = account.updateDisplayName(' New name ')
  const deletion = account.deleteCurrentAccount()
  auth.session = { user: { id: 'b' }, access_token: 'token-b' }
  auth.profile = { id: 'b' }
  await Promise.all([update, deletion])
  assert.deepEqual(calls[0], ['/users/me', { full_name: 'New name' }, { headers: { Authorization: 'Bearer token-a' } }])
  assert.deepEqual(calls[1], ['/users/me', { headers: { Authorization: 'Bearer token-a' } }])
  await assert.rejects(account.saveShippingDetails(null, 'a'), /sign in/)
  assert.equal(calls.length, 2)
})
test('order placement sends its captured token instead of a later account session', async () => {
  const calls = []
  const orders = load('lib/orders-api.ts', { './axios': { api: {
    post: async (...args) => { calls.push(args); return { data: { data: { id: 'order-a' } } } },
  } } })
  await orders.placeOrder({ payment_method: 'gcash', checkout_source: 'cart' }, 'token-a')
  assert.equal(calls[0][2].headers.Authorization, 'Bearer token-a')
})
