# 🚀 Aura SaaS v4 — Complete Platform Redesign

> **Objective:** Redesign the complete Aura SaaS platform into a production-ready, industry-standard DevOps project suitable for an MCA DevOps Capstone while remaining simple, maintainable, and fully deployable within the AWS Free Tier.

---

# 🎯 Your Role

Act as a **Principal DevOps Engineer**, **Cloud Architect**, **Platform Engineer**, **Senior Full Stack Engineer**, and **Technical Mentor** guiding an MCA DevOps student.

Think like an experienced engineer designing software for a startup with limited resources.

Do **not** over-engineer.

Every architectural decision should improve:

- Simplicity
- Maintainability
- Scalability
- Security
- Deployment Speed
- Cost Optimization
- Developer Experience
- Documentation
- Production Readiness

---

# 📖 Before Doing Anything

Read and understand the existing project completely.

Mandatory document:

```
architecture_docs/system_architecture_flow.md
```

Do not skip this step.

Understand:

- Overall architecture
- Frontend
- Backend
- Authentication Flow
- Multi-tenancy
- PostgreSQL Schema
- Docker
- Terraform
- GitHub Actions
- AWS Infrastructure
- Nginx
- Existing CI/CD
- Existing Deployment Strategy

Do not redesign anything until you understand the current implementation.

---

# 🎯 Primary Objective

The goal is **NOT** to rewrite the application.

The goal is to redesign the **entire platform** around the existing application.

The application should become:

- Easier to develop
- Easier to deploy
- Easier to maintain
- Easier to test
- Easier to scale later
- Easier to document

---

# 🎓 Project Constraints

This is an **MCA DevOps Major Project**.

The project should demonstrate practical knowledge of:

- Linux
- Git
- GitHub
- GitHub Actions
- Docker
- Terraform
- AWS
- PostgreSQL
- Nginx
- Infrastructure as Code
- CI/CD
- Monitoring
- Automation
- Secure Deployment
- DevOps Best Practices

Avoid unnecessary enterprise complexity.

---

# ☁ AWS Constraints (Highest Priority)

This project **must run entirely on AWS Free Tier**.

Current budget:

- AWS Free Tier
- Approximately $20 promotional credits
- Project must remain operational until **30 July**

Design the infrastructure assuming:

- One AWS Account
- One Region
- One EC2 Instance
- One PostgreSQL RDS Instance
- GitHub Free
- GitHub Actions Free
- GitHub Container Registry

Avoid recommending expensive managed AWS services.

---

# 🚫 Do NOT Recommend

Unless absolutely required, do not use:

- Amazon EKS
- Amazon ECS
- AWS Fargate
- NAT Gateway
- AWS CodePipeline
- AWS CodeBuild
- AWS WAF
- AWS Shield Advanced
- Amazon Aurora
- Amazon ElastiCache
- Amazon OpenSearch
- Service Mesh
- Multi-AZ
- Multiple Load Balancers

If recommending any paid AWS service, explain:

- Why it is needed
- Estimated monthly cost
- Free alternative
- Whether it should be deferred as a future enhancement

---

# 🏗 Infrastructure Philosophy

Infrastructure should be created **once**.

Applications should be deployed **many times**.

Never recreate infrastructure unnecessarily.

The deployment pipeline must first verify whether infrastructure already exists.

Before provisioning:

- Check whether EC2 already exists
- Check whether RDS already exists
- Check whether VPC already exists
- Check whether Security Groups already exist
- Check whether IAM Roles already exist
- Check whether Key Pair already exists
- Check whether SSL Certificates already exist

Reuse existing infrastructure whenever possible.

Never recreate production infrastructure unless explicitly requested.

---

# 🗄 Database Strategy

Never recreate production databases.

Pipeline should:

Database Exists

YES

↓

Run Migrations

↓

Seed Missing Data

↓

Deploy

NO

↓

Create Database

↓

Initialize Schema

↓

Seed Data

↓

Deploy

Never delete production data.

---

# 🖥 EC2 Strategy

If EC2 already exists:

- Reuse it
- Pull latest Docker images
- Restart only required containers
- Perform health checks

Only create EC2 when it does not exist.

---

# 🧩 Kubernetes Evaluation

Review whether Kubernetes is actually justified.

If Kubernetes remains:

Explain why.

If Docker Compose is a better choice:

Explain why.

Do not recommend Kubernetes simply because it is popular.

Recommend the simplest production-ready solution suitable for AWS Free Tier.

---

# 📂 Repository Redesign

Design a professional repository.

Example:

```
frontend/

backend/

infra/
    terraform/
    docker/
    nginx/

.github/

docs/

scripts/

tests/

monitoring/

architecture/
```

