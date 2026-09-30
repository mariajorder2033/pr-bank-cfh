# Account Service

Balances and transaction history for the customer API (TRD §3.2, PRD §6.2). Implements `GET /v1/accounts` and `GET /v1/accounts/{accountId}/transactions` from [`packages/api-contracts/openapi.yaml`](../../packages/api-contracts/openapi.yaml).

- Every `/v1` route needs an OIDC bearer token. The token's `sub` claim is the customer ID, and customers only see their own accounts. Another customer's account returns the same 404 as a missing one.
- Balances are derived from the append-only ledger in `@pr-bank/domain` (ADR 0002).
- Storage is in memory until the core banking integration is in place, so a fresh process has no accounts.

## Configuration

| Variable        | Required | Description                              |
| --------------- | -------- | ---------------------------------------- |
| `OIDC_JWKS_URL` | yes      | Identity provider's JSON Web Key Set URL |
| `OIDC_ISSUER`   | yes      | Expected `iss` claim                     |
| `OIDC_AUDIENCE` | yes      | Expected `aud` claim                     |
| `PORT`          | no       | Listen port, default `3000`              |
| `HOST`          | no       | Listen address, default `0.0.0.0`        |

## Run

```sh
npm run build                                    # from the repository root
OIDC_JWKS_URL=… OIDC_ISSUER=… OIDC_AUDIENCE=… npm start --workspace @pr-bank/account-service
```

`GET /health` needs no token.
