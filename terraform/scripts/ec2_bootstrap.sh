#!/bin/bash
# =============================================================================
# EC2 Bootstrap Script — Aura SaaS
# =============================================================================
# This script runs ONCE on first boot of the EC2 instance (via user_data).
# It installs Docker, k3s (lightweight Kubernetes), and Helm.
#
# Terraform passes the project_name variable into this script.
# =============================================================================

set -euo pipefail

PROJECT_NAME="${project_name}"  # Injected by Terraform templatefile()

echo "==================================================="
echo "  CRM — EC2 Bootstrap Starting"
echo "  Project: $PROJECT_NAME"
echo "  Time:    $(date -u)"
echo "==================================================="

# --- System Update ---
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
    curl \
    wget \
    unzip \
    git \
    ca-certificates \
    gnupg \
    lsb-release

# --- Install Docker ---
echo ">>> Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker
echo ">>> Docker installed: $(docker --version)"

# --- Install k3s (lightweight Kubernetes) ---
echo ">>> Installing k3s..."
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --disable traefik" sh -
# Disable traefik because we will install nginx-ingress via Helm

# Wait for k3s to be ready
sleep 15
k3s kubectl wait --for=condition=Ready node --all --timeout=120s || true

# Configure kubeconfig for ubuntu user
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
sed -i 's|127.0.0.1|127.0.0.1|g' /home/ubuntu/.kube/config
chown ubuntu:ubuntu /home/ubuntu/.kube/config
chmod 600 /home/ubuntu/.kube/config

# Also set for root
mkdir -p /root/.kube
cp /etc/rancher/k3s/k3s.yaml /root/.kube/config

echo ">>> k3s installed: $(k3s --version)"

# --- Install Helm ---
echo ">>> Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
echo ">>> Helm installed: $(helm version --short)"

# --- Install nginx-ingress via Helm ---
echo ">>> Installing nginx-ingress controller..."
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --set controller.service.type=NodePort \
    --set controller.service.nodePorts.http=80 \
    --set controller.service.nodePorts.https=443 \
    --wait --timeout 5m

echo ">>> nginx-ingress installed"

# --- Mark bootstrap complete ---
echo "$PROJECT_NAME bootstrap complete at $(date -u)" > /home/ubuntu/bootstrap_done.txt
chown ubuntu:ubuntu /home/ubuntu/bootstrap_done.txt

echo "==================================================="
echo "  CRM — EC2 Bootstrap COMPLETE"
echo "==================================================="
