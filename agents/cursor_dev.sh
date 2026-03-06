#!/bin/bash
# ============================================================
#  AI Product Team — Developer Agent (Cursor Agent native)
#  Runs cursor agent interactively in the workspace pane
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

# Load web-dashboard saved paths (overrides defaults if set)
[[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"

WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
mkdir -p "$WORKSPACE_DIR"

# ── Banner ───────────────────────────────────────────────────
clear
echo -e "${COLOR_DEV}${BOLD}"
cat << 'EOF'
 ╔══════════════════════════════════════════════════╗
 ║         💻  DEVELOPER  AGENT                     ║
 ║══════════════════════════════════════════════════║
 ║  Powered by  : cursor agent (interactive)        ║
 ║  Tools       : File Write · Bash · Read · Edit   ║
 ║  Focus       : Code · Implementation · Tests     ║
 ╚══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Workspace: ${WORKSPACE_DIR}${NC}"
echo -e "${GRAY}Launching cursor agent... (Ctrl+C to exit)${NC}"
echo ""

# ── Hand off to cursor agent interactively ───────────────────
cd "$WORKSPACE_DIR"
exec cursor agent \
  --workspace "$WORKSPACE_DIR"
