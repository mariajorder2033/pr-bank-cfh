import { readCredential } from '@/lib/server/credentials'
import { bulkSmsBd } from './bulksmsbd'
import { consoleSms } from './console'

/** Sends a text message to a Bangladeshi mobile number (spec §7). */
export interface SmsProvider {
  send(phone: string, text: string): Promise<void>
}

function build(provider: string | undefined, config: Record<string, string | undefined>) {
  switch (provider) {
    case 'console':
      // Prints login codes to the log: never in production, except the e2e server.
      return process.env.NODE_ENV !== 'production' || process.env.SMS_CONSOLE_ALLOWED === '1'
        ? consoleSms
        : null
    case 'bulksmsbd':
      return config.apiKey && config.senderId
        ? bulkSmsBd({ apiKey: config.apiKey, senderId: config.senderId })
        : null
    default:
      return null
  }
}

/**
 * The SMS gateway, or null when none is set — SMS login is then hidden.
 * Keys saved in admin (service credential `sms`) win; environment variables are the
 * fallback for development and tests. `console` is for development and tests only.
 */
export async function getSms(): Promise<SmsProvider | null> {
  const saved = await readCredential('sms')
  if (saved) return saved.enabled ? build(saved.provider, saved.config) : null
  return build(process.env.SMS_PROVIDER, {
    apiKey: process.env.BULKSMSBD_API_KEY,
    senderId: process.env.BULKSMSBD_SENDER_ID,
  })
}
