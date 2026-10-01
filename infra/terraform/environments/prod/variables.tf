variable "aws_region" {
  description = "Target AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target environment name"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.2.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to distribute subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.2.1.0/24", "10.2.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private application subnets"
  type        = list(string)
  default     = ["10.2.10.0/24", "10.2.20.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for isolated database subnets"
  type        = list(string)
  default     = ["10.2.30.0/24", "10.2.40.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet outbound internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Production requires multi-AZ redundant NAT Gateways for fault tolerance"
  type        = bool
  default     = false
}

# RDS PostgreSQL Variables (Production Durability Defaults)
variable "db_name" {
  description = "PostgreSQL default database name"
  type        = string
  default     = "todoist_prod"
}

variable "db_username" {
  description = "Master username for PostgreSQL database"
  type        = string
  default     = "todoist_admin"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.3"
}

variable "db_instance_class" {
  description = "RDS instance class for production workloads"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "Maximum storage allocation for autoscaling in GB"
  type        = number
  default     = 200
}

variable "db_multi_az" {
  description = "Enable Multi-AZ high availability with synchronous standby"
  type        = bool
  default     = true
}

variable "db_deletion_protection" {
  description = "Enable deletion protection against accidental deletion in production"
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days (Point-in-time recovery)"
  type        = number
  default     = 30
}

variable "db_skip_final_snapshot" {
  description = "Determines whether a final snapshot is created before deletion (mandatory in prod)"
  type        = bool
  default     = false
}

