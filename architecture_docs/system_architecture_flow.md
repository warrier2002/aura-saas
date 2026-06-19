# 🚀 Aura SaaS Platform — System Architecture Flow

> Architecture Version 3.0 | Fully Automated Provisioning — Only 3 GitHub Secrets Needed

---

## 🗺️ 1. Full System Architecture — End to End

```mermaid
graph TD
    DEV(["👨‍💻 Developer\nLocal Machine\ngit push to main"])

    subgraph GITHUB ["☁️ GitHub — Public Repository"]
        direction TB
        SRC["📁 Source Code\nFrontend + Backend + Helm + Terraform"]
        subgraph GSEC ["🔐 GitHub Secrets (3 only)"]
            S1["AWS_ACCESS_KEY_ID"]
            S2["AWS_SECRET_ACCESS_KEY"]
            S3["AWS_REGION"]
        end
    end

    subgraph PIPELINE ["⚙️ GitHub Actions — Fully Automated Pipeline"]
        direction TB

        subgraph CI_S ["🧪 Stage 0 — CI: Lint and Test (ci.yml)"]
            CI_PY["🐍 Python flake8 Lint"]
            CI_NODE["🟢 Node.js npm audit"]
            CI_JWT["🔑 JWT and bcrypt Tests"]
            CI_FE["🖥️ Frontend Security Checks"]
        end

        subgraph TF_S ["🏗️ Stage 1 — PROVISION (Terraform)"]
            TF1["terraform init\nBackend: S3 bucket"]
            TF2["terraform apply\nCreate EC2 + RDS + VPC + SGs"]
            TF3["Auto-Generate:\nSSH RSA 4096 key pair\nRandom DB password 24 chars\nRandom JWT secret 64 chars"]
            TF4["terraform output\nCapture all values as job outputs\nMask sensitive values in logs"]
            TF5["Wait for EC2 Bootstrap\nk3s + Docker + Helm installed"]
            TF1 --> TF2 --> TF3 --> TF4 --> TF5
        end

        subgraph BUILD_S ["🐳 Stage 2a — BUILD and PUSH (parallel)"]
            B1["Build crm-backend\nnode 20 alpine"]
            B2["Build crm-frontend\nnginx alpine multi-stage"]
            B3["Push to GHCR\nTagged with git SHA"]
            B1 & B2 --> B3
        end

        subgraph DBINIT_S ["🗄️ Stage 2b — DB INIT (parallel)"]
            DB1["SSH Tunnel\nlocalhost:5433 via EC2 to RDS"]
            DB2["Run db_init.sql\nCreate tenant_a and tenant_b schemas"]
            DB3["Create tables: users\ncustomers contacts"]
            DB4["Insert seed admin users\nOne per tenant"]
            DB1 --> DB2 --> DB3 --> DB4
        end

        subgraph DEPLOY_S ["🚀 Stage 3 — DEPLOY via Helm"]
            D1["SSH into EC2\nKey from terraform output"]
            D2["helm upgrade install aura-saas\nAll values from terraform outputs"]
            D3["Kubernetes Rolling Update\nZero downtime"]
            D4["Smoke Tests\ncurl health + auth 401 check"]
            D1 --> D2 --> D3 --> D4
        end

        subgraph MONITOR_S ["👁️ Stage 4 — MONITOR (cron every 30 min)"]
            M1["pip-audit + npm audit"]
            M2["Bandit SAST Scan"]
            M3["Live Health Check"]
            M4["Auth Enforcement: 401"]
        end

        CI_PY & CI_NODE & CI_JWT & CI_FE -->|"All Pass"| TF_S
        TF_S -->|"EC2 IP + RDS Endpoint auto-captured"| BUILD_S & DBINIT_S
        BUILD_S & DBINIT_S --> DEPLOY_S
        DEPLOY_S -.->|"separate cron schedule"| MONITOR_S
    end

    subgraph GHCR ["📦 GitHub Container Registry\nghcr.io/user/repo"]
        IMG_BE["crm-backend\nlatest and sha"]
        IMG_FE["crm-frontend\nlatest and sha"]
    end

    subgraph AWS_CLOUD ["☁️ AWS Cloud — Auto-Provisioned by Terraform"]
        subgraph VPC_BOX ["🌐 VPC 10.0.0.0/16"]

            subgraph PUB_SUB ["Public Subnet 10.0.1.0/24"]
                subgraph EC2_BOX ["🖥️ EC2 t2.micro — Free Tier"]
                    subgraph K8S ["☸️ Kubernetes k3s"]
                        INGRESS_C["Nginx Ingress\nPort 80 and 443"]
                        FE_PODS["Frontend Pods\n2 to 10 replicas HPA"]
                        BE_PODS["Backend Pods\n2 to 10 replicas HPA"]
                        K8S_SECS["K8s Secrets\nDB creds + JWT\nfrom Helm set values"]
                    end
                end
            end

            subgraph PRIV_SUB ["Private Subnets 10.0.2.x and 10.0.3.x"]
                subgraph RDS_BOX ["🗄️ AWS RDS PostgreSQL 15\ndb.t3.micro — Free Tier"]
                    SCHEMA_A["Schema: tenant_a\nusers customers contacts"]
                    SCHEMA_B["Schema: tenant_b\nusers customers contacts"]
                end
            end
        end
    end

    subgraph USERS ["🌐 End Users"]
        UA["👤 Tenant A User"]
        UB["👤 Tenant B User"]
    end

    DEV -->|"git push to main"| GITHUB
    GSEC -->|"Only AWS creds flow in"| TF_S
    BUILD_S -->|"Push images"| GHCR
    GHCR -->|"Pull on deploy"| FE_PODS & BE_PODS
    DEPLOY_S -->|"helm deploy"| K8S
    BE_PODS -->|"JWT extracts tenant_id\nSets search_path"| RDS_BOX
    INGRESS_C --> FE_PODS & BE_PODS
    UA & UB -->|"HTTPS"| INGRESS_C

    style GITHUB fill:#24292e,stroke:#58a6ff,stroke-width:2px,color:#fff
    style GSEC fill:#3d1a0d,stroke:#f77f00,stroke-width:2px,color:#fff
    style PIPELINE fill:#0d1117,stroke:#f0a500,stroke-width:2px,color:#fff
    style CI_S fill:#0d3b66,stroke:#5adfff,stroke-width:2px,color:#fff
    style TF_S fill:#3d0a3d,stroke:#da77f2,stroke-width:2px,color:#fff
    style BUILD_S fill:#1b4332,stroke:#52b788,stroke-width:2px,color:#fff
    style DBINIT_S fill:#2d1a00,stroke:#e3b341,stroke-width:2px,color:#fff
    style DEPLOY_S fill:#3d1a0d,stroke:#f77f00,stroke-width:2px,color:#fff
    style MONITOR_S fill:#1c1a3d,stroke:#79c0ff,stroke-width:2px,color:#fff
    style GHCR fill:#161b22,stroke:#79c0ff,stroke-width:2px,color:#fff
    style AWS_CLOUD fill:#0d1117,stroke:#ff9900,stroke-width:3px,color:#fff
    style VPC_BOX fill:#1c2128,stroke:#ffa657,stroke-width:2px,color:#fff
    style PUB_SUB fill:#162032,stroke:#5adfff,stroke-width:1px,color:#fff
    style EC2_BOX fill:#1a2800,stroke:#52b788,stroke-width:2px,color:#fff
    style K8S fill:#0d2137,stroke:#326ce5,stroke-width:2px,color:#fff
    style PRIV_SUB fill:#2a0845,stroke:#da77f2,stroke-width:1px,color:#fff
    style RDS_BOX fill:#3d0045,stroke:#da77f2,stroke-width:2px,color:#fff
    style USERS fill:#1a2e1a,stroke:#56d364,stroke-width:2px,color:#fff
```

