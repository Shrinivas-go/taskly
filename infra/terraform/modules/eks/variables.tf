variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes control plane version"
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "VPC ID where the EKS cluster and node groups will reside"
  type        = string
}

variable "subnet_ids" {
  description = "Private application subnet IDs for worker nodes and internal cluster ENIs"
  type        = list(string)
}

variable "cluster_role_arn" {
  description = "IAM role ARN assumed by the EKS control plane"
  type        = string
}

variable "node_role_arn" {
  description = "IAM role ARN assumed by EC2 worker nodes in the node group"
  type        = string
}

variable "desired_size" {
  description = "Initial desired number of worker nodes"
  type        = number
  default     = 2
}

variable "min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of worker nodes for autoscaling"
  type        = number
  default     = 4
}

variable "instance_types" {
  description = "EC2 instance types for the worker node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "capacity_type" {
  description = "Capacity type for worker nodes (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"
}

variable "endpoint_public_access" {
  description = "Indicates whether the EKS public API server endpoint is enabled"
  type        = bool
  default     = true
}

variable "endpoint_private_access" {
  description = "Indicates whether the EKS private API server endpoint is enabled"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Custom resource tags"
  type        = map(string)
  default     = {}
}
