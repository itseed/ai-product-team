#!/bin/bash
# Initialize shared workspace directories

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

source "$ROOT_DIR/config.sh"

echo -e "${BOLD}Setting up shared workspace...${NC}"

mkdir -p "$INBOX_DIR"/{po,tech,dev,qa,devops,all}
mkdir -p "$LOGS_DIR"
mkdir -p "$PROJECT_DIR"/{requirements,architecture,code,tests,docs,releases}
mkdir -p "$SHARED_DIR/workflow"

# Init team log
if [[ ! -f "$LOGS_DIR/team.log" ]]; then
  echo "=== AI Product Team Log ===" > "$LOGS_DIR/team.log"
  echo "Started: $(date)"           >> "$LOGS_DIR/team.log"
  echo "=========================="  >> "$LOGS_DIR/team.log"
fi

echo -e "${GREEN}✓${NC} Inbox directories created"
echo -e "${GREEN}✓${NC} Project workspace created"
echo -e "${GREEN}✓${NC} Logs initialized"
echo ""
echo -e "${GRAY}Workspace: $SHARED_DIR${NC}"
