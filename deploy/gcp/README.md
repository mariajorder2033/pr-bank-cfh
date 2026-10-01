# Deploying to Google Cloud Run

One command builds and deploys the **backend** (account service) and both **frontends** (customer web app + admin portal) to [Cloud Run](https://cloud.google.com/run).

## One-click deploy

```sh
deploy/gcp/deploy.sh YOUR_GCP_PROJECT_ID
```

Optionally pass a region (default `europe-west6`, Zürich):

```sh
deploy/gcp/deploy.sh YOUR_GCP_PROJECT_ID europe-west6
```

The script:

1. Enables the Cloud Run, Cloud Build, and Artifact Registry APIs.
2. Creates the `pr-bank` Artifact Registry repository if it doesn't exist.
3. Submits [`cloudbuild.yaml`](cloudbuild.yaml), which builds the three images and deploys each to Cloud Run.
4. Prints the resulting service URLs.

Images build in Cloud Build, so you don't need Docker locally — only the authenticated `gcloud` CLI (`gcloud auth login`) and a project with billing enabled.

## What gets deployed

| Service           | Image source                                 | Ingress                               |
| ----------------- | -------------------------------------------- | ------------------------------------- |
| `web`             | `apps/web/Dockerfile` (nginx)                | Public (`allow-unauthenticated`)      |
| `admin`           | `apps/admin/Dockerfile` (nginx)              | Internal (`no-allow-unauthenticated`) |
| `account-service` | `services/account-service/Dockerfile` (Node) | Internal (`no-allow-unauthenticated`) |

The customer web app runs in **self-contained demo mode**, so it is useful the moment it deploys. The admin portal and account service are deployed with **internal ingress** — grant specific principals access, or front them with [Identity-Aware Proxy](https://cloud.google.com/iap), before real use. They are internal-only by design (TRD §3.8).

## Backend configuration

The account service verifies OIDC access tokens and reads its configuration from the environment. Set these before deploying so they are passed through to Cloud Run:

```sh
export OIDC_JWKS_URL="https://your-idp/.well-known/jwks.json"
export OIDC_ISSUER="https://your-idp/"
export OIDC_AUDIENCE="customer-api"
deploy/gcp/deploy.sh YOUR_GCP_PROJECT_ID
```

Secrets never live in the repo. For anything sensitive, use [Secret Manager](https://cloud.google.com/run/docs/configuring/services/secrets) and reference it with `--set-secrets` instead of `--set-env-vars`.

## Run the whole stack locally first

```sh
docker compose up --build
# web   → http://localhost:8080
# admin → http://localhost:8081
# api   → http://localhost:8082/health
```

## CI/CD option

Point a Cloud Build trigger at `deploy/gcp/cloudbuild.yaml` to build and deploy on every push to your release branch, instead of running the script by hand.
