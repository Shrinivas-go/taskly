# ==============================================================================
# RDS PostgreSQL Module - Outputs
# ==============================================================================

output "db_instance_id" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_address" {
  description = "The hostname address of the RDS instance (e.g. for DNS/internal resolution)"
  value       = aws_db_instance.main.address
}

output "db_instance_endpoint" {
  description = "The connection endpoint in address:port format"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_port" {
  description = "The database port (5432)"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "The database name"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "The master username for the database"
  value       = aws_db_instance.main.username
}

output "db_credentials_secret_arn" {
  description = "ARN of the AWS Secrets Manager secret storing database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}
