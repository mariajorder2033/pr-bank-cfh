import { describe, expect, it } from 'vitest';
import {
  buildIban,
  buildSwissIban,
  formatIban,
  ibanCheckDigits,
  isValidIban,
  validateIban,
} from './iban.js';

describe('IBAN', () => {
  it.each([
    'CH93 0076 2011 6238 5295 7',
    'GB82 WEST 1234 5698 7654 32',
    'DE89 3704 0044 0532 0130 00',
    'fr14 2004 1010 0505 0001 3m02 606',
  ])('accepts the registry example %s', (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it('reports why an IBAN is invalid', () => {
    expect(validateIban('CH94 0076 2011 6238 5295 7')).toEqual({
      valid: false,
      reason: 'checksum',
    });
    expect(validateIban('CH93 0076 2011 6238 5295')).toEqual({ valid: false, reason: 'length' });
    expect(validateIban('ZZ93 0076 2011 6238 5295 7')).toEqual({
      valid: false,
      reason: 'unknown_country',
    });
    expect(validateIban('CH93-0076')).toEqual({ valid: false, reason: 'format' });
  });

  it('computes check digits with MOD-97-10', () => {
    expect(ibanCheckDigits('CH', '00762011623852957')).toBe('93');
    expect(buildIban('GB', 'WEST12345698765432')).toBe('GB82WEST12345698765432');
  });

  it('builds valid Swiss IBANs from an IID and a padded account number', () => {
    const iban = buildSwissIban('00762', '11623852957');
    expect(iban).toBe('CH9300762011623852957');
    expect(isValidIban(buildSwissIban('12345', '42'))).toBe(true);
    expect(() => buildSwissIban('1234', '42')).toThrow(RangeError);
    expect(() => buildSwissIban('12345', '1234567890123')).toThrow(RangeError);
  });

  it('rejects a BBAN of the wrong length', () => {
    expect(() => buildIban('CH', '123')).toThrow(RangeError);
    expect(() => buildIban('XX', '123')).toThrow(RangeError);
  });

  it('formats in groups of four', () => {
    expect(formatIban('CH9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7');
  });
});
