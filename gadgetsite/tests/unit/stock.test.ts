import { expect, test } from 'vitest'
import { stockStatus } from '@/lib/domain/stock'

const normal = { lowThreshold: 3, preorder: false }
const preorder = { lowThreshold: 3, preorder: true }

test('in stock above the low threshold', () => {
  expect(stockStatus(10, normal)).toBe('in_stock')
})

test('few left at or below the low threshold', () => {
  expect(stockStatus(3, normal)).toBe('few_left')
  expect(stockStatus(1, normal)).toBe('few_left')
})

test('out of stock at zero or when over-reserved', () => {
  expect(stockStatus(0, normal)).toBe('out_of_stock')
  expect(stockStatus(-2, normal)).toBe('out_of_stock')
})

test('pre-order only when nothing is on hand', () => {
  expect(stockStatus(0, preorder)).toBe('preorder')
  expect(stockStatus(5, preorder)).toBe('in_stock')
})

test('rejects an available count that is not a whole number', () => {
  expect(() => stockStatus(NaN, normal)).toThrow(RangeError)
  expect(() => stockStatus(1.5, normal)).toThrow(RangeError)
})
