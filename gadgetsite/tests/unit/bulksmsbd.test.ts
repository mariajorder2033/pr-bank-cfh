import { afterEach, describe, expect, test, vi } from 'vitest'
import { SmsSendError, bulkSmsBd } from '@/lib/integrations/sms/bulksmsbd'

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }))

afterEach(() => vi.unstubAllGlobals())

const sms = bulkSmsBd({ apiKey: 'KEY123', senderId: '8809617000000' })

describe('BulkSMSBD adapter', () => {
  test('posts the form fields to /api/smsapi with the number in 880 format', async () => {
    const fetch = reply({ response_code: 202, success_message: 'SMS Submitted Successfully' })
    vi.stubGlobal('fetch', fetch)
    await sms.send('01712345678', 'code: 123456')
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://bulksmsbd.net/api/smsapi')
    expect(init.method).toBe('POST')
    const body = new URLSearchParams(init.body as string)
    expect(Object.fromEntries(body)).toEqual({
      api_key: 'KEY123',
      senderid: '8809617000000',
      number: '8801712345678',
      message: 'code: 123456',
    })
  })

  test('a non-202 code is an error carrying the code and its meaning', async () => {
    vi.stubGlobal('fetch', reply({ response_code: 1007, error_message: 'Balance Insufficient' }))
    const err = await sms.send('01712345678', 'x').catch((e) => e)
    expect(err).toBeInstanceOf(SmsSendError)
    expect(err.code).toBe('1007')
    expect(err.message).toContain('Balance insufficient')
    expect(err.message).not.toContain('KEY123')
  })

  test('an unreadable reply is an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>oops</html>', { status: 502 })),
    )
    await expect(sms.send('01712345678', 'x')).rejects.toBeInstanceOf(SmsSendError)
  })

  test('a network failure is an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('fetch failed'))),
    )
    await expect(sms.send('01712345678', 'x')).rejects.toBeInstanceOf(SmsSendError)
  })
})
