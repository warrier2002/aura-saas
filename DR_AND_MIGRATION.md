# Disaster Recovery, Chaos Engineering, & Multi-Cloud Migration Strategy
**Project:** Aura SaaS Platform

---

## 1. Multi-Cloud Migration Scope (AWS -> Azure / GCP)

The Aura SaaS Platform has been strictly designed to be cloud-agnostic, leveraging containerization and infrastructure-as-code to prevent vendor lock-in.

### 1.1 Current Architecture (AWS Free Tier)
- **Compute:** AWS EC2 (`t2.micro`) running k3s (Lightweight Kubernetes).
- **Database:** AWS RDS PostgreSQL (`db.t3.micro`).
- **Storage:** Amazon S3 for Terraform state.

### 1.2 Migration Path to Azure / GCP
Because the underlying platform uses K3s, Docker, and standard PostgreSQL, migrating to another provider requires zero code changes to the application:

*   **Google Cloud Platform (GCP):**
    *   Change the Terraform provider to `google`.
    *   Map EC2 -> **GCE e2-micro** (Free Tier).
    *   Map RDS -> **Cloud SQL PostgreSQL**.
    *   Map S3 -> **Google Cloud Storage (GCS)**.
*   **Microsoft Azure:**
    *   Change the Terraform provider to `azurerm`.
    *   Map EC2 -> **Azure B1s VM** (Free Tier).
    *   Map RDS -> **Azure Database for PostgreSQL Flexible Server**.
    *   Map S3 -> **Azure Blob Storage**.

### 1.3 How to Migrate (Zero-Downtime Strategy)
1. **Provision Target:** Run the updated Terraform against the new Cloud Provider.
2. **Replicate Data:** Use PostgreSQL logical replication to continuously sync data from AWS RDS to the new provider's database.
3. **Deploy Workloads:** Deploy the Helm chart `helm/aura-saas` to the new Kubernetes cluster.
4. **DNS Cutover:** Update the Route53/Cloudflare DNS A-record to point to the new cluster's Ingress IP.
5. **Decommission:** Once traffic drains, destroy the AWS environment via `terraform destroy`.

---

## 2. Disaster Recovery (DR) Plan

To ensure maximum availability, we must define our Recovery Time Objective (RTO) and Recovery Point Objective (RPO).

*   **RPO (Data Loss Tolerance):** 1 Hour
*   **RTO (Downtime Tolerance):** 15 Minutes

### 2.1 Backup Mechanisms
*   **Database:** Automated AWS RDS daily snapshots + point-in-time recovery (PITR) up to 5 minutes.
*   **Infrastructure:** Terraform state is versioned in S3. 
*   **Code:** GitHub repository acts as the single source of truth for all application and infrastructure configurations.

### 2.2 Disaster Scenarios & Playbooks
*   **Scenario A: EC2 Node Failure (Zone Outage)**
    *   **Action:** GitHub Actions automatically re-runs the provision step. Terraform detects the missing EC2 instance and provisions a new one. The bootstrap script automatically installs K3s and re-deploys the Helm charts.
    *   **RTO:** ~5 minutes (Instance boot + K3s bootstrap).
*   **Scenario B: RDS Database Corruption**
    *   **Action:** Restore the RDS instance from the latest snapshot using the AWS Console or CLI. Update the GitHub Secret `TF_VAR_db_password` and trigger the deploy pipeline to inject the new connection string.
*   **Scenario C: Total Region Failure (e.g., us-east-1 goes down)**
    *   **Action:** Change the `AWS_REGION` secret in GitHub Actions to `us-west-2`. Run the pipeline. Terraform provisions a fresh replica of the entire infrastructure in the new region. Restore DB from a cross-region snapshot.

---

## 3. Chaos Engineering Practices

To proactively discover vulnerabilities in our architecture, we implement controlled Chaos Engineering (inspired by Netflix's Chaos Monkey).

### 3.1 Fault Injection Scenarios
1.  **Pod Termination (The "Monkey"):**
    *   *Test:* Randomly delete a backend pod during high load: `kubectl delete pod -l app=aura-backend`.
    *   *Expected Result:* The K8s ReplicaSet instantly detects the missing pod and spins up a replacement. The Ingress controller stops routing traffic to the dead pod, resulting in 0 dropped requests for the user.
2.  **Database Latency Injection:**
    *   *Test:* Use `tc` (Traffic Control) to add 500ms of latency between the K3s cluster and RDS.
    *   *Expected Result:* The application connection pool handles the latency. Liveness probes succeed, but response times degrade. HPA (Horizontal Pod Autoscaler) triggers an upscale due to increased CPU load parsing delayed data.
3.  **Simulated CPU Spike:**
    *   *Test:* Run a stress test `stress --cpu 4` inside a backend container.
    *   *Expected Result:* The Horizontal Pod Autoscaler (HPA) detects CPU utilization over the 70% target and automatically scales the deployment from 2 to 10 pods to handle the load.
