import { describe, expect, it } from 'vitest';
import {
  add,
  BASE_CURRENCY,
  CurrencyMismatchError,
  formatAmount,
  isCurrencyCode,
  money,
  negate,
  parseAmount,
  sum,
} from './money.js';

describe('money', () => {
  it('defaults to CHF', () => {
    expect(BASE_CURRENCY).toBe('CHF');
    expect(money(100n).currency).toBe('CHF');
  });

  it.each([
    ['1250.50', 125050n],
    ['1250.5', 125050n],
    ['0.05', 5n],
    ['-3', -300n],
    ['0', 0n],
  ])('parses %s exactly', (input, minor) => {
    expect(parseAmount(input).amountMinor).toBe(minor);
  });

  it.each(['1.234', '1e3', '1,50', '', ' 1.00', '.5', 'NaN'])('rejects %j', (input) => {
    expect(() => parseAmount(input)).toThrow(RangeError);
  });

  it('round-trips through formatAmount with fixed minor units', () => {
    expect(formatAmount(parseAmount('1250.5'))).toBe('1250.50');
    expect(formatAmount(money(-5n))).toBe('-0.05');
    expect(formatAmount(money(0n, 'EUR'))).toBe('0.00');
  });

  it('adds without floating-point error', () => {
    expect(formatAmount(add(parseAmount('0.10'), parseAmount('0.20')))).toBe('0.30');
    expect(formatAmount(sum([money(1n), money(2n), negate(money(10n))], 'CHF'))).toBe('-0.07');
  });

  it('refuses to mix currencies', () => {
    expect(() => add(money(1n, 'CHF'), money(1n, 'EUR'))).toThrow(CurrencyMismatchError);
  });

  it('recognises supported currency codes only', () => {
    expect(isCurrencyCode('CHF')).toBe(true);
    expect(isCurrencyCode('XYZ')).toBe(false);
    expect(isCurrencyCode('toString')).toBe(false);
  });
});
