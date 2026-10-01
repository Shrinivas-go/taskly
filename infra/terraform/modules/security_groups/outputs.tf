output "alb_security_group_id" {
  description = "ID of the Application Load Balancer security group"
  value       = aws_security_group.alb.id
}

output "frontend_security_group_id" {
  description = "ID of the frontend workload security group"
  value       = aws_security_group.frontend.id
}

output "backend_security_group_id" {
  description = "ID of the backend API security group"
  value       = aws_security_group.backend.id
}

output "ai_security_group_id" {
  description = "ID of the internal FastAPI AI service security group"
  value       = aws_security_group.ai.id
}

output "database_security_group_id" {
  description = "ID of the PostgreSQL database security group"
  value       = aws_security_group.database.id
}
