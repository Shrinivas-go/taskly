variable "environment" {
  description = "Target environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Common tags applied to all IAM roles"
  type        = map(string)
  default     = {}
}
