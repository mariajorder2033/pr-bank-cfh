/**
 * IBAN validation and construction per ISO 13616, with MOD-97-10 check digits per ISO 7064
 * (TRD §3.6a). Used to validate beneficiary IBANs and to issue IBANs for new accounts.
 */

/** IBAN lengths by country, from the SWIFT IBAN registry. */
// prettier-ignore
const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20,
  LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19,
  MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28,
  TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

export type IbanValidation =
  | { readonly valid: true; readonly iban: string }
  | {
      readonly valid: false;
      readonly reason: 'format' | 'unknown_country' | 'length' | 'checksum';
    };

/** Strips spaces and upper-cases, giving the electronic format. */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function validateIban(input: string): IbanValidation {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return { valid: false, reason: 'format' };
  }
  const length = IBAN_LENGTHS[iban.slice(0, 2)];
  if (length === undefined) {
    return { valid: false, reason: 'unknown_country' };
  }
  if (iban.length !== length) {
    return { valid: false, reason: 'length' };
  }
  if (mod97(toDigits(iban.slice(4) + iban.slice(0, 4))) !== 1) {
    return { valid: false, reason: 'checksum' };
  }
  return { valid: true, iban };
}

export function isValidIban(input: string): boolean {
  return validateIban(input).valid;
}

/** Computes the two IBAN check digits for a country code and BBAN. */
export function ibanCheckDigits(countryCode: string, bban: string): string {
  const check = 98 - mod97(toDigits(`${bban}${countryCode}00`));
  return check.toString().padStart(2, '0');
}

export function buildIban(countryCode: string, bban: string): string {
  const country = countryCode.toUpperCase();
  const basic = bban.toUpperCase();
  const length = IBAN_LENGTHS[country];
  if (length === undefined) {
    throw new RangeError(`Unsupported IBAN country: ${countryCode}`);
  }
  if (!/^[A-Z0-9]+$/.test(basic) || basic.length !== length - 4) {
    throw new RangeError(`BBAN for ${country} must be ${length - 4} alphanumeric characters`);
  }
  return `${country}${ibanCheckDigits(country, basic)}${basic}`;
}

/**
 * Builds a Swiss IBAN: CH + check digits + 5-digit bank clearing number (IID)
 * + 12-character account number, left-padded with zeros.
 */
export function buildSwissIban(iid: string, accountNumber: string): string {
  if (!/^\d{5}$/.test(iid)) {
    throw new RangeError('Swiss IID must be 5 digits');
  }
  if (!/^[0-9A-Z]{1,12}$/i.test(accountNumber)) {
    throw new RangeError('Swiss account number must be 1–12 alphanumeric characters');
  }
  return buildIban('CH', `${iid}${accountNumber.padStart(12, '0')}`);
}

/** Print format: groups of four separated by spaces. */
export function formatIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
}

function toDigits(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => (letter.charCodeAt(0) - 55).toString());
}

function mod97(digits: string): number {
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(`${remainder}${digits.slice(i, i + 7)}`) % 97;
  }
  return remainder;
}
