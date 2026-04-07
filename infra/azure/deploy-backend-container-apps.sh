#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_env AZURE_RESOURCE_GROUP
require_env AZURE_LOCATION
require_env AZURE_CONTAINERAPPS_ENV
require_env AZURE_ACR_NAME
require_env SUPABASE_URL
require_env SUPABASE_ANON_KEY
require_env SUPABASE_SERVICE_ROLE_KEY
require_env AZURE_OPENAI_ENDPOINT
require_env AZURE_OPENAI_API_KEY
require_env AZURE_OPENAI_DEPLOYMENT
require_env ALLOWED_ORIGINS

AZURE_API_APP_NAME="${AZURE_API_APP_NAME:-mcl-api}"
AZURE_WORKER_APP_NAME="${AZURE_WORKER_APP_NAME:-mcl-worker}"
AZURE_REDIS_APP_NAME="${AZURE_REDIS_APP_NAME:-mcl-redis}"
AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-05-01-preview}"
IMAGE_TAG="${IMAGE_TAG:-${GITHUB_SHA:-manual}}"
IMAGE_TAG="${IMAGE_TAG:0:12}"

if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  log "Setting Azure subscription ${AZURE_SUBSCRIPTION_ID}"
  az account set --subscription "${AZURE_SUBSCRIPTION_ID}"
fi

log "Ensuring Azure providers and resource group exist"
az provider register --namespace Microsoft.App --wait >/dev/null
az provider register --namespace Microsoft.OperationalInsights --wait >/dev/null
az group create \
  --name "${AZURE_RESOURCE_GROUP}" \
  --location "${AZURE_LOCATION}" \
  --output none

if ! az containerapp env show \
  --name "${AZURE_CONTAINERAPPS_ENV}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none 2>/dev/null; then
  log "Creating Container Apps environment ${AZURE_CONTAINERAPPS_ENV}"
  az containerapp env create \
    --name "${AZURE_CONTAINERAPPS_ENV}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --output none
fi

log "Preparing ACR ${AZURE_ACR_NAME}"
az acr update --name "${AZURE_ACR_NAME}" --admin-enabled true --output none
ACR_LOGIN_SERVER="$(az acr show --name "${AZURE_ACR_NAME}" --query loginServer -o tsv)"
ACR_USERNAME="$(az acr credential show --name "${AZURE_ACR_NAME}" --query username -o tsv)"
ACR_PASSWORD="$(az acr credential show --name "${AZURE_ACR_NAME}" --query 'passwords[0].value' -o tsv)"
az acr login --name "${AZURE_ACR_NAME}" --output none

API_IMAGE="${ACR_LOGIN_SERVER}/${AZURE_API_APP_NAME}:${IMAGE_TAG}"
API_IMAGE_LATEST="${ACR_LOGIN_SERVER}/${AZURE_API_APP_NAME}:latest"
WORKER_IMAGE="${ACR_LOGIN_SERVER}/${AZURE_WORKER_APP_NAME}:${IMAGE_TAG}"
WORKER_IMAGE_LATEST="${ACR_LOGIN_SERVER}/${AZURE_WORKER_APP_NAME}:latest"

log "Building and pushing API image ${API_IMAGE}"
docker build -f packages/api/Dockerfile -t "${API_IMAGE}" .
docker tag "${API_IMAGE}" "${API_IMAGE_LATEST}"
docker push "${API_IMAGE}"
docker push "${API_IMAGE_LATEST}"

log "Building and pushing worker image ${WORKER_IMAGE}"
docker build -f packages/worker/Dockerfile -t "${WORKER_IMAGE}" .
docker tag "${WORKER_IMAGE}" "${WORKER_IMAGE_LATEST}"
docker push "${WORKER_IMAGE}"
docker push "${WORKER_IMAGE_LATEST}"

