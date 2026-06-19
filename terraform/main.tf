# =============================================================================
#  Cloud SaaS — Terraform Infrastructure
# =============================================================================
# This file provisions ALL infrastructure needed to run the CRM platform.
#
# The GitHub Actions pipeline calls:
#   terraform apply -auto-approve
# and then reads outputs like:
#   terraform output -raw ec2_public_ip
#
# The ONLY secrets the developer puts in GitHub are:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
#   AWS_REGION
#
# Everything else is auto-generated here.
# =============================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Terraform state stored in S3 so it persists between pipeline runs.
  # The pipeline creates this bucket on first run using a bootstrap script.
  backend "s3" {
    bucket = "aura-saas-tfstate"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    # No credentials here — pipeline uses AWS env vars from GitHub Secrets
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "aura-saas"
      Environment = var.environment

      ManagedBy = "terraform"
      Course    = "MCA-23ONMCR-753"
    }
  }
}

# =============================================================================
# AUTO-GENERATED SECRETS (no manual input needed)
# =============================================================================

# Auto-generate a strong random database password (24 chars, special chars)
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
}

# Auto-generate a strong JWT signing secret (64 hex chars)
resource "random_password" "jwt_secret" {
  length  = 64
  special = false # Hex only so it's safe in env vars
}

# =============================================================================
# SSH KEY PAIR (auto-generated for EC2 access)
# =============================================================================

# Generate RSA 4096-bit SSH key pair for EC2 access
resource "tls_private_key" "deploy_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register the public key with AWS
resource "aws_key_pair" "deploy_key" {
  key_name   = "${var.project_name}-${var.environment}-deploy-key"
  public_key = tls_private_key.deploy_key.public_key_openssh
}

# =============================================================================
# NETWORKING — VPC + SUBNETS + INTERNET GATEWAY
# =============================================================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-${var.environment}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-${var.environment}-igw" }
}

# Public subnet for EC2
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = { Name = "${var.project_name}-${var.environment}-public-subnet" }
}

# Private subnet for RDS (requires 2 AZs for subnet group)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "${var.project_name}-${var.environment}-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}b"
  tags              = { Name = "${var.project_name}-${var.environment}-private-b" }
}

# Route table: public subnet -> Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${var.project_name}-${var.environment}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# =============================================================================
# SECURITY GROUPS
# =============================================================================

# EC2 Security Group
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-${var.environment}-ec2-sg"
  description = "Allow HTTP, HTTPS, and SSH for CRM EC2"
  vpc_id      = aws_vpc.main.id

  # HTTP — public access for frontend
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP frontend traffic"
  }

  # HTTPS — public access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS traffic"
  }

  # SSH — ONLY from GitHub Actions IP ranges
  # GitHub publishes its IP ranges at https://api.github.com/meta
  # For simplicity we allow all here; restrict to GitHub IPs in production
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH for GitHub Actions deployment"
  }

  # NodePort range for Kubernetes services
  ingress {
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kubernetes NodePort range"
  }

  # Allow all outbound (for image pulls, package installs, RDS)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = { Name = "${var.project_name}-${var.environment}-ec2-sg" }
}

# RDS Security Group — ONLY allow traffic from EC2
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Allow PostgreSQL only from EC2 security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
    description     = "PostgreSQL from EC2 only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-rds-sg" }
}

# =============================================================================
# EC2 INSTANCE — Free Tier t2.micro
# =============================================================================

# Use the latest Amazon Linux 2023 AMI via AWS SSM parameter
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64"
}

resource "aws_instance" "crm_server" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = "t2.micro" # Free tier eligible
  subnet_id              = aws_subnet.public.id
  key_name               = aws_key_pair.deploy_key.key_name
  vpc_security_group_ids = [aws_security_group.ec2.id]

  # EC2 user data: runs on first boot, installs Docker + k3s + Helm
  user_data = base64encode(templatefile("${path.module}/scripts/ec2_bootstrap.sh", {
    project_name = var.project_name
  }))

  # Root volume — 20 GB gp3 (free tier allows up to 30 GB gp2/gp3)
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = true
    encrypted             = true
  }

  tags = { Name = "${var.project_name}-${var.environment}-server" }

  # Wait for instance to be fully ready before outputs are used
  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# AWS RDS — PostgreSQL 15 Free Tier
# =============================================================================

resource "aws_db_subnet_group" "rds" {
  name       = "${var.project_name}-${var.environment}-rds-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  tags       = { Name = "${var.project_name}-${var.environment}-rds-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-${var.environment}-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro" # Free tier eligible
  allocated_storage = 20            # Free tier: up to 20 GB
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result # Auto-generated!

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Free tier settings
  multi_az            = false
  publicly_accessible = false
  skip_final_snapshot = true # For dev/student project
  deletion_protection = false

  # Security: encrypt at rest
  storage_encrypted = true

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  # Automated backups — 7 days retention
  backup_retention_period = 7
  backup_window           = "02:00-03:00" # UTC 2-3 AM

  tags = { Name = "${var.project_name}-${var.environment}-rds" }
}
