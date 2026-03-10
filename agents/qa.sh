#!/bin/bash
# ============================================================
#  AI Product Team — QA Tester Agent
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
[[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
export WORKSPACE_DIR

ROLE="QA Tester"
ROLE_SHORT="QA"
ICON="🧪"
COLOR=$COLOR_QA
INBOX_ROLE="qa"
AGENT_AI_VAR="AI_QA"
AGENT_TIMEOUT=120
AGENT_NOTES="$WORKSPACE_DIR/tests/qa_notes.md"

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
Project/codebase path: $WORKSPACE_DIR"
}

show_agent_banner "🧪  QA TESTER" "Testing · Quality · Bug Reports" "shared/inbox/qa/" "AI_QA"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @qa <task>${NC}"
echo -e "${GRAY}Project: ${WORKSPACE_DIR}${NC}"
echo ""

run_agent "$SCRIPT_DIR"