ensure_containerapp() {
  local app_name="$1"
  local image="$2"
  local cpu="$3"
  local memory="$4"
  local min_replicas="$5"
  local max_replicas="$6"

  if ! az containerapp show \
    --name "${app_name}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --output none 2>/dev/null; then
    log "Creating container app ${app_name}"
    az containerapp create \
      --name "${app_name}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --environment "${AZURE_CONTAINERAPPS_ENV}" \
      --image "${image}" \
      --cpu "${cpu}" \
      --memory "${memory}" \
      --min-replicas "${min_replicas}" \
      --max-replicas "${max_replicas}" \
      --output none
  fi
}

ensure_containerapp "${AZURE_API_APP_NAME}" "${API_IMAGE}" "1.0" "2.0Gi" "1" "3"
ensure_containerapp "${AZURE_WORKER_APP_NAME}" "${WORKER_IMAGE}" "1.0" "2.0Gi" "1" "3"

if ! az containerapp show \
  --name "${AZURE_REDIS_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none 2>/dev/null; then
  log "Creating Redis container app ${AZURE_REDIS_APP_NAME}"
  az containerapp create \
    --name "${AZURE_REDIS_APP_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --environment "${AZURE_CONTAINERAPPS_ENV}" \
    --image redis:7-alpine \
    --ingress internal \
    --target-port 6379 \
    --transport tcp \
    --cpu "0.5" \
    --memory "1.0Gi" \
    --min-replicas 1 \
    --max-replicas 1 \
    --command redis-server \
    --args --appendonly yes \
    --output none
else
  log "Updating Redis container app ${AZURE_REDIS_APP_NAME}"
  az containerapp update \
    --name "${AZURE_REDIS_APP_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --image redis:7-alpine \
    --cpu "0.5" \
    --memory "1.0Gi" \
    --min-replicas 1 \
    --max-replicas 1 \
    --command redis-server \
    --args --appendonly yes \
    --output none
fi

az containerapp ingress enable \
  --name "${AZURE_REDIS_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --type internal \
  --target-port 6379 \
  --transport tcp \
  --output none

REDIS_HOST="$(az containerapp show \
  --name "${AZURE_REDIS_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --query properties.configuration.ingress.fqdn -o tsv)"

if [[ -z "${REDIS_HOST}" ]]; then
  echo "Failed to resolve Redis internal host for ${AZURE_REDIS_APP_NAME}" >&2
  exit 1
fi

REDIS_URL="redis://${REDIS_HOST}:6379"

common_secrets=(
  "supaurl=${SUPABASE_URL}"
  "supaanon=${SUPABASE_ANON_KEY}"
  "supasvc=${SUPABASE_SERVICE_ROLE_KEY}"
  "aoaiurl=${AZURE_OPENAI_ENDPOINT}"
  "aoaikey=${AZURE_OPENAI_API_KEY}"
  "aoaideploy=${AZURE_OPENAI_DEPLOYMENT}"
)

if [[ -n "${RESEND_API_KEY:-}" ]]; then
  common_secrets+=("resend=${RESEND_API_KEY}")
fi
if [[ -n "${SENTRY_DSN:-}" ]]; then
  common_secrets+=("sentry=${SENTRY_DSN}")
fi
if [[ -n "${POSTHOG_API_KEY:-}" ]]; then
  common_secrets+=("posthog=${POSTHOG_API_KEY}")
fi
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  common_secrets+=("stripekey=${STRIPE_SECRET_KEY}")
fi
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  common_secrets+=("stripewhsec=${STRIPE_WEBHOOK_SECRET}")
fi

for app_name in "${AZURE_API_APP_NAME}" "${AZURE_WORKER_APP_NAME}"; do
  log "Setting registry + secrets for ${app_name}"
  az containerapp registry set \
    --name "${app_name}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --server "${ACR_LOGIN_SERVER}" \
    --username "${ACR_USERNAME}" \
    --password "${ACR_PASSWORD}" \
    --output none

  az containerapp secret set \
    --name "${app_name}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --secrets "${common_secrets[@]}" \
    --output none
done

