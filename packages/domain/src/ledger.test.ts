import { beforeEach, describe, expect, it } from 'vitest';
import { Ledger, LedgerError, type CorrectionPayload } from './ledger.js';
import { ApprovalError, approve, requestApproval } from './maker-checker.js';
import { formatAmount, parseAmount } from './money.js';

const CHF = (amount: string) => parseAmount(amount, 'CHF');
const at = '2026-10-01T09:00:00Z';

function approvedCorrection(payload: CorrectionPayload) {
  const request = requestApproval({
    id: 'corr-1',
    makerId: 'ops-alice',
    justification: 'Merchant settled 120.00, not 100.00',
    payload,
  });
  return approve(request, 'ops-bob', at);
}

describe('Ledger', () => {
  let ledger: Ledger;

  beforeEach(() => {
    ledger = new Ledger();
    ledger.openAccount({ id: 'acc-1', currency: 'CHF' });
    ledger.openAccount({ id: 'acc-2', currency: 'CHF' });
    ledger.openAccount({ id: 'acc-eur', currency: 'EUR' });
    ledger.record({
      id: 'salary',
      accountId: 'acc-1',
      type: 'TXN-29',
      amount: CHF('5000'),
      status: 'completed',
      timestamp: at,
      referenceId: 'ref-salary',
      description: 'Test entry',
    });
  });

  const balance = (accountId = 'acc-1') => formatAmount(ledger.bookedBalance(accountId));

  describe('recording', () => {
    it('derives the booked balance from posted entries only', () => {
      ledger.record({
        id: 'pos',
        accountId: 'acc-1',
        type: 'TXN-16',
        amount: CHF('-100'),
        timestamp: at,
        referenceId: 'r',
        description: 'Test entry',
      });
      expect(balance()).toBe('5000.00');
      expect(formatAmount(ledger.availableBalance('acc-1'))).toBe('4900.00');
    });

    it('enforces the direction of debit-only and credit-only types', () => {
      const base = { accountId: 'acc-1', timestamp: at, referenceId: 'r', description: 'x' };
      expect(() => ledger.record({ ...base, id: 'a', type: 'TXN-18', amount: CHF('50') })).toThrow(
        /debit-only/,
      );
      expect(() => ledger.record({ ...base, id: 'b', type: 'TXN-26', amount: CHF('-1') })).toThrow(
        /credit-only/,
      );
      expect(() => ledger.record({ ...base, id: 'c', type: 'TXN-01', amount: CHF('0') })).toThrow(
        /non-zero/,
      );
    });

    it('rejects the wrong currency, duplicate IDs and unknown accounts', () => {
      const base = { type: 'TXN-30', timestamp: at, referenceId: 'r', description: 'x' } as const;
      expect(() =>
        ledger.record({ ...base, id: 'x', accountId: 'acc-eur', amount: CHF('1') }),
      ).toThrow(LedgerError);
      expect(() =>
        ledger.record({ ...base, id: 'salary', accountId: 'acc-1', amount: CHF('1') }),
      ).toThrow(/already exists/);
      expect(() =>
        ledger.record({ ...base, id: 'y', accountId: 'nope', amount: CHF('1') }),
      ).toThrow(/Unknown account/);
    });

    it('does not accept reversals or manual adjustments through record()', () => {
      const base = {
        accountId: 'acc-1',
        timestamp: at,
        referenceId: 'r',
        description: 'x',
        amount: CHF('1'),
      };
      expect(() => ledger.record({ ...base, id: 'a', type: 'TXN-32' })).toThrow(/only through/);
      expect(() => ledger.record({ ...base, id: 'b', type: 'TXN-33' })).toThrow(/only through/);
    });

    it('returns frozen entries', () => {
      const tx = ledger.get('salary');
      expect(Object.isFrozen(tx)).toBe(true);
      expect(Object.isFrozen(tx?.amount)).toBe(true);
    });
  });

  describe('status lifecycle', () => {
    beforeEach(() => {
      ledger.record({
        id: 'wire',
        accountId: 'acc-1',
        type: 'TXN-03',
        amount: CHF('-200'),
        timestamp: at,
        referenceId: 'r',
        description: 'Test entry',
      });
    });

    it('moves through processing, hold and completion', () => {
      ledger.transition('wire', 'processing');
      expect(ledger.transition('wire', 'on-hold', 'sanctions_screening')).toMatchObject({
        status: 'on-hold',
        holdReason: 'sanctions_screening',
      });
      ledger.transition('wire', 'processing');
      expect(ledger.transition('wire', 'completed')).toMatchObject({ holdReason: null });
      expect(balance()).toBe('4800.00');
    });

    it('requires a hold reason and rejects illegal transitions', () => {
      expect(() => ledger.transition('wire', 'on-hold')).toThrow(/needs a reason/);
      expect(() => ledger.transition('wire', 'reversed')).toThrow(LedgerError);
      ledger.transition('wire', 'failed');
      expect(() => ledger.transition('wire', 'processing')).toThrow(/from failed/);
    });
  });

  describe('reversal and correction (FR-27a)', () => {
    beforeEach(() => {
      ledger.record({
        id: 'card',
        accountId: 'acc-1',
        type: 'TXN-17',
        amount: CHF('-100'),
        status: 'completed',
        timestamp: at,
        referenceId: 'r-card',
        description: 'Test entry',
        category: 'Shopping',
      });
    });

    it('reverses by booking an offsetting, linked entry and keeps the original', () => {
      const reversal = ledger.reverse('card', { id: 'rev', timestamp: at, referenceId: 'return' });
      expect(reversal).toMatchObject({
        type: 'TXN-33',
        correctsTransactionId: 'card',
        description: 'Reversal: Test entry',
      });
      expect(formatAmount(reversal.amount)).toBe('100.00');
      expect(ledger.get('card')).toMatchObject({ status: 'reversed' });
      expect(formatAmount(ledger.get('card')!.amount)).toBe('-100.00');
      expect(balance()).toBe('5000.00');
      expect(() => ledger.reverse('card', { id: 'rev2', timestamp: at, referenceId: 'x' })).toThrow(
        /cannot be reversed/,
      );
      expect(() => ledger.reverse('rev', { id: 'rev3', timestamp: at, referenceId: 'x' })).toThrow(
        /cannot be reversed/,
      );
    });

    it('corrects an amount with a reversal plus a replacement of the same type', () => {
      const { reversal, replacement } = ledger.correct(
        approvedCorrection({
          transactionId: 'card',
          reversalId: 'rev',
          timestamp: at,
          replacement: { id: 'card-fixed', amount: CHF('-120') },
        }),
      );
      expect(reversal.referenceId).toBe('corr-1');
      expect(replacement).toMatchObject({
        type: 'TXN-17',
        correctsTransactionId: 'card',
        category: 'Shopping',
        referenceId: 'corr-1',
        description: 'Test entry',
      });
      expect(ledger.history('acc-1').map((tx) => tx.id)).toEqual([
        'salary',
        'card',
        'rev',
        'card-fixed',
      ]);
      expect(balance()).toBe('4880.00');
    });

    it('moves a transaction booked to the wrong account', () => {
      ledger.correct(
        approvedCorrection({
          transactionId: 'card',
          reversalId: 'rev',
          timestamp: at,
          replacement: { id: 'card-fixed', amount: CHF('-100'), accountId: 'acc-2' },
        }),
      );
      expect(balance('acc-1')).toBe('5000.00');
      expect(balance('acc-2')).toBe('-100.00');
    });

    it('requires maker-checker approval', () => {
      const pending = requestApproval({
        id: 'corr-2',
        makerId: 'ops-alice',
        justification: 'fix',
        payload: { transactionId: 'card', reversalId: 'rev', timestamp: at },
      });
      expect(() => ledger.correct(pending)).toThrow(ApprovalError);
      expect(ledger.get('rev')).toBeUndefined();
    });

    it('applies nothing when the replacement is invalid', () => {
      expect(() =>
        ledger.correct(
          approvedCorrection({
            transactionId: 'card',
            reversalId: 'rev',
            timestamp: at,
            replacement: { id: 'card-fixed', amount: CHF('120') },
          }),
        ),
      ).toThrow(/debit-only/);
      expect(ledger.get('rev')).toBeUndefined();
      expect(ledger.get('card')).toMatchObject({ status: 'completed' });
      expect(balance()).toBe('4900.00');
    });

    it('allows only the category to change on a posted entry', () => {
      expect(ledger.setCategory('card', 'Travel')).toMatchObject({ category: 'Travel' });
      expect(formatAmount(ledger.get('card')!.amount)).toBe('-100.00');
    });
  });

  describe('manual adjustment (TXN-32)', () => {
    it('books an approved standalone adjustment', () => {
      const request = approve(
        requestApproval({
          id: 'adj-1',
          makerId: 'ops-alice',
          justification: 'Goodwill credit for outage',
          payload: {
            id: 'goodwill',
            accountId: 'acc-1',
            amount: CHF('25'),
            timestamp: at,
            description: 'Goodwill credit',
          },
        }),
        'ops-bob',
        at,
      );
      expect(ledger.adjust(request)).toMatchObject({ type: 'TXN-32', referenceId: 'adj-1' });
      expect(balance()).toBe('5025.00');
    });
  });
});
