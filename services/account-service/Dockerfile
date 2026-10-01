# Account Service container for Cloud Run. Build context is the repo root (workspace monorepo):
#   docker build -f services/account-service/Dockerfile -t account-service .
# syntax=docker/dockerfile:1

FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm ci
# tsc -b builds @pr-bank/domain then the service via project references.
RUN npm run build
# Drop dev dependencies so only runtime deps are carried forward.
RUN npm prune --omit=dev

FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/services/account-service/package.json ./services/account-service/package.json
COPY --from=builder /app/services/account-service/dist ./services/account-service/dist
# Cloud Run sends traffic to $PORT (8080 by default); the service reads PORT.
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "services/account-service/dist/server.js"]
