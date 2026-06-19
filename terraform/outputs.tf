# =============================================================================
# Terraform Outputs — Aura Cloud SaaS
# =============================================================================
# These outputs are read by the GitHub Actions pipeline using:
#   terraform output -raw <output_name>
#
# The pipeline then passes them as environment variables or job outputs
# to the docker build and helm deploy stages.
#
# ⚠️  SENSITIVE outputs are marked sensitive = true.
#     They will NOT appear in Terraform plan/apply logs.
#     They ARE accessible via: terraform output -raw <name>
# =============================================================================

# --- EC2 ---

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance — used as DEPLOY_HOST"
  value       = aws_instance.crm_server.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS hostname of the EC2 instance"
  value       = aws_instance.crm_server.public_dns
}

# --- SSH ---

output "ssh_private_key" {
  description = "RSA private key to SSH into EC2 — used as DEPLOY_SSH_KEY in pipeline"
  value       = tls_private_key.deploy_key.private_key_pem
  sensitive   = true  # Will not appear in logs
}

output "deploy_user" {
  description = "Default SSH username for Amazon Linux AMIs"
  value       = "ec2-user"
}

# --- RDS ---

output "rds_endpoint" {
  description = "RDS instance endpoint hostname — used as DB_HOST in backend"
  value       = aws_db_instance.postgres.address  # hostname only, not port
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "Name of the PostgreSQL database"
  value       = aws_db_instance.postgres.db_name
}

output "db_username" {
  description = "PostgreSQL master username"
  value       = aws_db_instance.postgres.username
}

output "db_password" {
  description = "Auto-generated PostgreSQL password — used as DB_PASSWORD in backend"
  value       = random_password.db_password.result
  sensitive   = true  # Will not appear in logs
}

# --- JWT ---

output "jwt_secret" {
  description = "Auto-generated JWT signing secret — used as JWT_SECRET in backend pods"
  value       = random_password.jwt_secret.result
  sensitive   = true  # Will not appear in logs
}

# --- Summary (safe to print in logs) ---

output "deployment_summary" {
  description = "Human-readable deployment summary printed at end of terraform apply"
  value = <<-EOT
    ============================================
    Aura SaaS Infrastructure Provisioned
    ============================================
    EC2 Public IP  : ${aws_instance.crm_server.public_ip}
    EC2 DNS        : ${aws_instance.crm_server.public_dns}
    RDS Endpoint   : ${aws_db_instance.postgres.address}
    RDS DB Name    : ${aws_db_instance.postgres.db_name}
    RDS Username   : ${aws_db_instance.postgres.username}
    SSH User       : ec2-user
    ============================================
    DB Password and JWT Secret: use terraform output -raw
    ============================================
  EOT
}
