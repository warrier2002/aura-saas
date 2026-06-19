# High-Level Design (HLD)

## High Level Diagram

```mermaid
graph TD
    User["👤 End User (Tenant)"] --> |HTTPS| Ingress["🚦 Ingress Controller"]
    Ingress --> |UI Route| FE["⚛️ React Frontend (Pod)"]
    Ingress --> |API Route| API["🟢 Express Backend (Pod)"]
    FE --> |REST API| API
    
    subgraph K3s Cluster
        Ingress
        FE
        API
    end

    API --> |SQL + Tenant ID| DB["🗄️ PostgreSQL RDS"]
    API -.-> |Auth Check| Auth["🔐 JWT Middleware"]
    
    subgraph AWS VPC
        K3s Cluster
        DB
    end
```

# Aura SaaS Platform — Multi-Tenant CRM Platform

**Document Type:** High-Level Design  
**Project:** Multi-Tenant SaaS CRM with EKS, HPA, and CI/CD Pipeline  
**Author:** Harshit Sharma  
**Version:** 2.0  
**Date:** June 2026

---

## Table of Contents

1. [Introduction & Purpose](#1-introduction--purpose)
2. [System Overview](#2-system-overview)
3. [Architecture Goals & Principles](#3-architecture-goals--principles)
4. [High-Level Component Diagram](#4-high-level-component-diagram)
5. [Technology Stack](#5-technology-stack)
6. [Multi-Tenancy Design](#6-multi-tenancy-design)
7. [Infrastructure Design (AWS)](#7-infrastructure-design-aws)
8. [CI/CD Pipeline Design](#8-cicd-pipeline-design)
9. [Kubernetes & Helm Design](#9-kubernetes--helm-design)
10. [Security Design](#10-security-design)
11. [Scalability & Performance](#11-scalability--performance)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Risks & Mitigation](#13-risks--mitigation)

---

## 1. Introduction & Purpose

This document describes the High-Level Design of **Aura SaaS Platform**, a multi-tenant Customer Relationship Management (CRM) platform built as an Open Source SaaS Project. The purpose of this HLD is to:

- Give a bird's-eye view of the overall system architecture
- Define the major components and how they communicate
- Establish the technology choices and reasoning behind them
- Serve as a reference for the Low-Level Design (LLD)

The system is designed to handle multiple business tenants (companies/organisations) on a single deployed instance, while ensuring **complete data isolation** between tenants at all times.

---

## 2. System Overview

Aura SaaS Platform is a **cloud-native, containerised, multi-tenant CRM**. The system allows:

1. Different companies (tenants) to sign up and log in
2. Each tenant to manage their own customers, contacts, and data
3. The platform to auto-scale based on load
4. A fully automated deployment pipeline from code commit to production

### Key Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Availability** | 99.5% uptime (best-effort on free tier) |
| **Scalability** | Auto-scale pods from 2 → 10 on CPU >70% |
| **Security** | Zero-trust JWT auth, bcrypt passwords, no plaintext secrets |
| **Automation** | Zero-touch deployments on push to `main` |
| **Isolation** | Strict per-tenant schema isolation in PostgreSQL |
| **Recoverability** | Stateless pods → easy restart; RDS handles DB persistence |

---

## 3. Architecture Goals & Principles

The architecture follows these core software engineering principles:

| Principle | How We Apply It |
|---|---|
| **Separation of Concerns** | Frontend (Nginx), Backend (Express/Node.js), DB (RDS) are fully separate layers |
| **Loose Coupling** | Services communicate only via REST API + JWT; no shared state between pods |
| **High Cohesion** | Each component does one thing well (frontend serves UI, backend handles business logic) |
| **DRY (Don't Repeat Yourself)** | Helm charts parameterise all deployment configs; no hardcoded values |
| **Security by Default** | Every API endpoint requires a valid JWT; tenant ID is never user-provided |
| **Infrastructure as Code (IaC)** | All cloud resources defined in Terraform; K8s resources in Helm charts |
| **GitOps** | GitHub is the single source of truth; all changes go through CI/CD |

---

## 4. High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER MACHINE                             │
│   VS Code → git push origin main                                     │
└─────────────────────────┬────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     GITHUB (Public Repository)                       │
│                                                                      │
│  ┌─────────────┐   ┌──────────────────────────────────────────────┐  │
│  │ Source Code │   │         GitHub Actions Workflows              │  │
│  │  Frontend   │   │                                              │  │
│  │  Backend    │   │  ci.yml      → Lint, Test, Security Checks   │  │
│  │  K8s/Helm   │   │  deploy.yml  → Build, Push, Deploy           │  │
│  │  Terraform  │   │  monitor.yml → Health & Vuln Monitoring      │  │
│  └─────────────┘   └──────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
   ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
   │      GHCR       │  │   AWS EC2         │  │    AWS RDS      │
   │ Container Reg.  │  │  (Free Tier)      │  │  PostgreSQL     │
   │                 │  │                  │  │                 │
   │ crm-backend:    │  │ ┌──────────────┐ │  │ crm_db          │
   │  latest/:sha    │  │ │ Kubernetes   │ │  │  ├ tenant_a.*   │
   │                 │  │ │  (k3s)       │ │  │  └ tenant_b.*   │
   │ crm-frontend:   │  │ │  Helm Chart  │ │  │                 │
   │  latest/:sha    │  │ │  HPA, RBAC   │ │  │ Security Groups │
   └─────────────────┘  │ └──────────────┘ │  │ port 5432 only  │
                        └──────────────────┘  │ from EC2        │
                                              └─────────────────┘

                          ┌──────────────────┐
                          │  END USER BROWSER│
                          │  HTTPS Request   │
                          │  → Ingress (EC2) │
                          │  → Frontend Pod  │
                          │  → Backend Pod   │
                          └──────────────────┘
```

---

## 5. Technology Stack

### Frontend
| Component | Technology | Reason |
|---|---|---|
| UI Framework | Vanilla HTML + CSS + JavaScript | Simple, no build dependency complexity for a student project |
| Design | Glassmorphism, CSS animations | Modern, premium look |
| Auth | JWT via `sessionStorage` | Secure — clears on tab close |
| Build Tool | Vite (npm run build) | Fast, modern bundler |
| Serving | Nginx (Alpine Docker image) | Lightweight, production-grade static file server |

### Backend
| Component | Technology | Reason |
|---|---|---|
| Runtime | Node.js 20 (LTS) | Async I/O, good for API servers |
| Framework | Express.js | Minimal, flexible, industry standard |
| Auth | JWT HS256 (`jsonwebtoken`) | Stateless, scalable |
| Password Hashing | `bcryptjs` | Industry-standard, salted hashing |
| Database Client | `pg` (node-postgres) | Direct PostgreSQL client |
| Alternative Server | Python Flask | For demo/academic purposes |

### Database
| Component | Technology | Reason |
|---|---|---|
| Engine | PostgreSQL 15 | ACID, schemas for tenant isolation |
| Hosting | AWS RDS (Free Tier) | Managed, automated backups |
| Tenant Strategy | Schema-per-tenant | Strong isolation, single RDS instance |

### Infrastructure & DevOps
| Component | Technology | Reason |
|---|---|---|
| Compute | AWS EC2 t2.micro | Free tier eligible |
| Container Runtime | Docker | Industry standard |
| Container Orchestration | Kubernetes (k3s) | Lightweight K8s for single node |
| Package Manager (K8s) | Helm v3 | Templated K8s manifests, easy upgrades |
| IaC | Terraform | Declarative, reproducible infrastructure |
| CI/CD | GitHub Actions | Free for public repos, integrated |
| Container Registry | GHCR (GitHub) | Free, integrates with GitHub Actions |
| Monitoring | GitHub Actions cron + health endpoints | Simple, zero-cost |

---

## 6. Multi-Tenancy Design

### Strategy: Schema-Per-Tenant (Option 2 — Hybrid)

We chose **PostgreSQL schemas** for tenant isolation:

```
crm_db (single RDS database)
├── public          (shared infra tables if needed)
├── tenant_a        (Tenant A's private schema)
│   ├── users
│   ├── customers
│   └── contacts
└── tenant_b        (Tenant B's private schema)
    ├── users
    ├── customers
    └── contacts
```

**Why schemas over separate databases?**
- Free tier RDS allows only 1 database instance → schemas let us serve multiple tenants
- PostgreSQL `SET search_path TO tenant_x` gives strict isolation per connection
- Easier to manage than fully separate DB instances for a student project
- Still strong isolation — no cross-schema queries possible with correct permissions

### Tenant Identification Flow

```
1. User logs in → provides email + password + tenant ID
2. Backend queries the correct schema: tenant_{id}.users
3. Password verified with bcrypt
4. JWT signed with: { sub: email, tenant_id: "a", exp: +8h }
5. JWT stored in browser sessionStorage
6. EVERY subsequent API call:
   - Backend decodes JWT with JWT_SECRET
   - Extracts tenant_id from payload (NEVER from header or body)
   - Sets PostgreSQL search_path to tenant_{id}
   - Executes query — guaranteed scoped to correct tenant
```

> **Critical Security Note:** Tenant ID comes ONLY from the cryptographically signed JWT payload. A user cannot switch tenants by changing a request header or body parameter.

---

## 7. Infrastructure Design (AWS)

### EC2 Instance (Free Tier)
- **Type:** t2.micro (1 vCPU, 1 GB RAM)
- **OS:** Ubuntu Server 22.04 LTS
- **Software:** Docker, k3s (lightweight Kubernetes), Helm 3
- **Security Group Rules:**
  - Inbound: Port 22 (SSH — from GitHub Actions IP only), Port 80 (HTTP), Port 443 (HTTPS)
  - Outbound: All (for image pulls, RDS connections)

### AWS RDS (Free Tier)
- **Engine:** PostgreSQL 15.x
- **Instance:** db.t3.micro (2 vCPU, 1 GB RAM)
- **Storage:** 20 GB gp2 SSD
- **Multi-AZ:** Disabled (free tier)
- **Public Access:** Disabled (VPC private subnet only)
- **Security Group:** Inbound port 5432 from EC2 Security Group only
- **Automated Backups:** Enabled (7-day retention)

### Network Design

```
Internet
    │
    ├── Port 80/443 → EC2 (Ingress Controller) → K8s Pods
    │
    └── Port 22 (SSH) → EC2 (GitHub Actions CI/CD only)
                              │
                              └── Port 5432 (private VPC) → RDS
```

---

## 8. CI/CD Pipeline Design

```
TRIGGER: Push to main branch
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  JOB 0 (ci.yml): CI — Lint & Security Tests         │
│  ├── Python: flake8 lint, JWT tests, bcrypt tests   │
│  ├── Node.js: npm audit, JWT/bcrypt integration     │
│  └── Frontend: HTML security feature checks         │
└─────────────────────────┬───────────────────────────┘
                          │ All pass ✅
                          ▼
┌─────────────────────────────────────────────────────┐
│  JOB 1: PROVISION — Terraform Apply                 │
│  Uses: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY    │
│  ├── Bootstrap S3 bucket for Terraform state        │
│  ├── terraform init + plan + apply                  │
│  ├── Creates EC2 t2.micro + RDS db.t3.micro         │
│  ├── Auto-generates: SSH key, DB password, JWT sec  │
│  ├── Reads: terraform output -raw ec2_public_ip     │
│  ├── Reads: terraform output -raw rds_endpoint      │
│  └── Exposes all as job outputs for next jobs       │
└─────────────────────────┬───────────────────────────┘
                          │ (parallel)
              ┌───────────┴───────────┐
              ▼                       ▼
┌─────────────────────┐  ┌───────────────────────────┐
│  JOB 2: BUILD       │  │  JOB 3: DB INIT           │
│  Docker build+push  │  │  SSH tunnel to RDS via EC2│
│  crm-backend:sha    │  │  Run db_init.sql           │
│  crm-frontend:sha   │  │  Create schemas + tables   │
│  Push to GHCR       │  │  Insert seed admin users   │
└─────────┬───────────┘  └───────────┬───────────────┘
          └──────────────┬───────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  JOB 4: DEPLOY — Helm on EC2                        │
│  ├── SSH into EC2 (key from terraform output)       │
│  ├── helm upgrade --install aura-saas ./helm/...     │
│     --set db.host=<from terraform output>           │
│     --set db.password=<from terraform output>       │
│     --set jwtSecret=<from terraform output>         │
│     --set backend.image.tag=<git-sha>               │
│  ├── Kubernetes rolling update (zero downtime)      │
│  └── Smoke test: curl /health + auth 401 check      │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  JOB 5 (monitor.yml CRON): Every 30 minutes         │
│  ├── pip-audit (Python dep vulnerabilities)         │
│  ├── npm audit (Node.js dep vulnerabilities)        │
│  ├── Bandit SAST (Python static analysis)           │
│  ├── Live HTTP health check on deployed URL         │
│  └── Auth enforcement check (401 on no token)      │
└─────────────────────────────────────────────────────┘
```

### Secrets Management in CI/CD

> **Design Goal:** Developer adds only AWS credentials. The pipeline auto-creates and auto-fetches everything else.

#### What the Developer Adds to GitHub (3 secrets only)

| GitHub Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `GITHUB_TOKEN` | Auto-provided by GitHub — used to push/pull GHCR images |

#### What the Pipeline Auto-Generates (Zero Manual Work)

| Value | Source | How It Flows |
|---|---|---|
| EC2 Public IP | `terraform output ec2_public_ip` | `provision` job output → `deploy` job |
| SSH Private Key | `terraform output ssh_private_key` | `provision` job env → masked in logs |
| RDS Endpoint | `terraform output rds_endpoint` | `provision` job output → Helm `--set` |
| DB Password | `terraform output db_password` | `random_password` resource → masked |
| DB Username | `terraform output db_username` | `provision` job output → Helm `--set` |
| JWT Secret | `terraform output jwt_secret` | `random_password` resource → masked |

#### Sensitive Value Masking
All sensitive Terraform outputs are immediately masked using `echo "::add-mask::$VALUE"` before being used anywhere. They will appear as `***` in all GitHub Actions logs.

---

## 9. Kubernetes & Helm Design

### Why k3s on EC2?
K3s is a lightweight, certified Kubernetes distribution that runs on a single t2.micro node with ~512 MB RAM footprint. Perfect for a free-tier student project that still demonstrates real Kubernetes concepts.

### Helm Chart Structure

```
helm/
└── aura-saas/
    ├── Chart.yaml           # Chart metadata
    ├── values.yaml          # Default config values
    ├── values.prod.yaml     # Production overrides (injected by CI/CD)
    └── templates/
        ├── namespace.yaml
        ├── backend-deployment.yaml
        ├── backend-service.yaml
        ├── backend-hpa.yaml
        ├── frontend-deployment.yaml
        ├── frontend-service.yaml
        ├── frontend-hpa.yaml
        ├── ingress.yaml
        ├── secret.yaml      # DB creds + JWT (from Helm --set)
        └── rbac.yaml
```

### Key Kubernetes Features Used

| Feature | Purpose |
|---|---|
| **Deployments** | Manage pod lifecycle, rolling updates |
| **Services** | Stable DNS/IP for pod-to-pod communication |
| **Ingress** | Route external traffic to frontend / backend |
| **HPA** | Auto-scale pods 2→10 when CPU >70% |
| **Namespaces** | Logical isolation between frontend and backend |
| **Secrets** | Store DB credentials and JWT secret securely |
| **ConfigMaps** | Store non-sensitive configuration |
| **RBAC** | Restrict what each service account can do |

---

## 10. Security Design

### Defense in Depth (Multiple Layers)

```
Layer 1: Network   → AWS Security Groups (restrict ports)
Layer 2: Transport → HTTPS/TLS via Ingress
Layer 3: Auth      → JWT HS256 on every API endpoint
Layer 4: Data      → bcrypt password hashing
Layer 5: Isolation → PostgreSQL schema-per-tenant
Layer 6: Input     → Regex validation, type checks
Layer 7: Output    → escapeHtml() XSS prevention
Layer 8: CORS      → Explicit origin allowlist
Layer 9: Payload   → 10 KB body limit (DoS mitigation)
Layer 10: Secrets  → GitHub Secrets + K8s Secrets (never in code)
```

### OWASP Top 10 Mitigations

| OWASP Risk | Mitigation in This Project |
|---|---|
| A01: Broken Access Control | Tenant ID from JWT only, JWT required on all data routes |
| A02: Cryptographic Failures | bcrypt/scrypt for passwords, HS256 JWT with strong secret |
| A03: Injection | Parameterised SQL queries via `pg` library |
| A05: Security Misconfiguration | Automated security scanning (Bandit, npm audit) in CI |
| A06: Vulnerable Components | pip-audit + npm audit run every 30 minutes |
| A07: Auth Failures | JWT expiry (8h), tamper detection, expired token rejection |
| A09: Logging | GitHub Actions logs all deployments and health checks |

---

## 11. Scalability & Performance

### Horizontal Scaling (HPA)

Both frontend and backend deployments have Horizontal Pod Autoscalers configured:
- **Min replicas:** 2 (always-on high availability)
- **Max replicas:** 10
- **Scale-up trigger:** CPU utilization > 70%
- **Scale-down:** Gradual, with cooldown period

### Limitations (Free Tier Constraints)

| Constraint | Impact |
|---|---|
| EC2 t2.micro: 1 vCPU, 1 GB RAM | Limited to ~4-5 pods total before OOM |
| RDS db.t3.micro: 20 GB storage | Sufficient for demo; would need upgrade in production |
| Single EC2 node | No true HA; node failure = downtime |

> **Note:** These constraints are acceptable for an MCA academic project demonstrating the concepts. A production system would use EKS (managed K8s) with multiple nodes across availability zones.

---

## 12. Monitoring & Observability

| What | How | Frequency |
|---|---|---|
| Dependency vulnerabilities | pip-audit + npm audit | Every 30 min (GitHub Actions cron) |
| SAST security scan | Bandit (Python) | Every 30 min |
| App health | HTTP GET /health endpoint | Every 30 min |
| Auth enforcement | HTTP GET /api/customers (no token → must get 401) | Every 30 min |
| Deployment status | GitHub Actions logs | On every deploy |
| Error tracking | stderr logs in Docker containers | Real-time (kubectl logs) |

---

## 13. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| EC2 instance runs out of memory (OOM) | Medium | High | Set pod resource limits; HPA max=10 but EC2 limits actual scaling |
| RDS free tier runs out of storage | Low | High | Automated cleanup; alerts via CloudWatch |
| JWT_SECRET exposed | Low | Critical | Stored only in GitHub Secrets + K8s Secrets; rotatable |
| GHCR image pull rate limiting | Low | Medium | Cache layers with `type=gha` in Docker buildx |
| SSH key compromise | Very Low | Critical | Restrict EC2 SG to GitHub Actions IP ranges only |
| Cross-tenant data leak | Very Low | Critical | Schema isolation + JWT extraction — tested in CI |

---

*End of HLD Document*



## GitOps & Branching Strategy

To maintain high code quality and isolated testing environments, this project uses a GitFlow-inspired branching strategy mapped to GitHub Actions CI/CD pipelines:

1. **Development (`dev` branch)**
   - All ephemeral branches (`feature/*`, `bugfix/*`) are merged here.
   - Deploys automatically to the **Dev Environment** (using `dev.tfvars` and `values.dev.yaml`).
2. **Staging (`staging` branch)**
   - Used for pre-production testing and QA.
   - Deploys automatically to the **Staging Environment** (using `staging.tfvars` and `values.staging.yaml`).
3. **Production (`main` branch)**
   - The highly stable production release.
   - Deploys automatically to the **Production Environment** (using `prod.tfvars` and `values.prod.yaml`).

Each environment has isolated Terraform state files, separate Kubernetes namespaces (`crm-dev`, `crm-staging`, `crm-prod`), and environment-specific Horizontal Pod Autoscaler (HPA) configurations to balance performance with AWS Free Tier constraints.
