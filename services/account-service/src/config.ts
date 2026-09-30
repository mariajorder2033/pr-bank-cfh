export interface Config {
  readonly host: string;
  readonly port: number;
  readonly jwksUrl: URL;
  readonly issuer: string;
  readonly audience: string;
}

/** Reads configuration from the environment. Secrets never live in code or config files (TRD §6). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ['OIDC_JWKS_URL', 'OIDC_ISSUER', 'OIDC_AUDIENCE'].filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }
  return {
    host: env.HOST ?? '0.0.0.0',
    port,
    jwksUrl: new URL(env.OIDC_JWKS_URL as string),
    issuer: env.OIDC_ISSUER as string,
    audience: env.OIDC_AUDIENCE as string,
  };
}
