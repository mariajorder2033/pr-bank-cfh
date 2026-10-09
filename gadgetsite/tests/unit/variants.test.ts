import { describe, expect, test } from 'vitest'
import {
  exists,
  normalizeOrder,
  optionValues,
  pickVariant,
  type VariantOptions,
} from '@/lib/domain/variants'

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

test('says whether a value exists with the other current choices', () => {
  expect(exists(all, desert128, 'color', 'Black')).toBe(false)
  expect(exists(all, desert256, 'color', 'Black')).toBe(true)
  expect(exists(all, desert128, 'storage', '256GB')).toBe(true)
})

describe('normalizeOrder', () => {
  test('keeps a valid rotation', () => {
    expect(normalizeOrder([2, 0, 1], 3)).toEqual([2, 0, 1])
  })

  test('resets when the number of slides changed', () => {
    expect(normalizeOrder([2, 0, 1], 2)).toEqual([0, 1])
    expect(normalizeOrder([0], 3)).toEqual([0, 1, 2])
  })
})
