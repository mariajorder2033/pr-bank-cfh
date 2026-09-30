import { Ledger } from '@pr-bank/domain';
import { createRemoteJWKSet } from 'jose';
import { InMemoryAccountRepository } from './accounts.js';
import { buildApp } from './app.js';
import { createJwtVerifier } from './auth.js';
import { loadConfig } from './config.js';

const config = loadConfig();

// In-memory stores until the core banking integration exists (TRD §3.2).
const app = buildApp({
  ledger: new Ledger(),
  accounts: new InMemoryAccountRepository(),
  verifyToken: createJwtVerifier({
    keys: createRemoteJWKSet(config.jwksUrl),
    issuer: config.issuer,
    audience: config.audience,
  }),
  logger: true,
});

await app.listen({ host: config.host, port: config.port });
