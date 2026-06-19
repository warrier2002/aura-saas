#!/bin/bash

# run_demo.sh
# Automates the setup and execution of the local Flask demonstration application.

# Set strict execution bounds
set -euo pipefail

# Visual markers
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0;0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}   Aura SaaS Multi-Tenant Demo App Launcher                         ${NC}"
echo -e "${BLUE}   Developed for Chandigarh University MCA Major Project (23ONMCR-753)${NC}"
echo -e "${BLUE}===================================================================${NC}"

# Detect root workspace directory path
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORKSPACE_DIR"

# Check for Python virtual environment
PYTHON_EXEC="python3"

if [ -d "venv" ]; then
    echo -e "${GREEN}[✔] Python virtual environment detected at ./venv${NC}"
    if [ -f "venv/bin/python" ]; then
        PYTHON_EXEC="$WORKSPACE_DIR/venv/bin/python"
    elif [ -f "venv/Scripts/python.exe" ]; then
        # Windows compatibility
        PYTHON_EXEC="$WORKSPACE_DIR/venv/Scripts/python.exe"
    fi
else
    echo -e "${YELLOW}[!] Virtual environment not detected in workspace. Falling back to system python3.${NC}"
fi

# Validate Python availability
if ! command -v "$PYTHON_EXEC" &> /dev/null; then
    echo -e "${RED}[✘] Error: Python was not found. Please install Python 3 to run the local mock app.${NC}"
    exit 1
fi

echo -e "${GREEN}[✔] Using interpreter: $($PYTHON_EXEC --version)${NC}"

# Ensure Flask is installed
echo -e "${BLUE}[*] Verifying/installing dependencies...${NC}"
$PYTHON_EXEC -m pip install --upgrade pip
$PYTHON_EXEC -m pip install flask

# Run the Flask App
echo -e "\n${GREEN}[✔] Dependencies verified successfully.${NC}"
echo -e "${YELLOW}[*] Starting Flask server on http://localhost:5000...${NC}"
echo -e "${YELLOW}[*] Open your web browser and navigate to: http://localhost:5000${NC}"
echo -e "${BLUE}-------------------------------------------------------------------${NC}"

# Launch server
$PYTHON_EXEC assignment.py
