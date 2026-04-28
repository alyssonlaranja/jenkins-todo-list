#!/usr/bin/env bash
#
# Generic Container App deployment script
# Reads configuration from JSON files (same structure as Bicep)
# Usage: ./deploy-container-app.sh <environment> <config-dir> <image>
#

set -euo pipefail

# ============================================================================
# PARAMETERS
# ============================================================================

ENVIRONMENT="${1:-}"
CONFIG_DIR="${2:-}"
CONTAINER_IMAGE="${3:-}"

if [[ -z "$ENVIRONMENT" ]] || [[ -z "$CONFIG_DIR" ]] || [[ -z "$CONTAINER_IMAGE" ]]; then
  echo "Usage: $0 <environment> <config-dir> <image>"
  echo "Example: $0 dev infrastructure/config acrgenaiavanade.azurecr.io/app:tag"
  exit 1
fi

SERVICE_CONFIG_FILE="$CONFIG_DIR/service-config.json"
ENV_CONFIG_FILE="$CONFIG_DIR/env/${ENVIRONMENT}.json"

# Validate files exist
[[ -f "$SERVICE_CONFIG_FILE" ]] || { echo "ERROR: $SERVICE_CONFIG_FILE not found"; exit 1; }
[[ -f "$ENV_CONFIG_FILE" ]] || { echo "ERROR: $ENV_CONFIG_FILE not found"; exit 1; }

# ============================================================================
# LOGGING
# ============================================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info(){ echo -e "${GREEN}[INFO]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERROR]${NC} $*"; }

# ============================================================================
# LOAD CONFIG
# ============================================================================

info "Loading configuration..."

# Helper to get config value (env overrides service)
get_config() {
  local key="$1"
  local env_val service_val
  
  env_val=$(jq -r ".${key} // empty" "$ENV_CONFIG_FILE" 2>/dev/null || echo "")
  service_val=$(jq -r ".${key} // empty" "$SERVICE_CONFIG_FILE" 2>/dev/null || echo "")
  
  echo "${env_val:-$service_val}"
}

# Load all configurations
SERVICE_NAME=$(get_config "name")
RESOURCE_GROUP="${ACA_RESOURCE_GROUP:-$(get_config "resourceGroup")}"
LOCATION="${AZURE_LOCATION:-$(get_config "location")}"

KEY_VAULT_NAME=$(get_config "keyVaultName")
KEY_VAULT_RESOURCE_GROUP=$(get_config "keyVaultResourceGroup")
LOG_ANALYTICS_NAME=$(get_config "logAnalyticsName")
VNET_NAME=$(get_config "vnetName")
SUBNET_NAME=$(get_config "subnetName")
ACA_ENVIRONMENT=$(get_config "environmentName")

# Extract ACR name from the container image (e.g., "acrname.azurecr.io/repo:tag" -> "acrname")
ACR_SERVER=$(echo "$CONTAINER_IMAGE" | cut -d'/' -f1)
ACR_NAME=$(echo "$ACR_SERVER" | cut -d'.' -f1)

# ACR Resource Group can be set via environment variable or config
ACR_RESOURCE_GROUP="${ACR_RESOURCE_GROUP:-$(get_config "acrResourceGroup")}"
if [[ -z "$ACR_RESOURCE_GROUP" ]]; then
  err "ACR_RESOURCE_GROUP not set (via env var or config)"
  exit 1
fi

CONTAINER_PORT=$(get_config "container.port")
INGRESS_EXTERNAL=$(get_config "ingress.external")

MIN_REPLICAS=$(get_config "scaling.minReplicas")
MAX_REPLICAS=$(get_config "scaling.maxReplicas")
CPU=$(get_config "resources.cpu")
MEMORY=$(get_config "resources.memory")

# Health probe settings
HEALTH_PROBE_PATH=$(get_config "healthProbe.path")
LIVENESS_INITIAL_DELAY=$(get_config "healthProbe.liveness.initialDelaySeconds")
LIVENESS_PERIOD=$(get_config "healthProbe.liveness.periodSeconds")
LIVENESS_TIMEOUT=$(get_config "healthProbe.liveness.timeoutSeconds")
LIVENESS_FAILURE=$(get_config "healthProbe.liveness.failureThreshold")
READINESS_INITIAL_DELAY=$(get_config "healthProbe.readiness.initialDelaySeconds")
READINESS_PERIOD=$(get_config "healthProbe.readiness.periodSeconds")
READINESS_TIMEOUT=$(get_config "healthProbe.readiness.timeoutSeconds")
READINESS_FAILURE=$(get_config "healthProbe.readiness.failureThreshold")

