# NTPL Cloud SaaS — Multi-Tenant CRM

> **MCA Major Project | 23ONMCR-753 | Chandigarh University**

**NTPL Cloud SaaS** is a production-grade, multi-tenant Customer Relationship Management (CRM) platform that demonstrates real-world cloud-native engineering at every layer of the stack — from secure API design and containerisation, to Kubernetes orchestration and fully automated CI/CD pipelines.

Built as an MCA Major Project at Chandigarh University, the system implements **database-per-tenant isolation** (Multi-Tenancy Option 1), where each customer organisation operates in a completely separate data context — enforced server-side via cryptographically signed JSON Web Tokens, never by a spoofable HTTP header.

**What makes it different:**
- 🔐 **Security-first backend** — passwords stored as scrypt/bcrypt hashes, JWT HS256 auth on every data endpoint, regex input validation, CORS allowlisting, and 10 KB payload limits
- ☸️ **Kubernetes-native** — namespace-level tenant boundaries, Role-Based Access Control (RBAC), and Horizontal Pod Autoscaler (HPA) that dynamically scales replicas when CPU exceeds 70%
- 🚀 **Full CI/CD pipeline** — GitHub Actions handles linting, security testing, Docker image builds (pushed to GHCR), SSH deployment, and scheduled vulnerability monitoring every 30 minutes
- 🌐 **Interactive control panel** — a glassmorphism SaaS dashboard that visualises live HPA pod scaling, tenant switching, and real-time database operations

[![CI — Lint & Test](https://github.com/YOUR_USERNAME/ntpl-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/ntpl-crm/actions/workflows/ci.yml)
[![Deploy — Build & Ship](https://github.com/YOUR_USERNAME/ntpl-crm/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/ntpl-crm/actions/workflows/deploy.yml)
[![Monitor — Health & Security](https://github.com/YOUR_USERNAME/ntpl-crm/actions/workflows/monitor.yml/badge.svg)](https://github.com/YOUR_USERNAME/ntpl-crm/actions/workflows/monitor.yml)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Actions                          │
│  CI (lint/test) ──► Deploy (Docker → GHCR → SSH) ──► Monitor│
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────┐     ┌──────────────────────────────────┐
│  Frontend (index.html)│────►│  Flask Mock Server (port 5000)  │
│  JWT Auth Overlay     │     │  or Express Backend (port 3001) │
│  sessionStorage token │     │  JWT middleware (HS256)         │
└──────────────────────┘     │  bcrypt/scrypt password hashing  │
                              └──────────────────────────────────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    ▼                     ▼                      ▼
            Tenant A DB            Tenant B DB          (future tenants)
         crm_db_tenant_a        crm_db_tenant_b
```

## Security Features

| Feature | Implementation |
|---|---|
| Password storage | `scrypt` (Flask) / `bcrypt` (Node.js) — never plaintext |
| Authentication | JWT HS256 — 8h expiry, signed tokens |
| Tenant isolation | Tenant ID extracted from **JWT payload** (not spoofable header) |
| Input validation | Regex on names, type checks on numbers, email format validation |
| XSS prevention | `escapeHtml()` on all server data rendered in DOM |
| CORS | Restricted to explicit allowlist in Express |
| Payload limits | 10 KB body size limit on Express |
| Session storage | `sessionStorage` (clears on tab close, not `localStorage`) |

## Project Structure

```
ntpl-crm/
├── .github/
│   └── workflows/
│       ├── ci.yml          # Lint, test, security checks (runs on every push)
│       ├── deploy.yml      # Docker build → GHCR → SSH deploy (main branch)
│       └── monitor.yml     # Scheduled health & vulnerability monitoring
├── docker/
│   ├── Dockerfile.backend  # Node.js Express image
│   └── Dockerfile.frontend # Static frontend image (nginx)
├── k8s/                    # Kubernetes manifests
├── terraform/              # IaC for cloud provisioning
├── scripts/                # Helper scripts
├── server/
│   └── index.js            # Express backend (JWT secured, bcrypt)
├── assignment.py           # Flask demo backend (JWT secured, scrypt)
├── index.html              # Frontend SaaS console
├── requirements.txt        # Python dependencies
└── README.md
```

## Quick Start (Local)

### Flask Demo Server
```bash
pip install -r requirements.txt
python3 assignment.py
# → http://localhost:5000
```

### Node.js Express Backend
```bash
cd server
npm install
node index.js
# → http://localhost:3001
```

## GitHub Actions Setup

### Required Repository Secrets
Go to **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Description |
|---|---|
| `DEPLOY_SSH_KEY` | Private SSH key for your deploy server |
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH username (e.g., `ubuntu`) |
| `JWT_SECRET` | Strong random secret — generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DB_HOST` | PostgreSQL host |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |

### Required Repository Variables
Go to **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description |
|---|---|
| `APP_URL` | Public URL of your deployed frontend |
| `BACKEND_URL` | Public URL of your deployed backend |

### Workflow Overview

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | Every push & PR | Python lint, Node.js test, JWT/bcrypt verification, frontend checks |
| `deploy.yml` | Push to `main` | Build Docker images → push to GHCR → SSH deploy → smoke test |
| `monitor.yml` | Every 30 min | Dependency audit (pip-audit + npm audit), Bandit SAST, live health check, auth enforcement check |

## Academic Details

- **Course:** MCA — Cloud Computing & DevOps  
- **Registration:** 23ONMCR-753  
- **Institution:** Chandigarh University  
- **Project:** Multi-Tenant SaaS CRM with EKS, HPA, and CI/CD Pipeline
# Multi_tenant_SAAS_application