---

## 🔄 2. How Secrets Flow Automatically Through the Pipeline

```mermaid
flowchart LR
    subgraph INPUT ["🔐 Developer Input (Manual — Done Once)"]
        I1["AWS_ACCESS_KEY_ID\nGitHub Secret"]
        I2["AWS_SECRET_ACCESS_KEY\nGitHub Secret"]
        I3["AWS_REGION\nGitHub Secret"]
    end

    subgraph TF ["🏗️ Terraform Apply (Automated)"]
        TF_EC2["aws_instance\nEC2 t2.micro\nOutputs public IP"]
        TF_RDS["aws_db_instance\nRDS PostgreSQL\nOutputs endpoint"]
        TF_SSH["tls_private_key\nRSA 4096\nOutputs private key PEM"]
        TF_PW["random_password\n24 chars\nOutputs DB password"]
        TF_JWT["random_password\n64 chars\nOutputs JWT secret"]
    end

    subgraph OUTPUTS ["📤 Terraform Outputs (Auto-read by pipeline)"]
        O1["ec2_public_ip\njob output — visible in logs"]
        O2["rds_endpoint\njob output — visible in logs"]
        O3["db_username\njob output — visible in logs"]
        O4["ssh_private_key\nGITHUB_ENV — MASKED in logs"]
        O5["db_password\nGITHUB_ENV — MASKED in logs"]
        O6["jwt_secret\nGITHUB_ENV — MASKED in logs"]
    end

    subgraph HELM ["⎈ Helm Deploy (Automated)"]
        H1["helm upgrade install aura-saas\n--set db.host from rds_endpoint\n--set db.password from db_password\n--set jwtSecret from jwt_secret\n--set backend.image.tag from git SHA"]
    end

    subgraph K8S ["☸️ Kubernetes Secrets (Auto-created by Helm)"]
        K1["Secret: crm-db-secret\nDB_HOST DB_USER DB_PASSWORD"]
        K2["Secret: crm-jwt-secret\nJWT_SECRET"]
    end

    subgraph PODS ["🐳 Backend Pod Env Vars (Auto-injected)"]
        P1["DB_HOST from Secret"]
        P2["DB_USER from Secret"]
        P3["DB_PASSWORD from Secret"]
        P4["JWT_SECRET from Secret"]
    end

    I1 & I2 & I3 --> TF
    TF_EC2 --> O1
    TF_RDS --> O2
    TF_RDS --> O3
    TF_SSH --> O4
    TF_PW --> O5
    TF_JWT --> O6

    O1 & O2 & O3 & O4 & O5 & O6 --> H1
    H1 --> K1 & K2
    K1 --> P1 & P2 & P3
    K2 --> P4

    style INPUT fill:#3d1a0d,stroke:#f77f00,stroke-width:2px,color:#fff
    style TF fill:#3d0a3d,stroke:#da77f2,stroke-width:2px,color:#fff
    style OUTPUTS fill:#0d3b66,stroke:#5adfff,stroke-width:2px,color:#fff
    style HELM fill:#1b4332,stroke:#52b788,stroke-width:2px,color:#fff
    style K8S fill:#0d2137,stroke:#326ce5,stroke-width:2px,color:#fff
    style PODS fill:#1c2128,stroke:#ffa657,stroke-width:2px,color:#fff
    style O4 fill:#6e1c1c,stroke:#f85149,color:#fff
    style O5 fill:#6e1c1c,stroke:#f85149,color:#fff
    style O6 fill:#6e1c1c,stroke:#f85149,color:#fff
```

