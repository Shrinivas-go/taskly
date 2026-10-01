variable "aws_region" {
  description = "Target AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to distribute subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private application subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for isolated database subnets"
  type        = list(string)
  default     = ["10.0.30.0/24", "10.0.40.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet outbound internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway across AZs to minimize development costs"
  type        = bool
  default     = true
}

# RDS PostgreSQL Variables (Cost-Conscious Dev Defaults)
variable "db_name" {
  description = "PostgreSQL default database name"
  type        = string
  default     = "todoist_dev"
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
  description = "RDS instance class (burstable cost-efficient tier for dev)"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage allocation for autoscaling in GB"
  type        = number
  default     = 50
}

variable "db_multi_az" {
  description = "Enable Multi-AZ high availability (disabled in dev to save cost)"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Enable deletion protection (disabled in dev for teardown flexibility)"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 1
}

variable "db_skip_final_snapshot" {
  description = "Skip final snapshot on deletion in dev"
  type        = bool
  default     = true
}