api_env_vars=(
  "SUPABASE_URL=secretref:supaurl"
  "SUPABASE_ANON_KEY=secretref:supaanon"
  "SUPABASE_SERVICE_ROLE_KEY=secretref:supasvc"
  "AZURE_OPENAI_ENDPOINT=secretref:aoaiurl"
  "AZURE_OPENAI_API_KEY=secretref:aoaikey"
  "AZURE_OPENAI_DEPLOYMENT=secretref:aoaideploy"
  "AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION}"
  "ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"
  "REDIS_HOST=${REDIS_HOST}"
  "REDIS_PORT=6379"
  "REDIS_URL=${REDIS_URL}"
  "REDIS_SSL=false"
  "ENVIRONMENT=production"
)

worker_env_vars=(
  "SUPABASE_URL=secretref:supaurl"
  "SUPABASE_SERVICE_ROLE_KEY=secretref:supasvc"
  "AZURE_OPENAI_ENDPOINT=secretref:aoaiurl"
  "AZURE_OPENAI_API_KEY=secretref:aoaikey"
  "AZURE_OPENAI_DEPLOYMENT=secretref:aoaideploy"
  "AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION}"
  "REDIS_HOST=${REDIS_HOST}"
  "REDIS_PORT=6379"
  "REDIS_URL=${REDIS_URL}"
  "REDIS_SSL=false"
  "ENVIRONMENT=production"
)

if [[ -n "${RESEND_API_KEY:-}" ]]; then
  api_env_vars+=("RESEND_API_KEY=secretref:resend")
else
  api_env_vars+=("RESEND_API_KEY=")
fi
if [[ -n "${SENTRY_DSN:-}" ]]; then
  api_env_vars+=("SENTRY_DSN=secretref:sentry")
  worker_env_vars+=("SENTRY_DSN=secretref:sentry")
else
  api_env_vars+=("SENTRY_DSN=")
  worker_env_vars+=("SENTRY_DSN=")
fi
if [[ -n "${POSTHOG_API_KEY:-}" ]]; then
  api_env_vars+=("POSTHOG_API_KEY=secretref:posthog")
  worker_env_vars+=("POSTHOG_API_KEY=secretref:posthog")
else
  api_env_vars+=("POSTHOG_API_KEY=")
  worker_env_vars+=("POSTHOG_API_KEY=")
fi
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  api_env_vars+=("STRIPE_SECRET_KEY=secretref:stripekey")
else
  api_env_vars+=("STRIPE_SECRET_KEY=")
fi
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  api_env_vars+=("STRIPE_WEBHOOK_SECRET=secretref:stripewhsec")
else
  api_env_vars+=("STRIPE_WEBHOOK_SECRET=")
fi

log "Deploying API container app revision"
az containerapp update \
  --name "${AZURE_API_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --image "${API_IMAGE}" \
  --cpu "1.0" \
  --memory "2.0Gi" \
  --min-replicas 1 \
  --max-replicas 3 \
  --set-env-vars "${api_env_vars[@]}" \
  --output none

az containerapp ingress enable \
  --name "${AZURE_API_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --type external \
  --target-port 8000 \
  --transport http \
  --output none

log "Deploying worker container app revision"
az containerapp update \
  --name "${AZURE_WORKER_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --image "${WORKER_IMAGE}" \
  --cpu "1.0" \
  --memory "2.0Gi" \
  --min-replicas 1 \
  --max-replicas 3 \
  --set-env-vars "${worker_env_vars[@]}" \
  --output none

az containerapp ingress disable \
  --name "${AZURE_WORKER_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none || true

API_FQDN="$(az containerapp show \
  --name "${AZURE_API_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --query properties.configuration.ingress.fqdn -o tsv)"

log "Deployment complete"
echo "API URL: https://${API_FQDN}"
echo "Redis internal host: ${REDIS_HOST}"
echo "API image: ${API_IMAGE}"
echo "Worker image: ${WORKER_IMAGE}"
