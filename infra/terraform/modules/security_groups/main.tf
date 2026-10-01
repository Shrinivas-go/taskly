# ==========================================
# Security Groups Module - Strict Least Privilege
# ==========================================

# 1. Public ALB Security Group
resource "aws_security_group" "alb" {
  name        = "todoist-${var.environment}-alb-sg"
  description = "Security group for public Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow inbound HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound to VPC workloads"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-alb-sg"
      Environment = var.environment
    }
  )
}

# 2. Frontend Workload Security Group
resource "aws_security_group" "frontend" {
  name        = "todoist-${var.environment}-frontend-sg"
  description = "Security group for Next.js frontend workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow inbound HTTP traffic only from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound for external resources and backend connectivity"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-frontend-sg"
      Environment = var.environment
    }
  )
}

# 3. Backend API Security Group
resource "aws_security_group" "backend" {
  name        = "todoist-${var.environment}-backend-sg"
  description = "Security group for NestJS backend API workloads"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow inbound HTTP traffic from ALB"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Allow direct inbound HTTP traffic from Frontend pods"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  egress {
    description = "Allow all outbound (database, AI service, AWS APIs)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-backend-sg"
      Environment = var.environment
    }
  )
}

# 4. FastAPI AI Service Security Group (strictly internal)
resource "aws_security_group" "ai" {
  name        = "todoist-${var.environment}-ai-sg"
  description = "Security group for FastAPI AI service (strictly internal to backend)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow inbound HTTP traffic ONLY from backend service"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  egress {
    description = "Allow outbound to NAT Gateway for LLM provider API calls (Groq/OpenAI)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-ai-sg"
      Environment = var.environment
    }
  )
}

# 5. PostgreSQL Database Security Group (strictly isolated)
resource "aws_security_group" "database" {
  name        = "todoist-${var.environment}-db-sg"
  description = "Security group for PostgreSQL RDS (strictly isolated to backend workloads)"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow PostgreSQL access ONLY from backend workloads"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  egress {
    description = "No outbound traffic permitted from isolated database tier"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["127.0.0.1/32"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-db-sg"
      Environment = var.environment
    }
  )
}
