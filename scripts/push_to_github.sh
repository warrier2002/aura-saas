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

REPO_NAME="aura-saas"
REPO_DESC="Multi-Tenant SaaS CRM — Kubernetes, JWT Security, CI/CD (MCA 23ONMCR-753)"

echo "=================================================="
echo " Aura SaaS — GitHub Setup Script"
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
echo "  Secret Name            │ Value"
echo "  ────────────────────── │ ──────────────────────────────────────────────────"
echo "  AWS_ACCESS_KEY_ID      │ (your AWS IAM access key)"
echo "  AWS_SECRET_ACCESS_KEY  │ (your AWS IAM secret key)"
echo "  AWS_REGION             │ e.g. us-east-1"
echo ""
echo "  That's it! Terraform handles generating all other secrets (JWT,"
echo "  Passwords, SSH Keys) dynamically on deployment!"
echo "=================================================="
