#!/bin/bash

# simulate_load.sh
# Sends continuous concurrent requests to the backend server to simulate CPU load spike and validate HPA scaling metrics.

set -euo pipefail

# Visual markers
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===============================================================${NC}"
echo -e "${BLUE}   NTPL SaaS Multi-Tenant Backend Load Simulator               ${NC}"
echo -e "${BLUE}   Simulating traffic load for HPA validation                  ${NC}"
echo -e "${BLUE}===============================================================${NC}"

# Target URL validation
TARGET_URL="http://localhost:5000/get_items"
CONCURRENCY=10
DURATION=30

usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -u, --url <url>          Target API endpoint (default: $TARGET_URL)"
    echo "  -c, --concurrency <num>   Number of concurrent load loops (default: $CONCURRENCY)"
    echo "  -d, --duration <sec>     Stress test duration in seconds (default: $DURATION)"
    exit 1
}

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url) TARGET_URL="$2"; shift 2 ;;
        -c|--concurrency) CONCURRENCY="$2"; shift 2 ;;
        -d|--duration) DURATION="$2"; shift 2 ;;
        *) usage ;;
    esac
done

echo -e "${YELLOW}[*] Target Endpoint:${NC} $TARGET_URL"
echo -e "${YELLOW}[*] Concurrency Rate:${NC} $CONCURRENCY loops"
echo -e "${YELLOW}[*] Duration Limit:${NC} $DURATION seconds"

# Verify curl is present
if ! command -v curl &> /dev/null; then
    echo -e "${RED}[✘] Error: curl command utility is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}[✔] Stress testing initiated. Spawning background workers...${NC}"

# Worker execution loop
stress_worker() {
    local worker_id=$1
    local end_time=$((SECONDS + DURATION))
    local count=0
    
    while [ $SECONDS -lt $end_time ]; do
        # Make request passing tenant context header randomly to spread queries
        local tenant="a"
        if [ $((count % 2)) -eq 0 ]; then
            tenant="b"
        fi
        
        curl -s -o /dev/null -w "%{http_code}" -H "X-Tenant-ID: $tenant" "$TARGET_URL" &> /dev/null || true
        count=$((count + 1))
    done
    echo -e "${GREEN}[✔] Worker $worker_id complete. Sent $count queries.${NC}"
}

# Spawn parallel loops
pids=()
for ((i=1; i<=CONCURRENCY; i++)); do
    stress_worker "$i" &
    pids+=($!)
done

# Wait for all background requests to conclude
echo -e "${YELLOW}[*] Workers running. Press Ctrl+C to terminate stress test early.${NC}"
for pid in "${pids[@]}"; do
    wait "$pid"
done

echo -e "${GREEN}===============================================================${NC}"
echo -e "${GREEN}[✔] Stress test simulation completed successfully.           ${NC}"
echo -e "${GREEN}===============================================================${NC}"
