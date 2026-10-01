output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private application subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

output "db_subnet_group_name" {
  description = "RDS DB subnet group name"
  value       = module.vpc.db_subnet_group_name
}

output "ecr_repository_urls" {
  description = "Service ECR repository URLs for image push"
  value       = module.ecr.repository_urls
}

output "security_group_ids" {
  description = "Security group IDs for ALB, Frontend, Backend, AI, and Database"
  value = {
    alb      = module.security_groups.alb_security_group_id
    frontend = module.security_groups.frontend_security_group_id
    backend  = module.security_groups.backend_security_group_id
    ai       = module.security_groups.ai_security_group_id
    database = module.security_groups.database_security_group_id
  }
}

output "iam_role_arns" {
  description = "IAM role ARNs for CI/CD, EKS, and backend workload"
  value = {
    cicd_deployer    = module.iam.cicd_deployer_role_arn
    eks_cluster      = module.iam.eks_cluster_role_arn
    eks_nodes        = module.iam.eks_nodes_role_arn
    backend_workload = module.iam.backend_pod_role_arn
  }
}

output "secrets_manager_secret_arn" {
  description = "ARN of the application Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "eks_cluster_name" {
  description = "EKS Cluster Name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS Cluster API Endpoint"
  value       = module.eks.cluster_endpoint
}

output "alb_controller_role_arn" {
  description = "IAM Role ARN for AWS Load Balancer Controller"
  value       = module.eks.alb_controller_role_arn
}

# RDS PostgreSQL Outputs (Safe values only - No Passwords)
output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint (host:port)"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL hostname"
  value       = module.rds.db_instance_address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "RDS PostgreSQL default database name"
  value       = module.rds.db_name
}

output "rds_credentials_secret_arn" {
  description = "AWS Secrets Manager secret ARN storing database credentials and DATABASE_URL"
  value       = module.rds.db_credentials_secret_arn
}