---

## ⚙️ 3. CI/CD Pipeline — 5 Stages Detailed

```mermaid
flowchart TD
    A(["👨‍💻 git push to main"]) --> CI_BLOCK

    subgraph CI_BLOCK ["🧪 Stage 1 — CI Tests (ci-test)"]
        direction LR
        C1["🐍 Python\nflake8 lint\nbcrypt + JWT tests"]
        C2["🟢 Node.js\nnpm audit\nJWT integration test"]
        C3["🖥️ Frontend\nXSS check\nauth overlay check"]
    end

    CI_BLOCK --> BUILD_BLOCK

    subgraph BUILD_BLOCK ["🐳 Stage 2 — Build & Push (build-push)"]
        direction LR
        B1["docker build crm-backend\nDockerfile.backend"]
        B2["docker build crm-frontend\nDockerfile.frontend multi-stage"]
        B3["docker push to GHCR\nboth tagged git SHA + latest"]
        B1 & B2 --> B3
    end

    BUILD_BLOCK --> TF_BLOCK

    subgraph TF_BLOCK ["🏗️ Stage 3 — Provision Infra (provision)"]
        direction TB
        TF_A["Bootstrap S3 state bucket\nidempotent — safe to run every push"]
        TF_B["terraform init\nPull state from S3"]
        TF_C["terraform plan\nShow what will change"]
        TF_D["terraform apply\nCreate or update EC2 + RDS"]
        TF_E["Wait for EC2 bootstrap\nPoll until k3s and Docker are ready"]
        TF_A --> TF_B --> TF_C --> TF_D --> TF_E
    end

    TF_BLOCK --> DBINIT_BLOCK

    subgraph DBINIT_BLOCK ["🗄️ Stage 4 — DB Initialization (db-init)"]
        direction TB
        D1["Open SSH tunnel\nlocalhost:5433 to RDS via EC2"]
        D2["psql run db_init.sql\nCreate tenant schemas"]
        D3["Schema tenant_a\ntables + seed admin"]
        D4["Schema tenant_b\ntables + seed admin"]
        D1 --> D2 --> D3 & D4
    end

    DBINIT_BLOCK --> DEPLOY_BLOCK

    subgraph DEPLOY_BLOCK ["🚀 Stage 5 — Helm Deploy (helm-deploy)"]
        direction TB
        E1["Write SSH key\nfrom terraform output masked"]
        E2["SCP Helm chart\nto EC2 server"]
        E3["SSH into EC2\nhelm upgrade install aura-saas"]
        E4["Kubernetes rolling update\nZero downtime"]
        E1 --> E2 --> E3 --> E4
    end

    DEPLOY_BLOCK --> MONITOR_BLOCK

    subgraph MONITOR_BLOCK ["👁️ Stage 6 — Post-Deploy Monitor (monitor)"]
        direction TB
        M1["Wait for pods to be ready"]
        M2["cURL EC2 Public IP\nPoll up to 12 times (3 mins)"]
        M3["Require HTTP 200 OK\nPipeline fails if app is down"]
        M1 --> M2 --> M3
    end

    MONITOR_BLOCK --> SUCCESS(["🎉 Pipeline\nSUCCESS\nURL: http://EC2-IP"])

    style A fill:#238636,stroke:#3fb950,color:#fff,stroke-width:2px
    style CI_BLOCK fill:#0d3b66,stroke:#5adfff,color:#fff,stroke-width:2px
    style BUILD_BLOCK fill:#1b4332,stroke:#52b788,color:#fff,stroke-width:2px
    style TF_BLOCK fill:#3d0a3d,stroke:#da77f2,color:#fff,stroke-width:2px
    style DBINIT_BLOCK fill:#2d1a00,stroke:#e3b341,color:#fff,stroke-width:2px
    style DEPLOY_BLOCK fill:#3d1a0d,stroke:#f77f00,color:#fff,stroke-width:2px
    style MONITOR_BLOCK fill:#1c1a3d,stroke:#79c0ff,color:#fff,stroke-width:2px
    style SUCCESS fill:#238636,stroke:#3fb950,color:#fff,stroke-width:2px
```

