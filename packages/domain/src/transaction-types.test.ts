import { describe, expect, it } from 'vitest';
import {
  getTransactionType,
  isTransactionTypeCode,
  TRANSACTION_TYPES,
} from './transaction-types.js';

describe('transaction types', () => {
  it('lists TXN-01 to TXN-34 in order, without gaps (PRD §6.12)', () => {
    expect(TRANSACTION_TYPES.map((t) => t.code)).toEqual(
      Array.from({ length: 34 }, (_, i) => `TXN-${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('looks types up by code', () => {
    expect(getTransactionType('TXN-04')).toMatchObject({ direction: 'debit' });
    expect(getTransactionType('TXN-26')).toMatchObject({ direction: 'credit' });
    expect(getTransactionType('TXN-99')).toBeUndefined();
    expect(isTransactionTypeCode('TXN-33')).toBe(true);
    expect(isTransactionTypeCode('TXN-35')).toBe(false);
  });
});
