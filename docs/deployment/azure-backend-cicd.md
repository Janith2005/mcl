# Azure Backend CI/CD

This repo now includes a production deploy pipeline for backend services on Azure:

- `mcl-api` (FastAPI)
- `mcl-worker` (ARQ worker)
- `mcl-redis` (Redis Docker image: `redis:7-alpine`)

The workflow file is:

- `.github/workflows/deploy-azure-backend.yml`

The deploy script is:

- `infra/azure/deploy-backend-container-apps.sh`

## Deployment Target

The workflow deploys to **Azure Container Apps**:

1. Builds and pushes API + worker images to Azure Container Registry (ACR).
2. Creates/updates Redis as a Container App (internal TCP ingress on port `6379`).
3. Creates/updates API + worker Container Apps.
4. Wires API/worker environment variables and secrets.

## GitHub Secrets

Add these secrets in GitHub repo settings:

- `AZURE_CREDENTIALS` (service principal JSON)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION` (optional, defaults to `2024-05-01-preview`)
- `RESEND_API_KEY` (optional)
- `SENTRY_DSN` (optional)
- `POSTHOG_API_KEY` (optional)
- `STRIPE_SECRET_KEY` (optional)
- `STRIPE_WEBHOOK_SECRET` (optional)

## GitHub Variables

Add these repository (or environment) variables:

- `AZURE_SUBSCRIPTION_ID` (optional if embedded in `AZURE_CREDENTIALS`)
- `ALLOWED_ORIGINS` (comma-separated frontend origins for CORS)

The workflow is currently pinned to these Azure names:

- Resource group: `mcl-rg`
- Container Apps environment: `mcl-env`
- ACR: `mclregistry`
- API app: `mcl-api`
- Redis app: `mcl-redis`
- Worker app: `mcl-worker`
- Location: `eastus`

## Triggering Deploys

Deploys run on:

- Pushes to `main` that touch backend/deploy files.
- Manual run from **Actions -> Deploy Backend (Azure)**.

The workflow runs backend tests first, then deploys only if tests pass.

## Notes

- Redis is deployed as a Docker container inside Azure Container Apps (matches your requested setup).
- ACR admin credentials are enabled/used by the script for image pulls in Container Apps.
- If you prefer managed identity pulls instead of ACR admin credentials, the script can be switched to `acrpull` role-based auth.
