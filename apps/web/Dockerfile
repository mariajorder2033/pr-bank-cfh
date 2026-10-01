# @pr-bank/web static site for Cloud Run. Build context is the repo root:
#   docker build -f apps/web/Dockerfile -t web .
# syntax=docker/dockerfile:1

FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm ci
# prebuild compiles the design tokens; build emits apps/web/dist.
RUN npm run build --workspace @pr-bank/web

FROM nginx:1.27-alpine AS runner
COPY deploy/gcp/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
