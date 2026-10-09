import { describe, expect, test } from 'vitest'
import { loc, text } from '@/lib/i18n'

describe('loc', () => {
  test('uses the Bangla column for bn when it is filled', () => {
    expect(loc({ titleEn: 'Phones', titleBn: 'ফোন' }, 'title', 'bn')).toBe('ফোন')
  })

  test('falls back to English when the Bangla column is empty', () => {
    expect(loc({ titleEn: 'Phones', titleBn: '' }, 'title', 'bn')).toBe('Phones')
  })

  test('uses English for en', () => {
    expect(loc({ titleEn: 'Phones', titleBn: 'ফোন' }, 'title', 'en')).toBe('Phones')
  })
})

test('whitespace-only Bangla counts as untranslated', () => {
  expect(loc({ titleEn: 'Phones', titleBn: '  ' }, 'title', 'bn')).toBe('Phones')
  expect(text({ en: 'Sale', bn: ' ' }, 'bn')).toBe('Sale')
})

describe('text', () => {
  test('falls back to English when bn is missing', () => {
    expect(text({ en: 'Sale' }, 'bn')).toBe('Sale')
  })

  test('uses bn when present', () => {
    expect(text({ en: 'Sale', bn: 'সেল' }, 'bn')).toBe('সেল')
  })
})
