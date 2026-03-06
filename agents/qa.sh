#!/bin/bash
# ============================================================
#  AI Product Team — QA Tester Agent
#  AI: Gemini | Role: Testing, Quality, Bug Reports
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

# Load web-dashboard saved paths (workspace + project root)
[[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
PROJECT_ROOT="${PROJECT_ROOT:-$WORKSPACE_DIR}"
export WORKSPACE_DIR PROJECT_ROOT

ROLE="QA Tester"
ROLE_SHORT="QA"
EMOJI="🧪"
COLOR=$COLOR_QA
AI=$AI_QA
INBOX_ROLE="qa"

get_system_prompt() {
  echo "You are a meticulous QA Engineer / Test Automation specialist. Your responsibilities:
- Design comprehensive test strategies (unit, integration, e2e, regression)
- Write detailed test cases with steps, expected vs actual results
- Perform exploratory testing and identify edge cases
- Write test automation scripts (prefer pytest, Jest, Cypress, or Playwright)
- Create clear bug reports with: Title, Steps to Reproduce, Expected, Actual, Severity, Environment
- Validate acceptance criteria from user stories
- Ensure cross-browser, accessibility, and performance checks

Bug report format:
🐛 BUG: [Title]
Severity: Critical/High/Medium/Low
Steps: 1. ... 2. ...
Expected: ...
Actual: ...

Be thorough — think like an adversarial user trying to break the system.

Project/codebase path: $WORKSPACE_DIR
Use this path when referencing files, suggesting test commands (pytest, jest, etc.), or in bug reports."
}

# ── Banner (AI model from config.sh) ─────────────────────────
clear
echo -e "${COLOR}"
cat << EOF
 ╔══════════════════════════════════════════════════╗
 ║         🧪  QA TESTER  AGENT                     ║
 ║══════════════════════════════════════════════════║
 ║  AI Model  : ${AI_QA}
 ║  Focus     : Testing · Quality · Bug Reports     ║
 ║  Inbox     : shared/inbox/qa/                    ║
 ╚══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @qa <task>${NC}"
echo -e "${GRAY}Project: ${WORKSPACE_DIR}${NC}"
echo ""

# ── Main loop ────────────────────────────────────────────────
while true; do
  # Re-load config and paths so dashboard changes apply without restart
  source "$SCRIPT_DIR/../config.sh"
  AI=$AI_QA
  [[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
  WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
  PROJECT_ROOT="${PROJECT_ROOT:-$WORKSPACE_DIR}"
  export WORKSPACE_DIR PROJECT_ROOT

  read_input "$INBOX_ROLE" "$COLOR" "$ROLE_SHORT" || break
  task="$AGENT_TASK"

  echo ""
  echo -e "${COLOR}┌─ 🧪 $ROLE testing... ─────────────────────────────┐${NC}"
  echo -e "${COLOR}│${NC}  ${GRAY}AI: $AI  ·  Project: $WORKSPACE_DIR${NC}"
  log_event "$ROLE" "$task"

  response=$(call_ai "$AI" "$(get_system_prompt)" "$task")

  echo -e "${COLOR}│${NC}"
  echo "$response" | while IFS= read -r line; do
    echo -e "${COLOR}│${NC}  $line"
  done
  echo -e "${COLOR}│${NC}"
  echo -e "${COLOR}└───────────────────────────────────────────────────┘${NC}"

  mkdir -p "$WORKSPACE_DIR/tests" 2>/dev/null
  {
    echo "## QA: $task"
    echo "Date: $(date)"
    echo ""
    echo "$response"
    echo ""
    echo "---"
  } >> "$WORKSPACE_DIR/tests/qa_notes.md" 2>/dev/null

  echo ""
done

echo -e "${COLOR}[$ROLE] Session ended.${NC}"
