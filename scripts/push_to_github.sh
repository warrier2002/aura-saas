#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# push_to_github.sh
# Run this script ONCE from your terminal to:
#   1. Install the GitHub CLI (gh)
#   2. Authenticate with GitHub
#   3. Create the remote repository
#   4. Push all code
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO_NAME="ntpl-crm"
REPO_DESC="Multi-Tenant SaaS CRM — Kubernetes, JWT Security, CI/CD (MCA 23ONMCR-753)"

echo "=================================================="
echo " NTPL CRM — GitHub Setup Script"
echo "=================================================="

# ── Step 1: Install GitHub CLI ─────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo "[1/4] Installing GitHub CLI..."
  (type -p wget >/dev/null || sudo apt-get install wget -y)
  sudo mkdir -p -m 755 /etc/apt/keyrings
  wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
  sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install gh -y
  echo "✓ GitHub CLI installed: $(gh --version | head -1)"
else
  echo "[1/4] GitHub CLI already installed: $(gh --version | head -1)"
fi

# ── Step 2: Authenticate with GitHub ──────────────────────────────────────
if ! gh auth status &>/dev/null; then
  echo "[2/4] Authenticating with GitHub..."
  echo "      (A browser window will open — log in with your GitHub account)"
  gh auth login --web --git-protocol https
else
  echo "[2/4] Already authenticated as: $(gh api user --jq .login)"
fi

GH_USER=$(gh api user --jq .login)
echo "      GitHub user: $GH_USER"

# ── Step 3: Create the remote repository ──────────────────────────────────
echo "[3/4] Creating GitHub repository: $GH_USER/$REPO_NAME"
if gh repo view "$GH_USER/$REPO_NAME" &>/dev/null; then
  echo "      Repository already exists — skipping creation."
else
  gh repo create "$REPO_NAME" \
    --public \
    --description "$REPO_DESC" \
    --homepage "https://github.com/$GH_USER/$REPO_NAME"
  echo "✓ Repository created: https://github.com/$GH_USER/$REPO_NAME"
fi

# ── Step 4: Update README badges to use real username ─────────────────────
sed -i "s/YOUR_USERNAME/$GH_USER/g" /home/harshit-sharma/Documents/Project/README.md
cd /home/harshit-sharma/Documents/Project
git add README.md
git commit --amend --no-edit 2>/dev/null || true

# ── Step 5: Set remote and push ────────────────────────────────────────────
echo "[4/4] Pushing code to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
git push -u origin main

echo ""
echo "=================================================="
echo " ✅ Done! Your repository is live."
echo ""
echo "  🔗 Repo URL:    https://github.com/$GH_USER/$REPO_NAME"
echo "  🔗 Actions:     https://github.com/$GH_USER/$REPO_NAME/actions"
echo ""
echo " NEXT STEPS — Add these repository secrets:"
echo "  Go to: https://github.com/$GH_USER/$REPO_NAME/settings/secrets/actions"
echo ""
echo "  Secret Name     │ Value"
echo "  ─────────────── │ ──────────────────────────────────────────────────"
echo "  JWT_SECRET      │ \$(python3 -c \"import secrets; print(secrets.token_hex(32))\")"
echo "  DEPLOY_SSH_KEY  │ (your server's private SSH key)"
echo "  DEPLOY_HOST     │ (your server IP or hostname)"
echo "  DEPLOY_USER     │ ubuntu (or your SSH username)"
echo "  DB_HOST         │ (PostgreSQL host)"
echo "  DB_USER         │ crm_user"
echo "  DB_PASSWORD     │ (your DB password)"
echo "  DB_NAME         │ crm_db"
echo ""
echo "  Variable Name   │ Value"
echo "  ─────────────── │ ──────────────────────────────────────────────────"
echo "  APP_URL         │ http://your-server-ip"
echo "  BACKEND_URL     │ http://your-server-ip:3001"
echo "=================================================="
