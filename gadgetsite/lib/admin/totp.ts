import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Admin 2FA: RFC 6238 codes from an authenticator app (30 s steps, ±1 step of clock drift).
authenticator.options = { step: 30, window: 1 }

export const newTotpSecret = (): string => authenticator.generateSecret()

export const totpUri = (secret: string, email: string, issuer: string): string =>
  authenticator.keyuri(email, issuer, secret)

export function verifyTotp(secret: string, token: string): boolean {
  const code = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return false
  try {
    return authenticator.check(code, secret)
  } catch {
    return false
  }
}

/** QR code for the enrolment screen, as a data URL. */
export const totpQrDataUrl = (uri: string): Promise<string> =>
  QRCode.toDataURL(uri, { margin: 1, width: 220 })
