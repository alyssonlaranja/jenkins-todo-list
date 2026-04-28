# =============================================================================
# Variables
# =============================================================================

variable "resource_group_name" {
  description = "Nome do Resource Group"
  type        = string
}

variable "location" {
  description = "Azure Region"
  type        = string
  default     = "brazilsouth"
}

variable "container_app_environment_name" {
  description = "Nome do Container Apps Environment"
  type        = string
}

variable "log_analytics_name" {
  description = "Nome do Log Analytics Workspace"
  type        = string
}

variable "vnet_name" {
  description = "Nome da Virtual Network"
  type        = string
}

variable "vnet_address_space" {
  description = "Address space da VNet (CIDR)"
  type        = string
  default     = "192.168.96.0/21"
}

variable "subnet_name" {
  description = "Nome da Subnet para Container Apps"
  type        = string
}

variable "subnet_address_prefix" {
  description = "Address prefix da Subnet (CIDR, mínimo /23 para Container Apps)"
  type        = string
  default     = "192.168.98.0/23"
}

variable "tags" {
  description = "Tags para os recursos"
  type        = map(string)
  default     = {}
}