# Validation
[[ -n "$SERVICE_NAME" ]] || { err "SERVICE_NAME not found in config"; exit 1; }
[[ -n "$RESOURCE_GROUP" ]] || { err "RESOURCE_GROUP not set"; exit 1; }
[[ -n "$KEY_VAULT_NAME" ]] || { err "KEY_VAULT_NAME not found in config"; exit 1; }

info "Service: $SERVICE_NAME"
info "Environment: $ENVIRONMENT"
info "Resource Group: $RESOURCE_GROUP"
info "ACR: $ACR_SERVER (RG: $ACR_RESOURCE_GROUP)"
info "Image: $CONTAINER_IMAGE"

# ============================================================================
# RETRY UTILITY
# ============================================================================

retry() {
  local max="$1"; shift
  local i
  for i in $(seq 1 "$max"); do
    if "$@"; then return 0; fi
    warn "Attempt $i/$max failed, retrying in 20s..."
    sleep 20
  done
  return 1
}

# ============================================================================
# ENSURE SUBNET
# ============================================================================

ensure_subnet() {
  info "Checking subnet..."
  
  if ! az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" --name "$SUBNET_NAME" &>/dev/null; then
    info "Creating subnet $SUBNET_NAME..."
    az network vnet subnet create -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" \
      -n "$SUBNET_NAME" --address-prefixes "192.168.98.0/23" -o none
  fi
  
  local hasDelegation
  hasDelegation=$(az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "$SUBNET_NAME" \
    --query "delegations[?serviceName=='Microsoft.App/environments'] | length(@)" -o tsv)
  
  if [[ "${hasDelegation:-0}" -eq 0 ]]; then
    info "Delegating subnet to Microsoft.App/environments..."
    az network vnet subnet update -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "$SUBNET_NAME" \
      --delegations Microsoft.App/environments -o none
  fi
  
  SUBNET_ID=$(az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "$SUBNET_NAME" --query id -o tsv)
  info "Subnet ready: $SUBNET_ID"
}

# ============================================================================
# ENSURE ENVIRONMENT
# ============================================================================

ensure_environment() {
  info "Checking Container Apps Environment..."
  
  if az containerapp env show -g "$RESOURCE_GROUP" -n "$ACA_ENVIRONMENT" &>/dev/null; then
    info "Environment exists: $ACA_ENVIRONMENT"
  else
    info "Creating Container Apps Environment..."
    az containerapp env create -g "$RESOURCE_GROUP" -n "$ACA_ENVIRONMENT" \
      -l "${LOCATION:-brazilsouth}" \
      --infrastructure-subnet-resource-id "$SUBNET_ID" \
      --internal-only false -o none
    info "Environment created: $ACA_ENVIRONMENT"
  fi
}

# ============================================================================
# ENSURE CONTAINER APP (SHELL)
# ============================================================================

