# 🚀 Aura SaaS Platform (v4.0)

> **Secure, Multi-Tenant CRM Platform with Kubernetes (k3s), Helm, HPA, and GitOps CI/CD on AWS.**

Aura SaaS is a production-ready, multi-tenant Customer Relationship Management (CRM) platform designed to showcase modern DevOps best practices, automated provisioning, container orchestration, and continuous delivery.

---

## 🗺️ System Architecture

```mermaid
graph TD
    User["👤 Tenant User"] --> |HTTPS| Ingress["🚦 Nginx Ingress Controller"]
    Ingress --> |Route: /| FE["⚛️ Frontend Pods (React)"]
    Ingress --> |Route: /api/*| BE["🟢 Backend Pods (Node/Express)"]
    
    subgraph K3s Cluster (EC2 t3.small)
        Ingress
        FE
        BE
    end

    BE --> |Schema Isolation| DB["🗄️ PostgreSQL (AWS RDS)"]
    BE -.-> |JWT Auth Validation| Auth["🔐 JWT Verification Middleware"]
```

---

## 📂 Repository Layout

The workspace has been organized into modular peer directories to enforce clean Separation of Concerns:

```
aura-saas/
├── backend/                # Express.js backend API server & Dockerfile
│   ├── index.js            # Express routes and logic
│   └── Dockerfile          # Production runner
│
├── frontend/               # Client-side SPA, Nginx configuration & Dockerfile
│   ├── css/style.css       # Layout stylesheets
│   ├── js/app.js           # Client-side scripting
│   └── Dockerfile          # Multi-stage container builder using Vite
│
├── helm/
│   └── aura-saas/          # Helm chart files for Kubernetes deployment
│       ├── values.yaml     # Global value specifications
│       └── templates/      # Deployments, Services, Ingress, HPA, & RBAC
│
├── infra/
│   └── terraform/          # IaC configurations (AWS VPC, EC2, RDS)
│       └── scripts/
│           └── ec2_bootstrap.sh  # EC2 bootstrap script (installs Docker, k3s, Helm)
│
├── tests/                  # Automation testing suite
│   └── backend/
│       └── helpers.test.js # Backend helper unit tests (Node.js test runner)
│
├── legacy/                 # Reference Blueprints for Capstone
│   ├── assignment.py       # Legacy mock python-flask reference
│   └── Jenkinsfile         # Jenkins multicloud pipeline blueprint
│
├── vite.config.js          # Root Vite bundler config
└── package.json            # Main workspace package entry
```

---

## 🛡️ Key Architectural Principles

1. **Kubernetes Orchestration**: Deployed to a lightweight `k3s` cluster running on a single AWS EC2 `t3.small` instance. Includes ingress-nginx for path-based prefix routing (`/dev/`, `/staging/`, `/`).
2. **Schema-per-Tenant Isolation**: Implemented multi-tenancy at the database layer. JWT authentication extracts the tenant identifier (`tenant_a`, `tenant_b`) from the signed payload and dynamically modifies the database search path (`SET search_path TO tenant_x`) for isolation.
3. **Horizontal Pod Autoscaling (HPA)**: Deployed pods auto-scale on CPU utilization thresholds exceeding 70%.
4. **GitFlow CI/CD with Auto-Rollback**:
   - Workflows validate and run Node unit tests in the PR stage.
   - Merging changes triggers environment-specific deployments.
   - Post-deployment checks run a one-time validation ping against the target environment. If it fails, `helm rollback` is triggered automatically to ensure high availability.

---

## 🛠️ Getting Started

### 1. Local Development
Vite handles local development and acts as a proxy for backend requests.

```bash
# Install backend dependencies
cd backend && npm install

# Install root developer dependencies
cd .. && npm install

# Run backend API server (port 3001)
npm start --prefix backend

# Run Vite dev server (port 3000)
npm run dev
```

### 2. Running Automated Tests
We use Node's native lightweight test runner for fast, dependency-free execution:

```bash
# Run backend test suite
npm test
```

### 3. Deploying Infrastructure (IaC)
Infrastructure is managed separately from application deployment. Set your AWS credentials in GitHub Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`), then run the Terraform manual workflow or provision locally:

```bash
cd infra/terraform
terraform init
terraform apply -auto-approve
```

---

## 👥 Educational Blueprints (`legacy/`)

- **`Jenkinsfile`**: Contains a declarative pipeline showcasing how the CI/CD workflow can be migrated to Jenkins or multi-cloud environments.
- **`assignment.py`**: A Python Flask implementation of multi-tenant API routing, kept as a mock baseline/reference for Python-based capstone requirements.
