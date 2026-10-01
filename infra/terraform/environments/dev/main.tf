terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "todoist-learning-app"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. VPC Module
module "vpc" {
  source = "../../modules/vpc"

  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  enable_nat_gateway    = var.enable_nat_gateway
  single_nat_gateway    = var.single_nat_gateway
}

# 2. Security Groups Module
module "security_groups" {
  source = "../../modules/security_groups"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# 3. ECR Module
module "ecr" {
  source = "../../modules/ecr"

  environment          = var.environment
  service_names        = ["frontend", "backend", "ai-service"]
  image_tag_mutability = "IMMUTABLE"
  max_image_count      = 30
}

# 4. IAM Module
module "iam" {
  source = "../../modules/iam"

  environment = var.environment
}

# 5. AWS Secrets Manager Container Structure
# Provides secure secret container without embedding secret values in code
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "todoist/${var.environment}/app-secrets"
  description             = "Application secrets container for todoist-${var.environment} (JWT_SECRET, DATABASE_URL, AI_API_KEY)"
  recovery_window_in_days = 0 # Immediate deletion for development cost control

  tags = {
    Name        = "todoist-${var.environment}-app-secrets"
    Environment = var.environment
  }
}

# 6. EKS Module (Control plane, managed node groups, IRSA & ALB controller IAM)
module "eks" {
  source = "../../modules/eks"

  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  cluster_role_arn = module.iam.eks_cluster_role_arn
  node_role_arn    = module.iam.eks_nodes_role_arn

  desired_size   = 2
  min_size       = 1
  max_size       = 3
  instance_types = ["t3.medium"]
  capacity_type  = "SPOT"
}

# 7. RDS PostgreSQL Module (Private data tier in isolated database subnets)
module "rds" {
  source = "../../modules/rds"

  environment             = var.environment
  db_name                 = var.db_name
  db_username             = var.db_username
  engine_version          = var.db_engine_version
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  multi_az                = var.db_multi_az
  deletion_protection     = var.db_deletion_protection
  backup_retention_period = var.db_backup_retention_period
  skip_final_snapshot     = var.db_skip_final_snapshot

  db_subnet_group_name   = module.vpc.db_subnet_group_name
  vpc_security_group_ids = [module.security_groups.database_security_group_id]
}

