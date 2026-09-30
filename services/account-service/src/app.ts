import type { Ledger } from '@pr-bank/domain';
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';
import type { AccountRepository } from './accounts.js';
import type { Principal, TokenVerifier } from './auth.js';
import { toAccountDto, toTransactionDto } from './serialize.js';

declare module 'fastify' {
  interface FastifyRequest {
    principal: Principal | null;
  }
}

export interface AppOptions {
  ledger: Ledger;
  accounts: AccountRepository;
  verifyToken: TokenVerifier;
  logger?: FastifyServerOptions['logger'];
}

const error = (code: string, message: string) => ({ code, message });
const NOT_FOUND = error('not_found', 'Not found');

function principalOf(request: FastifyRequest): Principal {
  if (!request.principal) {
    throw new Error('Route is missing the authentication hook');
  }
  return request.principal;
}

export function buildApp({
  ledger,
  accounts,
  verifyToken,
  logger = false,
}: AppOptions): FastifyInstance {
  const app = Fastify({ logger });
  app.decorateRequest('principal', null);

  app.setErrorHandler((err: { validation?: unknown; message: string }, request, reply) => {
    if (err.validation) {
      return reply.code(400).send(error('bad_request', err.message));
    }
    request.log.error(err);
    return reply.code(500).send(error('internal_error', 'Internal server error'));
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send(NOT_FOUND));

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(
    async (v1) => {
      v1.addHook('onRequest', async (request, reply) => {
        const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
        try {
          if (scheme?.toLowerCase() !== 'bearer' || !token) {
            throw new Error('Missing bearer token');
          }
          request.principal = await verifyToken(token);
        } catch {
          return reply
            .code(401)
            .header('www-authenticate', 'Bearer')
            .send(error('unauthorized', 'A valid access token is required'));
        }
      });

      v1.get('/accounts', async (request) => ({
        items: accounts
          .listByCustomer(principalOf(request).customerId)
          .map((account) => toAccountDto(account, ledger)),
      }));

      v1.get<{
        Params: { accountId: string };
        Querystring: { from?: string; to?: string; limit: number };
      }>(
        '/accounts/:accountId/transactions',
        {
          schema: {
            querystring: {
              type: 'object',
              properties: {
                from: { type: 'string', format: 'date-time' },
                to: { type: 'string', format: 'date-time' },
                limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
              },
            },
          },
        },
        async (request, reply) => {
          const account = accounts.get(request.params.accountId);
          // Someone else's account is indistinguishable from a missing one.
          if (!account || account.customerId !== principalOf(request).customerId) {
            return reply.code(404).send(NOT_FOUND);
          }
          const { from, to, limit } = request.query;
          const fromMs = from === undefined ? -Infinity : Date.parse(from);
          const toMs = to === undefined ? Infinity : Date.parse(to);
          const items = [...ledger.history(account.id)]
            .reverse()
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            .filter((tx) => {
              const at = Date.parse(tx.timestamp);
              return at >= fromMs && at < toMs;
            })
            .slice(0, limit)
            .map(toTransactionDto);
          return { items };
        },
      );
    },
    { prefix: '/v1' },
  );

  return app;
}
