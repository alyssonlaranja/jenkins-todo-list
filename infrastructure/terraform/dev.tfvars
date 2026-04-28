# =============================================================================
# Development Environment - Terraform Variables
# =============================================================================

resource_group_name            = "rg-aigrowth-shared"
container_app_environment_name = "cae-evolutionapi"
log_analytics_name             = "log-aigrowth-dev"
location                       = "brazilsouth"
vnet_name                      = "vnet-ai-evolutionapi-dev"
subnet_name                    = "snet-ai-evolutionapi-dev"
vnet_address_space             = "192.168.108.0/21"
subnet_address_prefix          = "192.168.109.0/23"

tags = {
  environment = "development"
  project     = "AI GROWTH"
  managed_by  = "lays.dantas.de.souza@avanade.com"
}
