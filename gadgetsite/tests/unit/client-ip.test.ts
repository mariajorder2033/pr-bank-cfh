import { expect, test } from 'vitest'
import { clientIp } from '@/lib/server/request'

test('behind one proxy, the client is the hop the proxy appended (rightmost)', () => {
  expect(clientIp('6.6.6.6, 203.0.113.9', 1)).toBe('203.0.113.9')
  expect(clientIp('203.0.113.9', 1)).toBe('203.0.113.9')
})

test('behind two proxies, it is the second hop from the right', () => {
  expect(clientIp('6.6.6.6, 203.0.113.9, 10.0.0.2', 2)).toBe('203.0.113.9')
})

test('a missing or too-short header falls back to a fixed placeholder', () => {
  expect(clientIp(null, 1)).toBe('0.0.0.0')
  expect(clientIp('203.0.113.9', 3)).toBe('0.0.0.0')
})
