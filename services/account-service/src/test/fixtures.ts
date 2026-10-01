import { buildSwissIban, Ledger, parseAmount } from '@pr-bank/domain';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { InMemoryAccountRepository } from '../accounts.js';
import { buildApp } from '../app.js';
import { createJwtVerifier } from '../auth.js';

export const ISSUER = 'https://idp.test';
export const AUDIENCE = 'customer-api';
const CHF = (amount: string) => parseAmount(amount, 'CHF');

export async function signToken(
  key: CryptoKey,
  subject: string,
  claims: { issuer?: string; audience?: string; expiresAt?: string | number } = {},
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'test' })
    .setSubject(subject)
    .setIssuer(claims.issuer ?? ISSUER)
    .setAudience(claims.audience ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(claims.expiresAt ?? '5m')
    .sign(key);
}

/**
 * Two customers: cust-1 owns a current and a savings account, cust-2 owns one current account.
 */
export async function createFixture() {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256' };

  const ledger = new Ledger();
  const accounts = new InMemoryAccountRepository();
  const open = (id: string, customerId: string, type: 'current' | 'savings', number: string) => {
    ledger.openAccount({ id, currency: 'CHF' });
    accounts.add({
      id,
      customerId,
      type,
      name: type === 'current' ? 'Private account' : 'Savings account',
      iban: buildSwissIban('00000', number),
      currency: 'CHF',
      status: 'active',
    });
  };
  open('acc-1', 'cust-1', 'current', '1001');
  open('acc-2', 'cust-1', 'savings', '1002');
  open('acc-3', 'cust-2', 'current', '2001');

  const record = (
    id: string,
    type: 'TXN-29' | 'TXN-16' | 'TXN-10',
    amount: string,
    timestamp: string,
    description: string,
  ) =>
    ledger.record({
      id,
      accountId: 'acc-1',
      type,
      amount: CHF(amount),
      status: 'completed',
      timestamp,
      referenceId: `ref-${id}`,
      description,
    });
  record('t1', 'TXN-29', '5000', '2026-09-25T08:00:00Z', 'Salary September');
  record('t2', 'TXN-16', '-42.50', '2026-09-27T12:30:00Z', 'Corner Bakery');
  record('t3', 'TXN-10', '-120', '2026-09-29T09:15:00Z', 'City Utilities');
  ledger.record({
    id: 't4',
    accountId: 'acc-1',
    type: 'TXN-03',
    amount: CHF('-300'),
    timestamp: '2026-09-30T16:00:00Z',
    referenceId: 'ref-t4',
    description: 'A. Muster',
  });

  const app = buildApp({
    ledger,
    accounts,
    verifyToken: createJwtVerifier({
      keys: createLocalJWKSet({ keys: [jwk] }),
      issuer: ISSUER,
      audience: AUDIENCE,
    }),
  });

  return {
    app,
    ledger,
    token: (subject: string) => signToken(privateKey, subject),
    privateKey,
  };
}
