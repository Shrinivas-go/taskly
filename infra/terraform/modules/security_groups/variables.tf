variable "environment" {
  description = "Target environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "tags" {
  description = "Common tags applied to all security groups"
  type        = map(string)
  default     = {}
}
