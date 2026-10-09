import { consoleSms } from './console'

/** Sends a text message to a Bangladeshi mobile number (spec §7). */
export interface SmsProvider {
  send(phone: string, text: string): Promise<void>
}

/**
 * The configured gateway, or null when none is set — SMS login is then hidden.
 * `console` is for development and tests only; a real gateway adapter is added once the
 * owner chooses one (e.g. SSL Wireless, BulkSMSBD).
 */
export function getSms(): SmsProvider | null {
  switch (process.env.SMS_PROVIDER) {
    case 'console':
      return consoleSms
    default:
      return null
  }
}
