#!/bin/bash
# ============================================================
#  AI Product Team — Developer Agent
#  AI: Cursor Agent | Role: Implementation, Code, Unit Tests
#  cursor agent --print has FULL tool access:
#    - Writes files directly to workspace
#    - Runs bash commands
#    - Reads/edits existing files
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

# Load web-dashboard saved paths (workspace + project root)
[[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"

ROLE="Developer"
ROLE_SHORT="DEV"
EMOJI="💻"
COLOR=$COLOR_DEV
AI=$AI_DEV
INBOX_ROLE="dev"

# Workspace where Cursor Agent will write code files
WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
export WORKSPACE_DIR

get_system_prompt() {
  echo "You are a skilled Full-Stack Developer powered by Cursor Agent. You have FULL tool access — you can write files, run bash, and edit code directly.

Your responsibilities:
- Implement features based on user stories and technical specs
- Write clean, maintainable, well-structured code INTO FILES (don't just print code)
- Create unit tests alongside implementation files
- Follow SOLID principles, DRY, and clean code practices
- Optimize performance and ensure code security
- Fix bugs by reading the actual file, finding the issue, and patching it

When given a task:
1. Think about the file structure first
2. WRITE the actual files using your file tools (not just print code blocks)
3. Run a quick sanity check with bash if applicable
4. Report what files were created/modified

Working directory: $WORKSPACE_DIR"
}

# ── Banner (AI model from config.sh) ─────────────────────────
clear
echo -e "${COLOR}"
cat << EOF
 ╔══════════════════════════════════════════════════╗
 ║         💻  DEVELOPER  AGENT                     ║
 ║══════════════════════════════════════════════════║
 ║  AI Model  : ${AI_DEV}
 ║  Tools     : File Write · Bash · Read · Edit     ║
 ║  Focus     : Code · Implementation · Tests       ║
 ║  Inbox     : shared/inbox/dev/                   ║
 ╚══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'workspace' show dir  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @dev <task>${NC}"
echo -e "${GRAY}Workspace: ${WORKSPACE_DIR}${NC}"
if [[ "$AI_DEV" == "cursor" ]]; then
  echo -e "${GRAY}Tip: ถ้า Cursor ขึ้น error login → พิมพ์ exit แล้วรัน: cursor agent login${NC}"
fi
echo ""

# Ensure workspace exists
mkdir -p "$WORKSPACE_DIR"

# ── Main loop ────────────────────────────────────────────────
while true; do
  # Re-load config and paths so dashboard changes apply without restart
  source "$SCRIPT_DIR/../config.sh"
  AI=$AI_DEV
  [[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
  WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
  export WORKSPACE_DIR

  read_input "$INBOX_ROLE" "$COLOR" "$ROLE_SHORT" || break
  task="$AGENT_TASK"
  [[ "$task" == "workspace" ]] && { echo -e "${GRAY}$WORKSPACE_DIR${NC}"; ls "$WORKSPACE_DIR" 2>/dev/null; continue; }

  echo ""
  echo -e "${COLOR}┌─ 💻 $ROLE (Cursor Agent) working... ─────────────┐${NC}"
  echo -e "${COLOR}│${NC}  ${GRAY}AI: $AI  ·  Workspace: $WORKSPACE_DIR${NC}"
  echo -e "${COLOR}│${NC}"
  log_event "$ROLE" "$task"

  # Run cursor agent in the code workspace
  # It will write files directly there
  cd "$WORKSPACE_DIR" 2>/dev/null
  response=$(call_ai "$AI" "$(append_skills "$(get_system_prompt)" "$INBOX_ROLE")" "$task")
  cd "$SCRIPT_DIR" 2>/dev/null

  echo "$response" | while IFS= read -r line; do
    echo -e "${COLOR}│${NC}  $line"
  done
  echo -e "${COLOR}│${NC}"
  echo -e "${COLOR}└───────────────────────────────────────────────────┘${NC}"

  # Workflow handoff: write for review if this was a workflow task
  if [[ -n "$WORKFLOW_ID" && -n "$HANDOFF_TO" ]]; then
    mkdir -p "$SHARED_DIR/workflow"
    handoff_file="$SHARED_DIR/workflow/${WORKFLOW_ID}_dev.handoff"
    {
      echo "HANDOFF_TO=$HANDOFF_TO"
      echo "---TASK---"
      echo "$task"
      echo "---OUTPUT---"
      echo "$response"
    } > "$handoff_file"
    log_event "$ROLE" "Workflow $WORKFLOW_ID → handoff to $HANDOFF_TO"
  fi

  # Show what files were created/modified
  echo -e "${COLOR}📁 Files in workspace:${NC}"
  ls -lh "$WORKSPACE_DIR" 2>/dev/null | tail -10 | while IFS= read -r line; do
    echo -e "   ${GRAY}$line${NC}"
  done

  # Log
  {
    echo "## Developer (Cursor): $task"
    echo "Date: $(date)"
    echo ""
    echo "$response"
    echo ""
    echo "---"
  } >> "$WORKSPACE_DIR/dev_notes.md" 2>/dev/null

  echo ""
done

echo -e "${COLOR}[$ROLE] Session ended.${NC}"
