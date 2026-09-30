import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface Principal {
  readonly customerId: string;
}

/** Resolves a bearer token to the customer it was issued for, or rejects. */
export type TokenVerifier = (token: string) => Promise<Principal>;

/**
 * Verifies OIDC access tokens (TRD §5, §6) against the identity provider's signing keys.
 * Pass `createRemoteJWKSet(jwksUrl)` from `jose` in production.
 */
export function createJwtVerifier(options: {
  keys: JWTVerifyGetKey;
  issuer: string;
  audience: string;
}): TokenVerifier {
  return async (token) => {
    const { payload } = await jwtVerify(token, options.keys, {
      issuer: options.issuer,
      audience: options.audience,
      algorithms: ['ES256', 'RS256', 'EdDSA'],
    });
    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new Error('Token has no subject');
    }
    return { customerId: payload.sub };
  };
}
