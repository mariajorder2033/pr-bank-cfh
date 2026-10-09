import type { SmsProvider } from './index'

// BulkSMSBD (bulksmsbd.net). SANDBOX-UNVERIFIED: written from the open-source client
// github.com/sofolitltd/bulksmsbd (lib/src/bulksmsbd_client.dart, models.dart) because the
// official docs were unreachable from the build environment. Verify against your account's
// API page before go-live (docs/integrations-status.md).
//   POST https://bulksmsbd.net/api/smsapi  form: api_key, senderid, number, message
//   → JSON { response_code, success_message | error_message }; 202 = submitted.

const SEND_URL = 'https://bulksmsbd.net/api/smsapi'
const TIMEOUT_MS = 10_000

const CODES: Record<string, string> = {
  '1001': 'Invalid number',
  '1002': 'Sender ID incorrect or disabled',
  '1003': 'Required fields missing',
  '1005': 'Internal error',
  '1006': 'Balance validity not available',
  '1007': 'Balance insufficient',
  '1011': 'User ID not found',
  '1012': 'Masking SMS must be sent in Bengali',
  '1013': 'Sender ID not found for this API key',
  '1014': 'Sender type name not found',
  '1015': 'Sender ID has no valid gateway',
  '1016': 'Active price info not found',
  '1017': 'Price info not found',
  '1018': 'Account owner is disabled',
  '1019': 'Sender type price disabled',
  '1020': 'Account parent not found',
  '1021': 'Parent active price not found',
  '1031': 'Account not verified',
  '1032': 'IP not whitelisted',
}

/** A send that the gateway did not accept; the message never contains the API key. */
export class SmsSendError extends Error {
  constructor(
    readonly code: string,
    detail: string,
  ) {
    super(`BulkSMSBD ${code}: ${detail}`)
    this.name = 'SmsSendError'
  }
}

/** 01712345678 → 8801712345678 (the country-code form the gateway takes). */
const toGatewayNumber = (phone: string) => `88${phone}`

export function bulkSmsBd(config: { apiKey: string; senderId: string }): SmsProvider {
  return {
    async send(phone, text) {
      let res: Response
      try {
        res = await fetch(SEND_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            api_key: config.apiKey,
            senderid: config.senderId,
            number: toGatewayNumber(phone),
            message: text,
          }).toString(),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (e) {
        throw new SmsSendError('network', e instanceof Error ? e.name : 'request failed')
      }
      const body = (await res.json().catch(() => null)) as {
        response_code?: number | string
      } | null
      const code = body?.response_code === undefined ? 'unreadable' : String(body.response_code)
      if (code !== '202') throw new SmsSendError(code, CODES[code] ?? `HTTP ${res.status}`)
    },
  }
}
