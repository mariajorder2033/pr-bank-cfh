import { bulkSmsBd } from './bulksmsbd'
import { consoleSms } from './console'

/** Sends a text message to a Bangladeshi mobile number (spec §7). */
export interface SmsProvider {
  send(phone: string, text: string): Promise<void>
}

/**
 * The configured gateway, or null when none is set — SMS login is then hidden.
 * `console` is for development and tests only; `bulksmsbd` is the production gateway.
 */
export function getSms(): SmsProvider | null {
  switch (process.env.SMS_PROVIDER) {
    case 'console':
      return consoleSms
    case 'bulksmsbd': {
      const apiKey = process.env.BULKSMSBD_API_KEY
      const senderId = process.env.BULKSMSBD_SENDER_ID
      return apiKey && senderId ? bulkSmsBd({ apiKey, senderId }) : null
    }
    default:
      return null
  }
}
