import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createMockBackend, DOMESTIC_SETTLEMENT_MS } from './mock';
import { ApiError, type Backend } from './types';

// Vitest runs from the repo root; resolve the shared contract from there (import.meta.url is an
// http URL under jsdom, so a file URL cannot be used here).
const spec = parse(
  readFileSync(resolve(process.cwd(), 'packages/api-contracts/openapi.yaml'), 'utf8'),
);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats.default(ajv);
ajv.addSchema(spec, 'openapi');
const assertMatches = (schema: string, body: unknown) => {
  const validate = ajv.compile({ $ref: `openapi#/components/schemas/${schema}` });
  expect(validate(body), ajv.errorsText(validate.errors)).toBe(true);
};

describe('demo backend', () => {
  let backend: Backend;

  beforeEach(async () => {
    backend = createMockBackend();
    await backend.auth.signIn('demo', 'demo');
  });

  it('rejects API calls until signed in', async () => {
    const signedOut = createMockBackend();
    await expect(signedOut.api.listAccounts()).rejects.toMatchObject({ status: 401 });
  });

  it('serves accounts and transactions that match the contract', async () => {
    const accounts = await backend.api.listAccounts();
    expect(accounts.map((a) => a.type)).toEqual(['current', 'savings']);
    for (const account of accounts) {
      assertMatches('Account', account);
    }
    const txns = await backend.api.listTransactions('acc-current');
    expect(txns.length).toBeGreaterThan(0);
    for (const txn of txns) {
      assertMatches('Transaction', txn);
    }
  });

  it('seeds the utility-bill correction as original + reversal + replacement (ADR 0002)', async () => {
    const txns = await backend.api.listTransactions('acc-current', { limit: 200 });
    const original = txns.find(
      (t) => t.status === 'reversed' && t.description.includes('City Utilities'),
    );
    expect(original).toBeDefined();
    const reversal = txns.find(
      (t) => t.type === 'TXN-33' && t.correctsTransactionId === original!.id,
    );
    const replacement = txns.find(
      (t) => t.correctsTransactionId === original!.id && t.type !== 'TXN-33',
    );
    expect(reversal?.amount.amount).toBe('120.00');
    expect(original?.amount.amount).toBe('-120.00');
    expect(replacement?.amount.amount).toBe('-94.35');
  });

  describe('own-account transfer', () => {
    it('moves money immediately and leaves the total unchanged', async () => {
      const before = await backend.api.listAccounts();
      const current = before.find((a) => a.id === 'acc-current')!;
      const savings = before.find((a) => a.id === 'acc-savings')!;

      const transfer = await backend.api.createTransfer(
        {
          fromAccountId: 'acc-current',
          amount: { amount: '100.00', currency: 'CHF' },
          destination: { kind: 'own_account', accountId: 'acc-savings' },
        },
        { idempotencyKey: 'own-transfer-key-0001' },
      );
      expect(transfer.status).toBe('completed');
      assertMatches('Transfer', transfer);

      const after = await backend.api.listAccounts();
      expect(after.find((a) => a.id === 'acc-current')!.bookedBalance.amount).toBe(
        subtract(current.bookedBalance.amount, '100.00'),
      );
      expect(after.find((a) => a.id === 'acc-savings')!.bookedBalance.amount).toBe(
        add(savings.bookedBalance.amount, '100.00'),
      );
    });
  });

  describe('domestic transfer', () => {
    const request = {
      fromAccountId: 'acc-current',
      amount: { amount: '250.00', currency: 'CHF' as const },
      destination: {
        kind: 'iban' as const,
        iban: 'CH9300762011623852957',
        creditorName: 'A. Supplier',
      },
    };

    it('starts pending, reduces available immediately, and settles after the delay', async () => {
      let now = new Date('2026-10-01T10:00:00Z');
      const timed = createMockBackend({ now: () => now });
      await timed.auth.signIn('demo', 'demo');
      const before = (await timed.api.listAccounts()).find((a) => a.id === 'acc-current')!;

      const transfer = await timed.api.createTransfer(request, {
        idempotencyKey: 'dom-key-00000001',
      });
      expect(transfer.status).toBe('pending');

      const mid = (await timed.api.listAccounts()).find((a) => a.id === 'acc-current')!;
      expect(mid.availableBalance.amount).toBe(subtract(before.availableBalance.amount, '250.00'));
      expect(mid.bookedBalance.amount).toBe(before.bookedBalance.amount);

      now = new Date(now.getTime() + DOMESTIC_SETTLEMENT_MS + 1);
      expect((await timed.api.getTransferStatus(transfer.id)).status).toBe('completed');
      const settled = (await timed.api.listAccounts()).find((a) => a.id === 'acc-current')!;
      expect(settled.bookedBalance.amount).toBe(subtract(before.bookedBalance.amount, '250.00'));
    });

    it('requires a step-up token above the threshold (FR-12)', async () => {
      const big = { ...request, amount: { amount: '5000.00', currency: 'CHF' as const } };
      await expect(
        backend.api.createTransfer(big, { idempotencyKey: 'big-key-000000001' }),
      ).rejects.toMatchObject({ status: 403, code: 'step_up_required' });

      const token = await backend.auth.verifyStepUp('123456');
      const ok = await backend.api.createTransfer(big, {
        idempotencyKey: 'big-key-000000001',
        stepUpToken: token,
      });
      expect(ok.status).toBe('pending');
    });

    it('is idempotent and flags a conflicting reuse of a key', async () => {
      const first = await backend.api.createTransfer(request, {
        idempotencyKey: 'dom-key-00000002',
      });
      const repeat = await backend.api.createTransfer(request, {
        idempotencyKey: 'dom-key-00000002',
      });
      expect(repeat.id).toBe(first.id);
      await expect(
        backend.api.createTransfer(
          { ...request, amount: { amount: '999.00', currency: 'CHF' } },
          { idempotencyKey: 'dom-key-00000002' },
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it.each([
      [
        'a bad IBAN',
        { ...request, destination: { ...request.destination, iban: 'CH00' } },
        'invalid_iban',
      ],
      [
        'an over-balance amount',
        { ...request, amount: { amount: '999999.00', currency: 'CHF' as const } },
        'insufficient_funds',
      ],
    ])('rejects %s', async (_label, bad, code) => {
      await expect(
        backend.api.createTransfer(bad, { idempotencyKey: `rej-${code}-00000001` }),
      ).rejects.toMatchObject({ code });
    });
  });

  it('freezes and unfreezes a card without affecting others', async () => {
    const [card] = await backend.api.listCards();
    expect((await backend.api.freezeCard(card!.id)).status).toBe('frozen');
    expect((await backend.api.unfreezeCard(card!.id)).status).toBe('active');
  });

  it('returns a 404 ApiError for an unknown account', async () => {
    await expect(backend.api.listTransactions('nope')).rejects.toBeInstanceOf(ApiError);
  });
});

// Decimal-string helpers for the assertions above.
function toMinor(value: string): bigint {
  const [whole = '0', frac = ''] = value.replace('-', '').split('.');
  const minor = BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2));
  return value.startsWith('-') ? -minor : minor;
}
function fromMinor(minor: bigint): string {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  return `${neg ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}
const subtract = (a: string, b: string) => fromMinor(toMinor(a) - toMinor(b));
const add = (a: string, b: string) => fromMinor(toMinor(a) + toMinor(b));