ensure_container_app() {
  info "Checking Container App..."
  
  if az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" &>/dev/null; then
    info "Container App exists: $SERVICE_NAME"
    az containerapp identity assign -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" --system-assigned -o none 2>/dev/null || true
  else
    info "Creating Container App (initial without registry)..."
    local external_flag="external"
    [[ "$INGRESS_EXTERNAL" == "false" ]] && external_flag="internal"
    
    # Create without registry first (avoid cross-subscription issue)
    az containerapp create -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
      --environment "$ACA_ENVIRONMENT" \
      --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
      --target-port "${CONTAINER_PORT:-8080}" --ingress "$external_flag" \
      --system-assigned \
      --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi -o none
    info "Container App created: $SERVICE_NAME"
  fi
  
  PRINCIPAL_ID=$(az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" --query "identity.principalId" -o tsv)
  info "Managed Identity: $PRINCIPAL_ID"
}

# ============================================================================
# GRANT PERMISSIONS
# ============================================================================

grant_acr_access() {
  info "Granting ACR access..."
  info "Using ACR: $ACR_SERVER in resource group: $ACR_RESOURCE_GROUP"
  
  # Build ACR resource ID directly (avoid permission issues with az acr show)
  local subscription_id
  subscription_id=$(az account show --query id -o tsv)
  local acr_id="/subscriptions/${subscription_id}/resourceGroups/${ACR_RESOURCE_GROUP}/providers/Microsoft.ContainerRegistry/registries/${ACR_NAME}"
  
  info "ACR Resource ID: $acr_id"
  
  # Check if AcrPull role already exists
  local exists
  exists=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$acr_id" --role "AcrPull" --query "length(@)" -o tsv 2>/dev/null || echo "0")
  
  if [[ "${exists:-0}" -eq 0 ]]; then
    info "Creating AcrPull role assignment..."
    if az role assignment create --assignee "$PRINCIPAL_ID" --scope "$acr_id" --role "AcrPull" -o none 2>/dev/null; then
      info "✅ ACR access granted successfully"
      return 0  # New permission created, need to wait
    else
      warn "⚠️  Failed to grant ACR access automatically (permission issue)"
      warn ""
      
      # Try to verify if permission exists via alternative method
      info "Attempting to verify existing permissions..."
      sleep 2
      exists=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$acr_id" --role "AcrPull" --query "length(@)" -o tsv 2>/dev/null || echo "0")
      
      if [[ "${exists:-0}" -gt 0 ]]; then
        info "✅ AcrPull permission exists (verified after retry)"
        return 1  # Permission exists, no wait needed
      fi
      
      warn ""
      warn "⚠️  WARNING: AcrPull permission may not be configured!"
      warn ""
      warn "If this is the FIRST deployment, you MUST grant the permission manually:"
      warn "  az role assignment create --assignee $PRINCIPAL_ID --scope $acr_id --role AcrPull"
      warn ""
      warn "Or ensure the Service Principal has 'User Access Administrator' role on:"
      warn "  Resource Group: $ACR_RESOURCE_GROUP"
      warn ""
      warn "Continuing deployment - registry configuration will wait 30s for manual permission..."
      warn "If permission doesn't exist, the registry set command will timeout/fail."
      warn ""
      sleep 30  # Give time for manual permission grant
      return 0  # Assume permission will be granted, needs wait
    fi
  else
    info "✅ ACR access already granted"
    return 1  # Already exists, no wait needed
  fi
}

grant_keyvault_access() {
  info "Granting Key Vault access to $KEY_VAULT_NAME..."
  
  # Use resource group se especificado
  local kv_rg_param=""
  [[ -n "$KEY_VAULT_RESOURCE_GROUP" ]] && kv_rg_param="-g $KEY_VAULT_RESOURCE_GROUP"
  
  local kv_id; kv_id=$(az keyvault show -n "$KEY_VAULT_NAME" $kv_rg_param --query id -o tsv)
  local rbac; rbac=$(az keyvault show -n "$KEY_VAULT_NAME" $kv_rg_param --query "properties.enableRbacAuthorization" -o tsv)
  
  if [[ "$rbac" == "true" ]]; then
    local exists
    exists=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$kv_id" --role "Key Vault Secrets User" --query "length(@)" -o tsv)
    if [[ "${exists:-0}" -eq 0 ]]; then
      info "Creating Key Vault Secrets User role..."
      az role assignment create --assignee "$PRINCIPAL_ID" --scope "$kv_id" --role "Key Vault Secrets User" -o none
    fi
  else
    local hasPolicy
    hasPolicy=$(az keyvault show -n "$KEY_VAULT_NAME" $kv_rg_param \
      --query "properties.accessPolicies[?objectId=='$PRINCIPAL_ID'] | length(@)" -o tsv)
    if [[ "${hasPolicy:-0}" -eq 0 ]]; then
      info "Adding Key Vault access policy..."
      az keyvault set-policy -n "$KEY_VAULT_NAME" $kv_rg_param --object-id "$PRINCIPAL_ID" \
        --secret-permissions get list -o none
    fi
  fi
  
  info "Key Vault access granted"
}

configure_acr_registry() {
  info "Configuring ACR with Managed Identity..."
  info "ACR: ${ACR_SERVER} (Resource Group: ${ACR_RESOURCE_GROUP})"
  
  # Check if registry is already configured correctly
  local current_registry
  current_registry=$(az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --query "properties.configuration.registries[?server=='${ACR_SERVER}'].server" -o tsv 2>/dev/null || echo "")
  
  local current_identity
  current_identity=$(az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --query "properties.configuration.registries[?server=='${ACR_SERVER}'].identity" -o tsv 2>/dev/null || echo "")
  
  if [[ "$current_registry" == "$ACR_SERVER" ]] && [[ "$current_identity" == "system" ]]; then
    info "✅ ACR already configured correctly with Managed Identity, skipping..."
    return 0
  fi
  
  info "Updating ACR configuration..."
  
  # Remove existing registry configuration (only if different)
  az containerapp registry remove -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --server "${ACR_SERVER}" -o none 2>/dev/null || true
  
  # Set registry with Managed Identity
  az containerapp registry set -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --server "${ACR_SERVER}" --identity system -o none
  
  info "✅ ACR configured with Managed Identity"
}

# ============================================================================
# CONFIGURE SECRETS
# ============================================================================

configure_secrets() {
  info "Configuring secrets from Key Vault: ${KEY_VAULT_NAME}..."
  
  local kv_uri="https://${KEY_VAULT_NAME}.vault.azure.net"
  info "Key Vault URI: ${kv_uri}"
  local secrets_args=()
  
  # Read secrets from service-config.json
  local secrets_json
  secrets_json=$(jq -c '.secrets // []' "$SERVICE_CONFIG_FILE")
  local secret_count
  secret_count=$(echo "$secrets_json" | jq 'length')
  
  if [[ "$secret_count" -eq 0 ]]; then
    warn "No secrets configured"
    return 0
  fi
  
  info "Configuring $secret_count secrets..."
  
  # Build secrets array
  for i in $(seq 0 $((secret_count - 1))); do
    local secret_name kv_secret_name
    secret_name=$(echo "$secrets_json" | jq -r ".[$i].name")
    kv_secret_name=$(echo "$secrets_json" | jq -r ".[$i].keyVaultSecretName")
    
    secrets_args+=("${secret_name}=keyvaultref:${kv_uri}/secrets/${kv_secret_name},identityref:system")
  done
  
  # Clean old secrets
  local old_secrets
  old_secrets=$(az containerapp secret list -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" --query "[].name" -o tsv 2>/dev/null || true)
  if [[ -n "$old_secrets" ]]; then
    info "Removing old secrets..."
    # shellcheck disable=SC2086
    az containerapp secret remove -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" --secret-names $old_secrets -o none 2>/dev/null || true
  fi
  
  # Set new secrets
  info "Setting ${#secrets_args[@]} secrets..."
  retry 5 az containerapp secret set -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" --secrets "${secrets_args[@]}" -o none
  
  info "Secrets configured"
}

# ============================================================================
# CONFIGURE ENVIRONMENT VARIABLES
# ============================================================================

configure_environment_variables() {
  info "Configuring environment variables..."
  
  local env_vars_args=()
  
  # Read environment variables from both configs
  local service_vars env_vars
  service_vars=$(jq -c '.environmentVariables // []' "$SERVICE_CONFIG_FILE")
  env_vars=$(jq -c '.environmentVariables // []' "$ENV_CONFIG_FILE")
  
  # Merge arrays (env overrides service, no duplicates)
  local all_vars
  all_vars=$(jq -c -s '
    (.[0] + .[1]) | 
    group_by(.name) | 
    map(last)
  ' <(echo "$service_vars") <(echo "$env_vars"))
  
  local var_count
  var_count=$(echo "$all_vars" | jq 'length')
  
  # Add static env vars
  if [[ "$var_count" -gt 0 ]]; then
    for i in $(seq 0 $((var_count - 1))); do
      local var_name var_value
      var_name=$(echo "$all_vars" | jq -r ".[$i].name")
      var_value=$(echo "$all_vars" | jq -r ".[$i].value")
      
      # Skip if name or value is empty/null
      if [[ -n "$var_name" ]] && [[ "$var_name" != "null" ]]; then
        env_vars_args+=("${var_name}=${var_value}")
      fi
    done
  fi
  
  # Add secret references
  local secrets_json
  secrets_json=$(jq -c '.secrets // []' "$SERVICE_CONFIG_FILE")
  local secret_count
  secret_count=$(echo "$secrets_json" | jq 'length')
  
  if [[ "$secret_count" -gt 0 ]]; then
    for i in $(seq 0 $((secret_count - 1))); do
      local env_var_name secret_name
      env_var_name=$(echo "$secrets_json" | jq -r ".[$i].envVarName")
      secret_name=$(echo "$secrets_json" | jq -r ".[$i].name")
      
      # Skip if names are empty/null
      if [[ -n "$env_var_name" ]] && [[ "$env_var_name" != "null" ]] && [[ -n "$secret_name" ]] && [[ "$secret_name" != "null" ]]; then
        env_vars_args+=("${env_var_name}=secretref:${secret_name}")
      fi
    done
  fi
  
  if [[ ${#env_vars_args[@]} -gt 0 ]]; then
    info "Setting ${#env_vars_args[@]} environment variables..."
    retry 5 az containerapp update -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
      --set-env-vars "${env_vars_args[@]}" -o none
    info "Environment variables configured"
  else
    warn "No environment variables to configure"
  fi
}

# ============================================================================
# UPDATE IMAGE & RESOURCES (with health probes)
# ============================================================================

update_app() {
  info "Updating container image and resources..."
  
  # Build complete YAML with everything (image, resources, health probes, env vars)
  local temp_yaml="/tmp/containerapp-${SERVICE_NAME}.yaml"
  
  info "Building complete container app configuration..."
  
  # Get current env vars to preserve them
  local current_env_vars
  current_env_vars=$(az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --query "properties.template.containers[0].env" -o json 2>/dev/null || echo "[]")
  
  # Get current secrets to preserve them
  local current_secrets
  current_secrets=$(az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --query "properties.configuration.secrets" -o json 2>/dev/null || echo "[]")
  
  # Defaults
  local hp_path="${HEALTH_PROBE_PATH:-/health}"
  local liveness_delay="${LIVENESS_INITIAL_DELAY:-30}"
  local liveness_period="${LIVENESS_PERIOD:-10}"
  local liveness_timeout="${LIVENESS_TIMEOUT:-5}"
  local liveness_failure="${LIVENESS_FAILURE:-3}"
  local readiness_delay="${READINESS_INITIAL_DELAY:-5}"
  local readiness_period="${READINESS_PERIOD:-5}"
  local readiness_timeout="${READINESS_TIMEOUT:-3}"
  local readiness_failure="${READINESS_FAILURE:-3}"
  
  # Create complete YAML
  cat > "$temp_yaml" <<EOF
properties:
  template:
    containers:
    - name: ${SERVICE_NAME}
      image: ${CONTAINER_IMAGE}
      resources:
        cpu: ${CPU:-0.5}
        memory: ${MEMORY:-1Gi}
      probes:
      - type: Liveness
        httpGet:
          path: ${hp_path}
          port: ${CONTAINER_PORT}
          scheme: HTTP
        initialDelaySeconds: ${liveness_delay}
        periodSeconds: ${liveness_period}
        timeoutSeconds: ${liveness_timeout}
        failureThreshold: ${liveness_failure}
      - type: Readiness
        httpGet:
          path: ${hp_path}
          port: ${CONTAINER_PORT}
          scheme: HTTP
        initialDelaySeconds: ${readiness_delay}
        periodSeconds: ${readiness_period}
        timeoutSeconds: ${readiness_timeout}
        failureThreshold: ${readiness_failure}
      env: ${current_env_vars}
    scale:
      minReplicas: ${MIN_REPLICAS:-1}
      maxReplicas: ${MAX_REPLICAS:-3}
  configuration:
    secrets: ${current_secrets}
EOF
  
  info "Applying complete configuration (image, resources, health probes, env vars)..."
  retry 5 az containerapp update -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --yaml "$temp_yaml" -o none
  
  rm -f "$temp_yaml"
  
  # Force new revision
  info "Triggering new revision..."
  retry 5 az containerapp update -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --set-env-vars "REDEPLOY_AT=$(date +%s)" -o none
  
  local fqdn
  fqdn=$(az containerapp show -g "$RESOURCE_GROUP" -n "$SERVICE_NAME" \
    --query "properties.configuration.ingress.fqdn" -o tsv)
  
  info "✅ Deployment completed!"
  info "App URL: https://${fqdn}"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  info "Starting deployment..."
  info "Environment: $ENVIRONMENT"
  info "Service: $SERVICE_NAME"
  
  ensure_subnet
  ensure_environment
  ensure_container_app
  
  # Track if new permissions were granted
  local need_rbac_wait=false
  
  grant_acr_access && need_rbac_wait=true || true
  grant_keyvault_access
  
  # Only wait if new role assignments were created
  if [[ "$need_rbac_wait" == "true" ]]; then
    warn "Waiting 15s for RBAC propagation (new permissions)..."
    sleep 15
  else
    info "Permissions already configured, skipping wait..."
  fi
  
  configure_acr_registry
  configure_secrets
  configure_environment_variables
  update_app
  
  info "✅ Done!"
}

main "$@"