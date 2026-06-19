# Synopsis of Major Project (23ONMCR-753)

## Master of Computer Applications - Fourth Semester
**Centre for Distance & Online Education, Chandigarh University**

---

### 1. Title of the Project
**Multi-Tenant SaaS Deployment Using Kubernetes and Infrastructure as Code**

---

### 2. Objective of the Project
The primary objective of this project is to design, deploy, and manage a secure, scalable, and fully automated Multi-Tenant Software-as-a-Service (SaaS) Customer Relationship Management (CRM) platform. The implementation leverages modern DevOps and Cloud-Native practices to address the common scalability and tenant isolation vulnerabilities inherent in monolithic architectures.

Specifically, the project aims to:
- **Enforce Tenant Isolation**: Segregate tenant computational workloads and network traffic logically using Kubernetes Namespaces and security boundaries.
- **Implement Role-Based Access Control (RBAC)**: Secure access to Kubernetes resources within namespaces so that tenant administrators can only manage their specific namespace resources.
- **Establish Database Isolation**: Deploy dedicated PostgreSQL database instances per tenant to prevent cross-tenant data leaks and ensure localized data sovereignty.
- **Automate Infrastructure (IaC)**: Code the cloud infrastructure (AWS VPC, subnets, NAT gateways, and EKS managed Kubernetes cluster) using Terraform, ensuring rapid, consistent, and reproducible environments.
- **Implement Horizontal Pod Autoscaling (HPA)**: Configure automatic scaling of backend and frontend application replicas in response to real-time CPU utilization, ensuring high availability during load spikes and cost optimization during idle states.
- **Standardize Application Packaging**: Build lightweight, secure multi-stage Docker container images for Node.js backend services and Nginx-based frontend interfaces.

---

### 3. Resources Required

#### A. Hardware Requirements
To deploy, test, and run the infrastructure locally (simulating EKS node behaviors) or via cloud instances, the following specifications are required:
- **Processor**: Intel Core i5 / AMD Ryzen 5 (4 Cores, 2.5 GHz or above)
- **Memory (RAM)**: 8 GB minimum (16 GB recommended for running local Minikube clusters alongside IDE)
- **Storage**: 60 GB of Free Hard Disk Space (Solid State Drive (SSD) preferred for fast container builds)
- **Network Interface**: High-speed internet connection (minimum 10 Mbps) for pulling container base images and syncing Terraform AWS providers.

#### B. Software Requirements
The project is built and validated using the following software tools:
- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian) or Windows 10/11 with WSL2 (Windows Subsystem for Linux)
- **Containerization Engine**: Docker Engine v24.0.0+ / Docker Desktop
- **Orchestration Tool**: Kubernetes (using `kubectl` command-line tool, local cluster via Minikube/Kind, or cloud-managed AWS EKS cluster v1.27)
- **Infrastructure as Code**: Terraform CLI v1.5.0+ (with AWS Provider)
- **Programming Languages**:
  - Backend: Node.js v20.x (Express framework)
  - Frontend: Vanilla HTML5 / Modern CSS3 (Tailwind CSS) / Client-side JS
  - Local Demonstration: Python v3.10+ (Flask framework v3.0+)
- **Database Engine**: PostgreSQL v15 (Alpine containerized edition)
- **Development Tools**: Visual Studio Code (VS Code) with extensions for Docker, Kubernetes, and Terraform.
