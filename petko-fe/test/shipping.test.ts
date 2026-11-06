import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateShippingFee } from '../src/lib/shipping.ts'

test('empty carts have no shipping charge', () => {
  assert.equal(calculateShippingFee(0), 0)
  assert.equal(calculateShippingFee(0, 'express'), 0)
})

test('standard delivery costs 99 below the free shipping threshold', () => {
  assert.equal(calculateShippingFee(100), 99)
  assert.equal(calculateShippingFee(998.99), 99)
})

test('express delivery costs 199 below the free shipping threshold', () => {
  assert.equal(calculateShippingFee(100, 'express'), 199)
  assert.equal(calculateShippingFee(998.99, 'express'), 199)
})

test('both delivery options are free at and above 999', () => {
  for (const subtotal of [999, 1000, 16000]) {
    assert.equal(calculateShippingFee(subtotal), 0)
    assert.equal(calculateShippingFee(subtotal, 'express'), 0)
  }
})
