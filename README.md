# Aura SaaS Platform — Multi-Tenant Cloud Native Architecture

**Aura SaaS Platform** is a production-grade, multi-tenant Customer Relationship Management (CRM) platform that demonstrates real-world cloud-native engineering at every layer of the stack — from secure API design and containerisation, to Kubernetes orchestration, disaster recovery, and fully automated CI/CD pipelines.

the system implements **Schema-Based Tenant Isolation** within a single PostgreSQL instance, enforced strictly on the server-side via `SET search_path` during database queries. Tenant identities are cryptographically bound to JSON Web Tokens, preventing any cross-tenant data leaks.

**Key Architecture Pillars:**
- 🔐 **Security-First Backend** — Express.js API, bcrypt password hashing, JWT HS256 auth, Helmet HTTP security headers, parameterized SQL queries, and strict CORS.
- ☸️ **Kubernetes & Autoscaling** — Helm-managed deployments, Kubernetes Services, Ingress Controllers, and Horizontal Pod Autoscalers (HPA) that dynamically scale backend replicas from 2 to 10 pods when CPU exceeds 70%.
- 🚀 **CI/CD Automation** — GitHub Actions for linting, testing, Docker builds (Alpine-optimised), and deployments. A fully functional `Jenkinsfile` is also included for multi-cloud pipeline portability.
- 🌍 **Multi-Cloud Readiness & DR** — Terraform IaC guarantees zero-downtime portability to AWS, Azure, or GCP, backed by a structured Chaos Engineering and Disaster Recovery (DR) playbook.
- 🌐 **Interactive Glassmorphism UI** — A modern, highly interactive, visually striking frontend dashboard for managing multi-tenant customer records.

[![CI — Lint & Test](https://github.com/warrier2002/aura-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/warrier2002/aura-saas/actions/workflows/ci.yml)
[![Deploy — Build & Ship](https://github.com/warrier2002/aura-saas/actions/workflows/deploy.yml/badge.svg)](https://github.com/warrier2002/aura-saas/actions/workflows/deploy.yml)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 CI/CD (GitHub Actions / Jenkins)            │
│  Linting/Testing ──► Docker Build ──► Terraform ──► Helm    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Kubernetes Cluster (k3s/EKS)                │
│                                                             │
│  ┌───────────────┐     ┌─────────────────────────────────┐  │
│  │ Nginx Ingress ├───► │ Aura Frontend (Glassmorphism) │  │
│  │ (LoadBalancer)│     │ HPA Auto-Scaling (2-10 pods)  │  │
│  └──────┬────────┘     └─────────────────────────────────┘  │
│         │                                                   │
│         │              ┌─────────────────────────────────┐  │
│         └────────────► │ Aura Backend (Node.js)          │  │
│                        │ HPA Auto-Scaling (2-10 pods)  │  │
│                        └────────┬────────────────────────┘  │
│                                 │                           │
│                                 ▼                           │
│                 ┌────────────────────────────────┐          │
│                 │ PostgreSQL Database            │          │
│                 │ ├─ Schema: tenant_a          │          │
│                 │ ├─ Schema: tenant_b          │          │
│                 └────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| Tenant isolation | Database schema isolation (`SET search_path TO <tenant_id>`) |
| Authentication | JWT HS256 — 8h expiry, roles encoded in token |
| Password storage | `bcrypt` hashing (Cost factor 10) |
| Input validation | Strict server-side type checking and format validation |
| SQL Injection Guard | 100% parameterized queries via `pg` driver |
| HTTP Security | `Helmet` integration and explicit CORS allowlist |
| Session storage | `sessionStorage` (clears on tab close, not `localStorage`) |
| XSS prevention | `escapeHTML()` sanitisation on frontend UI renders |

## 📁 Project Structure

```
aura-saas/
├── .github/workflows/      # Automated CI/CD (Testing, Deploy, Monitoring)
├── docker/                 # Multi-stage Alpine Dockerfiles (Free-Tier optimized)
├── helm/aura-saas/         # Kubernetes Helm charts (Deployments, HPA, Ingress)
├── server/                 # Express.js secure backend API
├── terraform/              # Infrastructure-as-Code (AWS EC2, RDS, Networking)
├── scripts/                # Database initialization and setup utilities
├── index.html              # Glassmorphism frontend UI
├── Jenkinsfile             # Jenkins CI/CD pipeline migration proof-of-concept
├── DR_AND_MIGRATION.md     # Multi-Cloud, Disaster Recovery, and Chaos Engineering plan
└── README.md
```

## 🎓 Academic Details

- **Project:** Multi-Tenant SaaS Platform with IaC, Autoscaling, and Kubernetes.


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
