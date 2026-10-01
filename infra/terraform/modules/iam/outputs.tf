output "cicd_deployer_role_arn" {
  description = "ARN of the CI/CD deployment role"
  value       = aws_iam_role.cicd_deployer.arn
}

output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_nodes_role_arn" {
  description = "ARN of the EKS node group role"
  value       = aws_iam_role.eks_nodes.arn
}

output "backend_pod_role_arn" {
  description = "ARN of the scoped backend workload role"
  value       = aws_iam_role.backend_workload.arn
}
