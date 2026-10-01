variable "environment" {
  description = "Target environment name (dev, staging, prod)"
  type        = string
}

variable "service_names" {
  description = "List of containerized service names requiring ECR repositories"
  type        = list(string)
  default     = ["frontend", "backend", "ai-service"]
}

variable "image_tag_mutability" {
  description = "Image tag mutability setting: IMMUTABLE ensures exact SHA deployment integrity"
  type        = string
  default     = "IMMUTABLE"
}

variable "max_image_count" {
  description = "Maximum number of historical image tags retained by lifecycle policy"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Common tags applied to all ECR repositories"
  type        = map(string)
  default     = {}
}
