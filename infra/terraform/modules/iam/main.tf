# ==========================================
# IAM Least Privilege Infrastructure Module
# ==========================================

# 1. CI/CD Deployment Role (used by Jenkins to push images and coordinate deployments)
resource "aws_iam_role" "cicd_deployer" {
  name        = "todoist-${var.environment}-cicd-deployer-role"
  description = "Least-privilege role assumed by CI/CD pipeline (Jenkins) for image push and deployment"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-cicd-deployer-role"
      Environment = var.environment
    }
  )
}

# Policy for CI/CD ECR push & image management
resource "aws_iam_policy" "cicd_ecr_policy" {
  name        = "todoist-${var.environment}-cicd-ecr-policy"
  description = "Scoped policy granting CI/CD authorization to authenticate and push to service ECR repos"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuthToken"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRImagePush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = [
          "arn:aws:ecr:*:*:repository/todoist-${var.environment}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cicd_ecr_attachment" {
  role       = aws_iam_role.cicd_deployer.name
  policy_arn = aws_iam_policy.cicd_ecr_policy.arn
}

# 2. EKS Cluster Control Plane IAM Role (prepared for upcoming EKS milestone)
resource "aws_iam_role" "eks_cluster" {
  name        = "todoist-${var.environment}-eks-cluster-role"
  description = "IAM role assumed by EKS control plane to manage AWS networking and compute resources"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-eks-cluster-role"
      Environment = var.environment
    }
  )
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
}

# 3. EKS Managed Node Group IAM Role
resource "aws_iam_role" "eks_nodes" {
  name        = "todoist-${var.environment}-eks-nodes-role"
  description = "IAM role assumed by EC2 worker nodes in EKS cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-eks-nodes-role"
      Environment = var.environment
    }
  )
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# 4. Backend Workload IAM Role (Pod-level IRSA - IAM Roles for Service Accounts)
resource "aws_iam_role" "backend_workload" {
  name        = "todoist-${var.environment}-backend-pod-role"
  description = "Scoped IRSA role for backend NestJS pods to securely read application secrets"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PLACEHOLDER"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "oidc.eks.us-east-1.amazonaws.com/id/PLACEHOLDER:sub" = "system:serviceaccount:todoist-${var.environment}:backend-sa"
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "todoist-${var.environment}-backend-pod-role"
      Environment = var.environment
    }
  )
}

# Secrets Manager scoped read-only policy for Backend
resource "aws_iam_policy" "backend_secrets_policy" {
  name        = "todoist-${var.environment}-backend-secrets-policy"
  description = "Grants backend pod read access to environment-scoped secrets in AWS Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetApplicationSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:*:*:secret:todoist/${var.environment}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backend_secrets_attachment" {
  role       = aws_iam_role.backend_workload.name
  policy_arn = aws_iam_policy.backend_secrets_policy.arn
}