---

# 🌿 Git Strategy

Implement a professional Git workflow.

Required branches:

```
main
develop
staging

feature/*
bugfix/*
hotfix/*
release/*
```

Document:

- Branch purpose
- Merge policy
- Pull Request rules
- Versioning strategy
- Release process
- Branch protection

---

# 🌍 Environments

Two permanent environments are required.

## Production

```
https://aurasaas.duckdns.org
```

Branch:

```
main
```

---

## Staging

```
https://staging.aurasaas.duckdns.org
```

Branch:

```
staging
```

Both environments should:

- Run on the same EC2
- Share the same RDS
- Use isolated databases or schemas
- Be completely isolated from each other
- Never interfere with one another

---

# 🚀 Deployment Workflow

Developer

↓

feature/*

↓

Pull Request

↓

Lint

↓

Unit Tests

↓

Security Scan

↓

Docker Build

↓

Push GHCR

↓

Deploy Development (optional)

↓

Merge to develop

↓

Integration Tests

↓

Create Release Branch

↓

Merge to staging

↓

Deploy

<https://staging.aurasaas.duckdns.org>

↓

Smoke Tests

↓

Manual Approval

↓

Merge to main

↓

Deploy

<https://aurasaas.duckdns.org>

↓

Health Checks

↓

Create Git Tag

↓

Generate Release Notes

---

# 🧪 Testing

Implement:

- Linting
- Unit Tests
- API Tests
- Integration Tests
- Frontend Tests
- Build Validation
- Docker Validation
- Security Scan
- Dependency Scan
- Smoke Tests
- Health Checks
- Database Migration Tests
- Rollback Tests

---

# 🐳 Docker

Optimize:

- Dockerfiles
- Multi-stage builds
- Layer caching
- Startup time
- Image size
- Security
- Build speed

---

# 🔐 Security

Review:

- JWT
- HTTPS
- RBAC
- Input Validation
- SQL Injection
- XSS
- CSRF
- Rate Limiting
- Secrets Management
- IAM
- Security Groups
- Least Privilege

---

# 📈 Monitoring

Implement lightweight monitoring.

Use:

- Application Logs
- Docker Logs
- Nginx Logs
- CloudWatch Basic Metrics
- Health Endpoints
- GitHub Actions Reports

Avoid expensive monitoring tools.

---

# 📚 Documentation

Generate:

- README
- Architecture Guide
- Deployment Guide
- Infrastructure Guide
- CI/CD Guide
- Developer Guide
- API Documentation
- Runbooks
- Incident Response Guide
- Troubleshooting Guide

---

# 💰 Cost Optimization

Every recommendation must include:

- Technical Benefit
- Estimated Monthly Cost
- Free Tier Compatibility
- CPU Usage
- Memory Usage
- Storage Usage
- Network Usage
- AWS Cost Impact

Prefer solutions that keep recurring costs near zero.

---

# 📋 Deliverables

Produce:

- New System Architecture
- Infrastructure Diagram
- Repository Structure
- Git Workflow
- Branching Strategy
- CI/CD Pipeline
- Deployment Workflow
- Rollback Strategy
- Monitoring Strategy
- Security Architecture
- Testing Strategy
- Folder Structure
- Terraform Structure
- Docker Strategy
- Documentation Structure
- Migration Plan
- Cost Breakdown
- Risk Assessment

All architecture diagrams must be in **Mermaid** format.

---

# 🛠 Implementation Plan

Break the redesign into phases.

Example:

Phase 1

Repository Cleanup

Phase 2

Infrastructure Review

Phase 3

Docker Optimization

Phase 4

CI/CD Redesign

Phase 5

Environment Setup

Phase 6

Monitoring

Phase 7

Security

Phase 8

Documentation

Phase 9

Production Validation

Each phase must include:

- Objective
- Tasks
- Files Modified
- Dependencies
- Validation Steps
- Expected Outcome
- Estimated Time

---

# 📌 Final Rules

- Read the current architecture before proposing changes.
- Challenge existing architectural decisions rather than preserving them blindly.
- Reuse infrastructure whenever possible.
- Never recreate EC2 or RDS unless explicitly required.
- Never recreate production databases.
- Separate infrastructure provisioning from application deployment.
- Prioritize AWS Free Tier compatibility.
- Keep the solution achievable for an MCA DevOps Capstone.
- Optimize for simplicity, maintainability, deployment speed, and production readiness.
- Explain every architectural decision with its technical justification and trade-offs.
- **Do not generate or modify code until the redesigned architecture is reviewed and approved.**
