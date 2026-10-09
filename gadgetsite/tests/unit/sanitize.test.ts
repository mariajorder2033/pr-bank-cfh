import { expect, test } from 'vitest'
import { sanitizeRichText } from '@/lib/admin/sanitize'

test('drops scripts and event handlers', () => {
  expect(sanitizeRichText('<p onclick="x">a</p><script>alert(1)</script>')).toBe('<p>a</p>')
  expect(sanitizeRichText('<img src=x onerror=alert(1)>')).toBe('')
})

test('drops javascript: links but keeps safe ones', () => {
  expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
  expect(sanitizeRichText('<a href="https://ok.bd/x" title="t">x</a>')).toBe(
    '<a href="https://ok.bd/x" title="t" rel="noopener noreferrer">x</a>',
  )
})

test('keeps the allowed structure unchanged', () => {
  const html = '<h2>T</h2><ul><li>1</li></ul><table><tbody><tr><td>a</td></tr></tbody></table>'
  expect(sanitizeRichText(html)).toBe(html)
})
