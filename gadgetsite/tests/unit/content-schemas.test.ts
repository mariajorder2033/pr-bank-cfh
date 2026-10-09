import { describe, expect, test } from 'vitest'
import {
  MotionSettings,
  ProductQueryInput,
  parseSections,
  parseSetting,
} from '@/lib/content/schemas'

describe('parseSections', () => {
  test('keeps valid sections in order and drops invalid ones', () => {
    const sections = parseSections([
      { type: 'hero', placement: 'home' },
      { type: 'bogus' },
      { type: 'productRow', title: { en: 'Hot' }, query: { badge: 'hot' } },
    ])
    expect(sections.map((s) => s.type)).toEqual(['hero', 'productRow'])
  })

  test('returns no sections for a non-array', () => {
    expect(parseSections('x')).toEqual([])
  })
})

describe('ProductQueryInput', () => {
  test('rejects a page size above 48', () => {
    expect(() => ProductQueryInput.parse({ pageSize: 500 })).toThrow()
  })

  test('defaults to the first page of 20', () => {
    expect(ProductQueryInput.parse({})).toMatchObject({ page: 1, pageSize: 20 })
  })
})

describe('parseSetting', () => {
  test('returns the fallback when the stored value is invalid', () => {
    const fallback = {
      heroCycleMs: 4850,
      heroSlideMs: 280,
      heroEasing: 'ease',
      tickerPxPerS: 78,
      wipeMs: 200,
      tileFadeMs: 280,
    }
    expect(parseSetting(MotionSettings, { heroCycleMs: 'x' }, fallback)).toBe(fallback)
  })
})