---

## 🔑 4. JWT Multi-Tenant Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor UA as 👤 Tenant A User
    participant FE as 🖥️ Frontend (Nginx)
    participant BE as ⚙️ Backend (Express)
    participant DB as 🗄️ AWS RDS (PostgreSQL)

    Note over UA,DB: LOGIN FLOW

    UA->>FE: Open CRM in Browser
    FE-->>UA: Serve index.html login page
    UA->>BE: POST /api/login email+password+tenant=a
    BE->>DB: SET search_path TO tenant_a
    BE->>DB: SELECT password_hash FROM users WHERE email=?
    DB-->>BE: User record returned
    BE->>BE: bcrypt.compare password vs hash
    BE-->>UA: 200 OK signed JWT token
    UA->>UA: sessionStorage.setItem token

    Note over UA,DB: AUTHENTICATED API CALL

    UA->>BE: GET /api/customers Authorization Bearer token
    BE->>BE: requireAuth middleware
    BE->>BE: jwt.verify token with JWT_SECRET
    BE->>BE: Extract tenant_id from JWT payload only
    BE->>DB: SET search_path TO tenant_a
    BE->>DB: SELECT id name email phone FROM customers
    DB-->>BE: Only Tenant A rows returned
    BE-->>UA: JSON array of Tenant A customers

    Note over BE: SECURITY GUARANTEE
    Note over BE: Tenant ID from signed JWT only
    Note over BE: Cannot be faked via headers or body
    Note over BE: Tenant B data is inaccessible
