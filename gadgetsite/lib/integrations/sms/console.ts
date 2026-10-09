import { appendFile } from 'node:fs/promises'
import type { SmsProvider } from './index'

/** Development/test gateway: logs messages, and appends them to SMS_CONSOLE_FILE if set. */
export const consoleSms: SmsProvider = {
  async send(phone, text) {
    console.info(`[sms:console] to ${phone}: ${text}`)
    const file = process.env.SMS_CONSOLE_FILE
    if (file) await appendFile(file, JSON.stringify({ phone, text }) + '\n')
  },
}
