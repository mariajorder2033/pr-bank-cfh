import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createFixture } from './test/fixtures.js';

/** Contract tests (development-process.md §7): responses must match the agreed OpenAPI spec. */
const spec = parse(
  readFileSync(new URL('../../../packages/api-contracts/openapi.yaml', import.meta.url), 'utf8'),
);
// OpenAPI 3.1 schemas are JSON Schema 2020-12; the document's other keys are not schema keywords.
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats.default(ajv);
ajv.addSchema(spec, 'openapi');
const matches = (schema: string, body: unknown) => {
  const validate = ajv.compile({ $ref: `openapi#/components/schemas/${schema}` });
  return validate(body) ? [] : validate.errors;
};

describe('Customer API contract', () => {
  let fixture: Awaited<ReturnType<typeof createFixture>>;
  let authorization: string;

  beforeAll(async () => {
    fixture = await createFixture();
    authorization = `Bearer ${await fixture.token('cust-1')}`;
  });
  afterAll(() => fixture.app.close());

  const get = (url: string, headers: Record<string, string> = { authorization }) =>
    fixture.app.inject({ method: 'GET', url, headers });

  it('GET /v1/accounts matches AccountList', async () => {
    expect(matches('AccountList', (await get('/v1/accounts')).json())).toEqual([]);
  });

  it('GET /v1/accounts/{accountId}/transactions matches TransactionList', async () => {
    const body = (await get('/v1/accounts/acc-1/transactions')).json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(matches('TransactionList', body)).toEqual([]);
  });

  it.each([
    ['401', '/v1/accounts', {}],
    ['404', '/v1/accounts/acc-3/transactions', undefined],
    ['400', '/v1/accounts/acc-1/transactions?limit=0', undefined],
  ])('%s responses match Error', async (_status, url, headers) => {
    expect(matches('Error', (await get(url, headers)).json())).toEqual([]);
  });
});