```

---

## ☸️ 5. Kubernetes Internal Architecture

```mermaid
graph TB
    INET(["🌐 Internet — HTTPS Requests"])

    subgraph EC2 ["🖥️ AWS EC2 t2.micro — Auto-Created by Terraform"]
        INGRESS["🌐 Nginx Ingress Controller\npath / goes to Frontend\npath /api goes to Backend"]

        subgraph NS_FE ["📦 Namespace: crm-frontend"]
            FE_SVC_D["Service NodePort port 80"]
            FE_POD1["📄 Pod 1\nnginx:alpine"]
            FE_POD2["📄 Pod 2\nnginx:alpine"]
            FE_HPA_D["📈 HPA min=2 max=10\nCPU above 70pct"]
            FE_SVC_D --> FE_POD1 & FE_POD2
            FE_HPA_D -.->|"scales"| FE_POD1 & FE_POD2
        end

        subgraph NS_BE ["📦 Namespace: crm-backend"]
            BE_SVC_D["Service ClusterIP port 3001"]
            BE_POD1["⚙️ Pod 1\nnode:20-alpine"]
            BE_POD2["⚙️ Pod 2\nnode:20-alpine"]
            BE_HPA_D["📈 HPA min=2 max=10\nCPU above 70pct"]
            K8S_SEC["🔐 K8s Secret — auto-created by Helm\nDB_HOST from rds_endpoint terraform output\nDB_PASSWORD from db_password terraform output\nJWT_SECRET from jwt_secret terraform output"]
            BE_SVC_D --> BE_POD1 & BE_POD2
            BE_HPA_D -.->|"scales"| BE_POD1 & BE_POD2
            K8S_SEC -.->|"env vars injected at pod start"| BE_POD1 & BE_POD2
        end
    end

    subgraph GHCR_BOX ["📦 GHCR — Auto-populated by pipeline"]
        IMGS["crm-backend:sha\ncrm-frontend:sha"]
    end

    subgraph RDS_PRIV ["🗄️ AWS RDS — Private Subnet — Auto-Created by Terraform"]
        PG["PostgreSQL 15 db.t3.micro\ntenant_a schema\ntenant_b schema\nSSL port 5432 only from EC2 SG"]
    end

    INET --> INGRESS
    INGRESS -->|"path /"| FE_SVC_D
    INGRESS -->|"path /api"| BE_SVC_D
    FE_POD1 & FE_POD2 <-->|"API calls"| BE_SVC_D
    BE_POD1 & BE_POD2 -->|"SSL port 5432"| PG
    GHCR_BOX -->|"imagePull on helm upgrade"| FE_POD1 & FE_POD2 & BE_POD1 & BE_POD2

    style EC2 fill:#1c2128,stroke:#ffa657,stroke-width:3px,color:#fff
    style NS_FE fill:#0d2040,stroke:#79c0ff,stroke-width:2px,color:#fff
    style NS_BE fill:#0a2d1a,stroke:#56d364,stroke-width:2px,color:#fff
    style GHCR_BOX fill:#161b22,stroke:#79c0ff,stroke-width:2px,color:#fff
    style RDS_PRIV fill:#2a0845,stroke:#da77f2,stroke-width:2px,color:#fff
    style INET fill:#238636,stroke:#3fb950,stroke-width:2px,color:#fff
