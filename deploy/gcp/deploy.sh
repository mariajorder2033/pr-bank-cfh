#!/usr/bin/env bash
#
# One-command deploy of the backend and both frontends to Google Cloud Run.
#
#   deploy/gcp/deploy.sh PROJECT_ID [REGION]
#
# It enables the required APIs, ensures an Artifact Registry repo exists, then builds
# and deploys all three services via Cloud Build (deploy/gcp/cloudbuild.yaml).
#
# Prerequisites: gcloud CLI installed and authenticated (`gcloud auth login`), and billing
# enabled on the project. Nothing else — images are built in Cloud Build, not locally.
#
# Backend OIDC config (the account service verifies access tokens) is read from the
# environment if set: OIDC_JWKS_URL, OIDC_ISSUER, OIDC_AUDIENCE.

set -euo pipefail

PROJECT_ID="${1:-}"
REGION="${2:-europe-west6}"
AR_REPO="pr-bank"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Usage: $0 PROJECT_ID [REGION]" >&2
  echo "Example: $0 my-gcp-project europe-west6" >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "error: gcloud CLI is not installed. See https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

# Run from the repo root regardless of where the script is called from.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

echo "==> Project: ${PROJECT_ID}   Region: ${REGION}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling required APIs (run, cloudbuild, artifactregistry)…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com >/dev/null

echo "==> Ensuring Artifact Registry repo '${AR_REPO}' exists…"
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="pr-bank container images"
fi

echo "==> Submitting build + deploy to Cloud Build…"
gcloud builds submit \
  --config deploy/gcp/cloudbuild.yaml \
  --substitutions "_REGION=${REGION},_AR_REPO=${AR_REPO},_OIDC_JWKS_URL=${OIDC_JWKS_URL:-},_OIDC_ISSUER=${OIDC_ISSUER:-},_OIDC_AUDIENCE=${OIDC_AUDIENCE:-customer-api}" \
  .

echo ""
echo "==> Done. Service URLs:"
for svc in web admin account-service; do
  url="$(gcloud run services describe "${svc}" --region="${REGION}" --format='value(status.url)' 2>/dev/null || true)"
  printf '    %-16s %s\n' "${svc}" "${url:-(not deployed)}"
done
echo ""
echo "Note: the web app runs in self-contained demo mode. The admin portal and account"
echo "service are deployed with internal ingress (--no-allow-unauthenticated); grant access"
echo "or front them with Identity-Aware Proxy before use. See deploy/gcp/README.md."
