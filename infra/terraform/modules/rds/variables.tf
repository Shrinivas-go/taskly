# ==============================================================================
# RDS PostgreSQL Module - Variables
# ==============================================================================

variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "db_identifier" {
  description = "Identifier for the RDS PostgreSQL instance (defaults to todoist-<env>-db)"
  type        = string
  default     = null
}

variable "db_name" {
  description = "Name of the default PostgreSQL database"
  type        = string
  default     = "todoist"
}

variable "db_username" {
  description = "Master username for PostgreSQL database"
  type        = string
  default     = "todoist_admin"
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.3"
}

variable "instance_class" {
  description = "RDS instance class (e.g., db.t4g.micro for dev, db.t4g.medium for prod)"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage allocation for autoscaling in GB (0 to disable)"
  type        = number
  default     = 50
}

variable "storage_type" {
  description = "EBS storage type (gp3 recommended for performance and cost)"
  type        = string
  default     = "gp3"
}

variable "storage_encrypted" {
  description = "Specifies whether the DB instance storage is encrypted"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "ARN of the KMS encryption key (null uses default AWS managed key)"
  type        = string
  default     = null
}

variable "multi_az" {
  description = "Specifies if the RDS instance is Multi-AZ (synchronous standby in 2nd AZ)"
  type        = bool
  default     = false
}

variable "db_subnet_group_name" {
  description = "Name of the DB subnet group in private database subnets"
  type        = string
}

variable "vpc_security_group_ids" {
  description = "List of security group IDs to associate with RDS"
  type        = list(string)
}

variable "backup_retention_period" {
  description = "Backup retention period in days (0-35)"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Daily backup window (UTC format hh24:mi-hh24:mi)"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Weekly maintenance window (UTC format ddd:hh24:mi-ddd:hh24:mi)"
  type        = string
  default     = "Mon:04:30-Mon:05:30"
}

variable "deletion_protection" {
  description = "Prevents accidental database deletion in production"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Determines whether a final DB snapshot is created before the instance is deleted"
  type        = bool
  default     = true
}

variable "final_snapshot_identifier" {
  description = "Name of the final snapshot when deleted (if skip_final_snapshot is false)"
  type        = string
  default     = null
}

variable "auto_minor_version_upgrade" {
  description = "Indicates that minor engine upgrades will be applied automatically"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Custom resource tags"
  type        = map(string)
  default     = {}
}