```

---

## 🛡️ 6. Security Layer Architecture

```mermaid
flowchart TD
    REQ(["📡 Incoming HTTP Request\nfrom Browser"])

    L1{"🌐 Layer 1\nAWS Security Group\nOnly ports 80 and 443 open\nRDS reachable from EC2 only"}
    L2{"🔒 Layer 2\nHTTPS TLS\nTerminated at Ingress"}
    L3{"🎫 Layer 3\nJWT Token Present?\nAuthorization: Bearer"}
    L4{"✅ Layer 4\nSignature Valid?\njwt.verify with JWT_SECRET"}
    L5{"⏰ Layer 5\nToken Not Expired?\nexp claim checked"}
    L6{"🏢 Layer 6\nExtract tenant_id\nFrom JWT payload only\nNever from headers or body"}
    L7{"🧹 Layer 7\nInput Validation\nRegex and type checks"}
    L8{"💉 Layer 8\nSQL Injection Safe\nParameterised queries only"}
    L9{"🖨️ Layer 9\nXSS Prevention\nescapeHtml on all output"}
    RES(["✅ Response Returned\nData scoped to tenant only"])

    BLOCK1(["❌ 403 Blocked by SG"])
    BLOCK2(["❌ 401 No Token"])
    BLOCK3(["❌ 401 Invalid Token"])
    BLOCK4(["❌ 401 Expired Token"])
    BLOCK5(["❌ 400 Validation Failed"])

    REQ --> L1
    L1 -->|"Wrong port"| BLOCK1
    L1 -->|"Allowed port"| L2
    L2 --> L3
    L3 -->|"Missing"| BLOCK2
    L3 -->|"Present"| L4
    L4 -->|"Invalid"| BLOCK3
    L4 -->|"Valid"| L5
    L5 -->|"Expired"| BLOCK4
    L5 -->|"Fresh"| L6
    L6 --> L7
    L7 -->|"Bad input"| BLOCK5
    L7 -->|"Clean input"| L8
    L8 --> L9
    L9 --> RES

    style REQ fill:#1b4332,stroke:#52b788,color:#fff,stroke-width:2px
    style RES fill:#238636,stroke:#3fb950,color:#fff,stroke-width:2px
    style BLOCK1 fill:#6e1c1c,stroke:#f85149,color:#fff,stroke-width:2px
    style BLOCK2 fill:#6e1c1c,stroke:#f85149,color:#fff,stroke-width:2px
    style BLOCK3 fill:#6e1c1c,stroke:#f85149,color:#fff,stroke-width:2px
    style BLOCK4 fill:#6e1c1c,stroke:#f85149,color:#fff,stroke-width:2px
    style BLOCK5 fill:#6e1c1c,stroke:#f85149,color:#fff,stroke-width:2px
    style L1 fill:#0d3b66,stroke:#5adfff,color:#fff,stroke-width:2px
    style L2 fill:#0d3b66,stroke:#5adfff,color:#fff,stroke-width:2px
    style L3 fill:#3d1a0d,stroke:#f77f00,color:#fff,stroke-width:2px
    style L4 fill:#3d1a0d,stroke:#f77f00,color:#fff,stroke-width:2px
    style L5 fill:#3d1a0d,stroke:#f77f00,color:#fff,stroke-width:2px
    style L6 fill:#2d0036,stroke:#da77f2,color:#fff,stroke-width:2px
    style L7 fill:#2d0036,stroke:#da77f2,color:#fff,stroke-width:2px
    style L8 fill:#2d0036,stroke:#da77f2,color:#fff,stroke-width:2px
    style L9 fill:#2d0036,stroke:#da77f2,color:#fff,stroke-width:2px
```

---

## 📊 7. Tech Stack and Auto-Provisioning Summary

| Layer | Technology | Provisioned By |
|:---:|:---:|:---|
| 🖥️ **Frontend** | HTML5 + CSS3 + JS + Nginx | Docker image built by GitHub Actions |
| ⚙️ **Backend** | Node.js 20 + Express.js | Docker image built by GitHub Actions |
| 🗄️ **Database** | PostgreSQL 15 on AWS RDS | **Terraform auto-creates** db.t3.micro |
| ☁️ **Compute** | AWS EC2 t2.micro | **Terraform auto-creates** with k3s + Helm pre-installed |
| 🌐 **Networking** | VPC + Subnets + SGs + IGW | **Terraform auto-creates** full network topology |
| 🔑 **SSH Key** | RSA 4096 key pair | **Terraform auto-generates** via tls_private_key |
| 🔐 **DB Password** | 24-char random string | **Terraform auto-generates** via random_password |
| 🪙 **JWT Secret** | 64-char random hex | **Terraform auto-generates** via random_password |
| 📦 **Containers** | Docker multi-stage builds | GitHub Actions builds and pushes to GHCR |
| ☸️ **Orchestration** | Kubernetes k3s + Helm 3 | Helm chart deployed by GitHub Actions via SSH |
| 🔁 **CI/CD** | GitHub Actions (3 workflows) | Triggered on push to main |
| 📦 **Registry** | GHCR | Free — auto-authenticated via GITHUB_TOKEN |
| 🏗️ **IaC** | Terraform | Run by GitHub Actions using AWS secrets |
| 💾 **TF State** | S3 bucket | **Pipeline auto-creates** on first run |

---

## 📋 8. Requirements and Prerequisites

```
Developer adds to GitHub Secrets:     AWS_ACCESS_KEY_ID
                                      AWS_SECRET_ACCESS_KEY
                                      AWS_REGION

Pipeline auto-creates everything:     EC2 public IP
                                      RDS endpoint + DB password
                                      SSH private key (RSA 4096)
                                      JWT signing secret
                                      VPC + Subnets + Security Groups
                                      K8s namespaces + RBAC + Secrets
```


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
