#!/bin/bash
# ============================================================
#  AI Product Team — Developer Agent
#  AI: configured via config.sh (AI_DEV)
#  Role: Implementation, Code, Bug Fixes, Unit Tests
#  Supports: claude (--dangerously-skip-permissions) | cursor | gemini
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

# Workspace where the agent will write code files
WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
export WORKSPACE_DIR

get_system_prompt() {
  echo "You are a Full-Stack Developer with FULL tool access — you can write files, run bash, and edit code directly.

Working directory: $WORKSPACE_DIR

CRITICAL RULES:
1. ALWAYS write actual files to disk using your Write/Edit tools — never just print code blocks
2. If asked to build something, create the file immediately at the specified path
3. Fix bugs by reading the file first, then patching the exact issue
4. After writing files, confirm with: 'Created: <filename> (<size>)'

Task types you handle:
- Build new features / pages / components → write files
- Fix bugs from QA → read file, patch, confirm fix
- Refactor code → edit in-place
- API integration → implement + test

Keep responses concise — just do the work and report what was done."
}

# ── Banner (AI model from config.sh) ─────────────────────────
clear
echo -e "${COLOR}"
cat << EOF
 ╔══════════════════════════════════════════════════╗
 ║         💻  DEVELOPER  AGENT                     ║
 ║══════════════════════════════════════════════════║
 ║  AI Model  : ${AI_DEV}
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
if [[ "$AI_DEV" == "claude" ]]; then
  echo -e "${GRAY}Mode: claude --dangerously-skip-permissions (file write enabled)${NC}"
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
  echo -e "${COLOR}┌─ 💻 $ROLE working... ────────────────────────────┐${NC}"
  echo -e "${COLOR}│${NC}  ${GRAY}AI: $AI  ·  Workspace: $WORKSPACE_DIR${NC}"
  echo -e "${COLOR}│${NC}"
  log_event "$ROLE" "$task"

  # Run agent in the code workspace with full file-write access
  cd "$WORKSPACE_DIR" 2>/dev/null
  if [[ "$AI" == "claude" ]]; then
    # --dangerously-skip-permissions lets claude use file tools without prompting
    full_prompt="$(append_skills "$(get_system_prompt)" "$INBOX_ROLE")

User request: $task"
    echo -e "${COLOR}│${NC}  ${GRAY}Running with file-write access...${NC}"
    response=$("$CLAUDE_CMD" --dangerously-skip-permissions -p "$full_prompt" 2>&1)
    # Detect error and retry once
    if echo "$response" | grep -q "^\[Error\]\|unavailable\|not found"; then
      echo -e "${COLOR}│${NC}  ${GRAY}Retrying...${NC}"
      sleep 2
      response=$("$CLAUDE_CMD" --dangerously-skip-permissions -p "$full_prompt" 2>&1) \
        || response="[Error] Claude CLI unavailable after retry"
    fi
  else
    response=$(call_ai "$AI" "$(append_skills "$(get_system_prompt)" "$INBOX_ROLE")" "$task")
  fi
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
    echo "## Developer ($AI): $task"
    echo "Date: $(date)"
    echo ""
    echo "$response"
    echo ""
    echo "---"
  } >> "$WORKSPACE_DIR/dev_notes.md" 2>/dev/null

  echo ""
done

echo -e "${COLOR}[$ROLE] Session ended.${NC}"
