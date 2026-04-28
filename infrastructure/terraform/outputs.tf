# =============================================================================
# Outputs
# =============================================================================

output "resource_group_name" {
  description = "Nome do Resource Group criado"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID do Resource Group"
  value       = azurerm_resource_group.main.id
}

output "container_app_environment_name" {
  description = "Nome do Container Apps Environment"
  value       = azurerm_container_app_environment.main.name
}

output "container_app_environment_id" {
  description = "ID do Container Apps Environment"
  value       = azurerm_container_app_environment.main.id
}

output "container_app_environment_default_domain" {
  description = "Default domain do Container Apps Environment"
  value       = azurerm_container_app_environment.main.default_domain
}

output "log_analytics_workspace_id" {
  description = "ID do Log Analytics Workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "vnet_name" {
  description = "Nome da Virtual Network"
  value       = azurerm_virtual_network.main.name
}

output "subnet_id" {
  description = "ID da Subnet do Container Apps"
  value       = azurerm_subnet.aca.id
}
