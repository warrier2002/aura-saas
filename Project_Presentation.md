# Project Presentation Slide Outline (23ONMCR-753)

## Multi-Tenant SaaS Deployment Using Kubernetes and Infrastructure as Code

**Program**: Master of Computer Applications (MCA)  
**Semester**: Fourth Semester  
**University**: Centre for Distance & Online Education, Chandigarh University  

---

### **Slide 1: Title Slide**
- **Project Title**: Multi-Tenant SaaS Deployment Using Kubernetes and Infrastructure as Code
- **Course Code**: 23ONMCR-753
- **Presenter Details**: 
  - *Student Name*: [Student Name]
  - *Student UID*: [Student UID]
- **Organization Host**: NTPL Digital Private Limited, Noida, Uttar Pradesh, India
- **Objective**: Deploying a containerized, isolated, and auto-scaling CRM SaaS platform.

---

### **Slide 2: Objectives of the Project**
- **Logical Workload Isolation**: Keep tenant namespaces separated in Kubernetes.
- **Dedicated Database-Per-Tenant**: Secure client data against cross-tenant breaches.
- **Declarative Infrastructure**: Eliminate configuration drift using Terraform IaC.
- **Continuous Elasticity**: Use Horizontal Pod Autoscaler (HPA) to scale dynamically with CPU loads.
- **Automated Containerization**: Package application layers using Docker multi-stage builds.

---

### **Slide 3: Core Problem Statement**
- **Monolithic Limitations**: Sharing resources leads to data security issues (noisy neighbor effect).
- **Manual Operations**: Provisioning infrastructure manually is slow and prone to errors.
- **Scaling Inefficiencies**: Monoliths require scaling the entire stack, wasting resources.
- **Access Control Vulnerabilities**: Lack of namespace isolation permits cross-service access.

---

### **Slide 4: Proposed Solution Architecture**
*Visual Architecture Flow:*
- **User Entry**: Exposes LoadBalancer endpoint routing requests to tenant namespaces.
- **Logical Namespaces**: `tenant-a` and `tenant-b` separate customer environments.
- **Microservices Stack**: Dedicated Nginx frontend and Express.js backend per tenant.
- **Data Segregation**: Dedicated PostgreSQL database pod in each namespace.
- **Infrastructure**: Automated AWS VPC and EKS deployment via Terraform.

---

### **Slide 5: Infrastructure as Code (Terraform)**
- **VPC Configuration**:
  - Sets up private subnets for DB and backend to prevent public exposure.
  - Public subnets host Load Balancer endpoints.
- **EKS Cluster**:
  - Configures managed node groups with autoscaling bounds (min: 2, max: 10, target: t3.medium).
- **Command Line**:
  - `terraform init` -> `terraform plan` -> `terraform apply --auto-approve`

---

### **Slide 6: Containerization (Docker)**
- **Express Backend**:
  - Lightweight Alpine Linux base (`node:20-alpine`) to minimize attack surface.
  - Port 3001 exposed.
- **Nginx Frontend**:
  - Multi-stage build setup.
  - Stage 1: Builds Vite static production bundle (`npm run build`).
  - Stage 2: Copies output `/dist` to `/usr/share/nginx/html` in an Nginx container.

---

### **Slide 7: Tenant Isolation (Kubernetes Namespaces)**
- **Namespaces**:
  - Separates logical resources into logical boundaries: `tenant-a` and `tenant-b`.
- **DNS Resolution**:
  - Kubernetes DNS resolves `crm-postgres` internally inside each namespace to its specific database instance.
  - Prevents `tenant-a` backend from accessing `tenant-b` database records.

---

### **Slide 8: Role-Based Access Control (RBAC)**
- **Roles**:
  - Declares administrative access for `tenant-a-admin` and `tenant-b-admin`.
- **RoleBindings**:
  - Binds service accounts within the respective namespace boundaries.
  - Prevents cross-namespace manipulation: `kubectl auth can-i get pods --namespace tenant-b` yields `No` when run by `tenant-a` service accounts.

---

### **Slide 9: Autoscaling & Orchestration (HPA)**
- **Deployments**:
  - Controls replica sets, rolling upgrades, and resource limits (requests: 100m CPU, limits: 500m CPU).
- **Horizontal Pod Autoscaling**:
  - Monitors CPU utilization of pods.
  - Spawns up to 10 pod replicas if average utilization exceeds 70%.
  - Automatically shrinks replicas during periods of low traffic to save costs.

---

### **Slide 10: Testing & Verification**
- **Functional Testing**: Verifies user signup and database record injection.
- **Isolation Testing**: Evaluates namespace security using RBAC constraints.
- **Load / Stress Testing**: Simulates CPU load to trigger HPA scaling:
  - Pods scale from 2 to 5+ replicas as load hits target threshold.
  - Scales back down after load is removed.

---

### **Slide 11: Real-World Applications**
- **Corporate CRM Multi-Tenancy**: Retailers, logistics companies, and corporate offices run isolated operations under a unified control pane.
- **Compliance & Security**: Keeps customer data physically and logically resident within individual boundaries (essential for GDPR / HIPAA).
- **Rapid Customer Onboarding**: Running a single namespace manifest sets up a fresh tenant in minutes.

---

### **Slide 12: Conclusion & Future Scope**
- **Conclusion**:
  - Containerization, IaC, and Kubernetes orchestration guarantee secure, auto-scalable, and reproducible cloud deployments.
- **Future Enhancements**:
  - Integration of a Service Mesh (e.g., Istio) for Mutual TLS (mTLS) network traffic encryption.
  - Implementation of GitOps (e.g., ArgoCD) for git-driven continuous delivery.
  - Comprehensive logging and analytics dashboards (Prometheus & Grafana).
