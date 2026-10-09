import { describe, expect, test } from 'vitest'
import { optionValues, pickVariant, type VariantOptions } from '@/lib/domain/variants'

const v = (id: string, color: string, storage: string): VariantOptions => ({
  id,
  color,
  storage,
  ram: null,
  region: null,
})
const desert128 = v('a', 'Desert', '128GB')
const desert256 = v('b', 'Desert', '256GB')
const black256 = v('c', 'Black', '256GB')
const all = [desert128, desert256, black256]

test('lists the distinct values per dimension and omits empty dimensions', () => {
  expect(optionValues(all)).toEqual({ color: ['Desert', 'Black'], storage: ['128GB', '256GB'] })
})

describe('pickVariant', () => {
  test('keeps the other choices when that combination exists', () => {
    expect(pickVariant(all, desert128, 'storage', '256GB')).toBe(desert256)
    expect(pickVariant(all, desert256, 'color', 'Black')).toBe(black256)
  })

  test('falls back to a variant with the picked value when the combination does not exist', () => {
    expect(pickVariant(all, desert128, 'color', 'Black')).toBe(black256)
  })

  test('keeps the current variant for an unknown value', () => {
    expect(pickVariant(all, desert128, 'color', 'Purple')).toBe(desert128)
  })
})
