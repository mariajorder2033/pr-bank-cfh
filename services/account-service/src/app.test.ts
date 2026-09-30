import { approve, parseAmount, requestApproval } from '@pr-bank/domain';
import { generateKeyPair } from 'jose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFixture, signToken } from './test/fixtures.js';

describe('account service', () => {
  let fixture: Awaited<ReturnType<typeof createFixture>>;

  beforeEach(async () => {
    fixture = await createFixture();
  });
  afterEach(() => fixture.app.close());

  const get = async (url: string, subject: string | null = 'cust-1') =>
    fixture.app.inject({
      method: 'GET',
      url,
      headers: subject ? { authorization: `Bearer ${await fixture.token(subject)}` } : {},
    });

  it('answers health checks without a token', async () => {
    const response = await fixture.app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
  });

  describe('authentication', () => {
    it('rejects requests without a bearer token', async () => {
      const response = await get('/v1/accounts', null);
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.json()).toEqual({
        code: 'unauthorized',
        message: 'A valid access token is required',
      });
    });

    it.each([
      ['a wrong issuer', { issuer: 'https://evil.test' }],
      ['a wrong audience', { audience: 'admin-api' }],
      ['an expired token', { expiresAt: Math.floor(Date.now() / 1000) - 60 }],
    ])('rejects %s', async (_label, claims) => {
      const token = await signToken(fixture.privateKey, 'cust-1', claims);
      const response = await fixture.app.inject({
        method: 'GET',
        url: '/v1/accounts',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(401);
    });

    it('rejects a token signed by an unknown key', async () => {
      const { privateKey } = await generateKeyPair('ES256');
      const response = await fixture.app.inject({
        method: 'GET',
        url: '/v1/accounts',
        headers: { authorization: `Bearer ${await signToken(privateKey, 'cust-1')}` },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/accounts', () => {
    it("lists only the caller's accounts with ledger-derived balances", async () => {
      const response = await get('/v1/accounts');
      expect(response.statusCode).toBe(200);
      const { items } = response.json();
      expect(items.map((a: { id: string }) => a.id)).toEqual(['acc-1', 'acc-2']);
      expect(items[0]).toMatchObject({
        iban: expect.stringMatching(/^CH\d{19}$/),
        bookedBalance: { amount: '4837.50', currency: 'CHF' },
        availableBalance: { amount: '4537.50', currency: 'CHF' },
      });
      expect(items[1].bookedBalance).toEqual({ amount: '0.00', currency: 'CHF' });
    });
  });

  describe('GET /v1/accounts/:accountId/transactions', () => {
    it('returns transactions newest first', async () => {
      const response = await get('/v1/accounts/acc-1/transactions');
      expect(response.statusCode).toBe(200);
      const { items } = response.json();
      expect(items.map((t: { id: string }) => t.id)).toEqual(['t4', 't3', 't2', 't1']);
      expect(items[2]).toMatchObject({
        type: 'TXN-16',
        typeName: 'Card purchase — point of sale',
        amount: { amount: '-42.50', currency: 'CHF' },
        status: 'completed',
      });
    });

    it('filters by time range (from inclusive, to exclusive) and limits', async () => {
      const range = await get(
        '/v1/accounts/acc-1/transactions?from=2026-09-27T12:30:00Z&to=2026-09-30T16:00:00Z',
      );
      expect(range.json().items.map((t: { id: string }) => t.id)).toEqual(['t3', 't2']);
      const limited = await get('/v1/accounts/acc-1/transactions?limit=1');
      expect(limited.json().items.map((t: { id: string }) => t.id)).toEqual(['t4']);
    });

    it('shows a correction as the original, its reversal and the replacement', async () => {
      fixture.ledger.correct(
        approve(
          requestApproval({
            id: 'corr-1',
            makerId: 'ops-alice',
            justification: 'Biller charged 100.00, not 120.00',
            payload: {
              transactionId: 't3',
              reversalId: 't3-rev',
              timestamp: '2026-09-30T17:00:00Z',
              replacement: { id: 't3-fix', amount: parseAmount('-100', 'CHF') },
            },
          }),
          'ops-bob',
          '2026-09-30T17:00:00Z',
        ),
      );
      const { items } = (await get('/v1/accounts/acc-1/transactions')).json();
      const byId = Object.fromEntries(items.map((t: { id: string }) => [t.id, t]));
      expect(byId.t3).toMatchObject({ status: 'reversed', amount: { amount: '-120.00' } });
      expect(byId['t3-rev']).toMatchObject({ type: 'TXN-33', correctsTransactionId: 't3' });
      expect(byId['t3-fix']).toMatchObject({ type: 'TXN-10', correctsTransactionId: 't3' });
    });

    it("returns 404 for another customer's account, exactly as for a missing one", async () => {
      const foreign = await get('/v1/accounts/acc-3/transactions');
      const missing = await get('/v1/accounts/nope/transactions');
      expect(foreign.statusCode).toBe(404);
      expect(foreign.json()).toEqual(missing.json());
    });

    it.each(['limit=0', 'limit=500', 'from=yesterday'])('rejects %s with 400', async (query) => {
      const response = await get(`/v1/accounts/acc-1/transactions?${query}`);
      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('bad_request');
    });
  });

  it('returns JSON 404s for unknown routes', async () => {
    const response = await get('/v1/nothing-here');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'not_found', message: 'Not found' });
  });
});
