# Architecture Audit & Implementation Review: Aura SaaS Platform

**To:** Project Stakeholders / CU MCA Major Project Evaluators  
**From:** Lead DevOps Engineer / Director of Technology  
**Date:** June 2026  
**Document Ref:** Aura-SaaS-Architecture-Audit-v1.0  

---

## 1. Executive Summary

As the Director of Technology, I have completed a comprehensive audit comparing the **High-Level Design (HLD)**, **Low-Level Design (LLD)**, and **System Architecture Flow** documentation against the actual codebase implementation of the **Aura SaaS Platform**.

Overall, the project is **highly aligned** with the architectural vision. It successfully implements a secure, multi-tenant CRM SaaS utilizing Kubernetes (K3s), Helm charts, Terraform, and a fully automated cascading CI/CD pipeline on AWS. 

However, to optimize for budget constraints (~$10 limit) and demonstration requirements, certain infrastructure choices were modified (such as consolidating resources), and several non-core application features (such as contacts management and local HPA visualization) were deferred. Below is the detailed comparison.

---

## 2. Alignment Checklist (What Matches)

| Component / Layer | Documented Design | Actual Implementation | Status |
| :--- | :--- | :--- | :---: |
| **Backend Runtime** | Node.js 20 + Express.js | Node.js 20 (Express.js) | ✅ Match |
| **Alternative Server** | Python Flask mock for demo | `assignment.py` + `scripts/run_demo.sh` | ✅ Match |
| **Database Engine** | PostgreSQL 15 on AWS RDS | PostgreSQL 15 on AWS RDS | ✅ Match |
| **Tenant Isolation** | Schema-per-tenant | `SET search_path TO tenant_<id>` | ✅ Match |
| **Frontend UI Tech** | Vanilla HTML5 + CSS3 + JS | Vanilla HTML5 + CSS3 + JS (served via Vite / Nginx) | ✅ Match |
| **Security Layer** | JWT (HS256) auth + Bcrypt | Express JWT verification + Bcrypt hashing | ✅ Match |
| **Secrets Mgmt** | GitHub Secrets -> K8s Secrets | Terraform outputs mapped -> Helm `--set` | ✅ Match |
| **Infrastructure (IaC)** | Terraform for VPC/Subnets/SGs | VPC, Subnets, IGW, Security Groups, EC2, RDS | ✅ Match |
| **Orchestration** | Kubernetes (K3s) on EC2 | K3s + Helm 3 deployments | ✅ Match |
| **Containers** | Docker multi-stage builds | Dockerfiles for frontend/backend (Alpine-based) | ✅ Match |

---

## 3. Gap Analysis: Missing / Left to Do

The following features or structures described in the LLD/HLD were **not implemented** in the final application codebase:

### 3.1 Frontend Layout Gaps
*   **No Sidebar Navigation:** The LLD page structure references a `.sidebar` navigation component. The current frontend is a single, clean workspace layout rather than a multi-page sidebar-driven portal.
*   **No Contacts Panel:** The LLD lists `#contacts-panel`. There is no visual element or management tool for "Contacts" on the dashboard.
*   **No HPA Visualization Panel:** The LLD references `#hpa-panel` for a "live pod scaling visualization". Although HPA is active in production, the frontend dashboard lacks a live visualization graph for cluster replicas.

### 3.2 Backend API Gaps
*   **No Contacts Endpoints:** The LLD specifies `GET /api/contacts` and `POST /api/contacts`. These do not exist in `server/index.js`.
*   **No Delete Customer Endpoint:** The LLD specifies `DELETE /api/customers/:id`. The current backend only supports `GET /customers` and `POST /customers`.

### 3.3 CI/CD & Monitoring Gaps
*   **No Active Cron Monitoring Workflow:** The HLD/LLD references a 30-minute cron check (`monitor.yml`) running vulnerability checks (`npm audit`, `Bandit`) and live health checks. While security audits run during the deploy pipeline, a standalone recurring cron workflow is not active in `.github/workflows/`.

---

## 4. Architectural Enhancements & Deviations (What was Added/Modified)

Several changes were introduced during implementation to improve pipeline DRYness, ensure local testability, and strictly adhere to the AWS Free Tier budget:

### 4.1 Cost-Optimized Compute Topology (Major Deviation)
*   **Documentation:** Suggested separate Terraform deployments/environments (dev, staging, prod) which would imply provisioning 3 distinct EC2 instances and 3 distinct RDS databases.
*   **Actual:** Provisioned a single, slightly larger EC2 instance (`t3.small` - 2GB RAM) and a single shared RDS PostgreSQL database.
*   **How Isolation is Preserved:** Environments are completely isolated at the Kubernetes cluster level using separate namespaces (`crm-dev`, `crm-staging`, `crm-prod`), and at the database level using separate PostgreSQL databases (`crm_db_dev`, `crm_db_staging`, `crm_db_prod`) running on the same RDS instance. This keeps AWS costs under the $10 threshold while demonstrating multi-environment namespaces.

### 4.2 Unified Reusable CI/CD Workflows (Enhancement)
*   **Documentation:** Suggested separate `deploy-dev.yml`, `deploy-staging.yml`, and `deploy-prod.yml` workflows.
*   **Actual:** Consolidated everything into a single, clean, cascading pipeline (`pipeline.yml`) calling a parameterized reusable template (`deploy-env-template.yml`). This eliminated duplicate code blocks and ensured unified logic.

### 4.3 Single-Domain Ingress Prefix Routing (Added Feature)
*   **Actual:** Rather than requiring 3 separate domain configurations, the ingress configuration (`ingress.yaml`) uses Nginx regex rewrites (`nginx.ingress.kubernetes.io/rewrite-target: /$2`) to route requests from a single domain (`aurasaas.duckdns.org`):
    *   `/` -> Production
    *   `/dev/` -> Dev
    *   `/staging/` -> Staging
*   **API Resolution:** Backend paths strip their prefix via rewrite, meaning backend code can remain clean and route-agnostic (listening simply to `/login` and `/customers`).

### 4.4 Local PostgreSQL Fallback Deployment (Added Feature)
*   **Actual:** The Helm chart features a conditional local database deployment (`postgres-deployment.yaml` and `service.yaml`) that activates `if not .Values.db.host`. This allows running the entire stack fully locally (on Minikube/local K3s) without provisioning RDS.

### 4.5 Jenkinsfile Blueprint (Added Feature)
*   **Actual:** Added a skeletal `Jenkinsfile` at the root of the project to allow future migration of the pipeline from GitHub Actions to a self-hosted Jenkins server.

---

## 5. Technology Recommendation

The architectural deviations (resource consolidation, unified pipeline, single-domain routing) are **strongly approved** as they directly solved real-world constraints (AWS budget and single-domain routing). 

I recommend that future iterations implement the **Contacts Management endpoints** and add a **vulnerability cron workflow** to completely align with the LLD's feature specifications.
