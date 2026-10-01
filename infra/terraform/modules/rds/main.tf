# ==============================================================================
# RDS PostgreSQL Database Infrastructure Module
# ==============================================================================

# 1. Cryptographically Secure Random Password Generation
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# 2. Database Parameter Group (PostgreSQL 16)
resource "aws_db_parameter_group" "main" {
  name        = "todoist-${var.environment}-pg16-params"
  family      = "postgres16"
  description = "Custom parameter group for todoist-${var.environment} PostgreSQL 16"

  # Force TLS/SSL in transit for all database connections
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Log slow queries taking longer than 1000ms for observability
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-pg16-params"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# 3. Amazon RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier = var.db_identifier != null ? var.db_identifier : "todoist-${var.environment}-db"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = var.storage_encrypted
  kms_key_id            = var.kms_key_id

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  # Private Subnet Placement & Isolation
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.vpc_security_group_ids
  publicly_accessible    = false

  # Multi-AZ High Availability
  multi_az = var.multi_az

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name

  # Backup & Maintenance Configuration
  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window

  auto_minor_version_upgrade  = var.auto_minor_version_upgrade
  allow_major_version_upgrade = false

  # Deletion Protection & Snapshot Safeguards
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : (
    var.final_snapshot_identifier != null ? var.final_snapshot_identifier : "todoist-${var.environment}-db-final-snapshot"
  )

  copy_tags_to_snapshot = true

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-db"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# 4. AWS Secrets Manager Integration (Store Credentials without Source Exposure)
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "todoist/${var.environment}/rds-credentials"
  description             = "Master credentials and connection URL for todoist-${var.environment} RDS PostgreSQL"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-rds-credentials"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine       = "postgres"
    host         = aws_db_instance.main.address
    port         = aws_db_instance.main.port
    username     = aws_db_instance.main.username
    password     = random_password.db_password.result
    database     = aws_db_instance.main.db_name
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}?sslmode=require"
  })
}
