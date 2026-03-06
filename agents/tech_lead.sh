#!/bin/bash
# ============================================================
#  AI Product Team — Tech Lead Agent
#  AI: Claude | Role: Architecture, Code Review, Tech Decisions
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

ROLE="Tech Lead"
ROLE_SHORT="TECH"
EMOJI="🏗️"
COLOR=$COLOR_TECH
AI=$AI_TECH
INBOX_ROLE="tech"

SYSTEM_PROMPT="You are an experienced Tech Lead in a software development team. Your responsibilities:
- Design system architecture and make technical decisions
- Conduct code reviews and enforce coding standards
- Break down technical requirements into implementable tasks
- Evaluate technology choices (frameworks, libraries, patterns)
- Identify technical debt and risks
- Mentor developers and ensure engineering best practices
- Create technical specifications and architecture diagrams (as ASCII/text)

Respond with precise technical guidance. Use concrete examples, code snippets when helpful.
Format architecture with clear component breakdowns. Flag risks explicitly with ⚠️."

# ── Banner (AI model from config.sh) ─────────────────────────
clear
echo -e "${COLOR}"
cat << EOF
 ╔══════════════════════════════════════════════════╗
 ║         🏗️  TECH LEAD  AGENT                    ║
 ║══════════════════════════════════════════════════║
 ║  AI Model  : ${AI_TECH}
 ║  Focus     : Architecture · Code Review · Tech   ║
 ║  Inbox     : shared/inbox/tech/                  ║
 ╚══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @tech <task>${NC}"
echo ""

# ── Main loop ────────────────────────────────────────────────
while true; do
  # Re-load config so dashboard Agent Config changes apply without restart
  source "$SCRIPT_DIR/../config.sh"
  AI=$AI_TECH

  read_input "$INBOX_ROLE" "$COLOR" "$ROLE_SHORT" || break
  task="$AGENT_TASK"

  echo ""
  echo -e "${COLOR}┌─ 🏗️  $ROLE analyzing... ─────────────────────────┐${NC}"
  echo -e "${COLOR}│${NC}  ${GRAY}AI: $AI${NC}"
  log_event "$ROLE" "$task"

  response=$(call_ai "$AI" "$SYSTEM_PROMPT" "$task")

  echo -e "${COLOR}│${NC}"
  echo "$response" | while IFS= read -r line; do
    echo -e "${COLOR}│${NC}  $line"
  done
  echo -e "${COLOR}│${NC}"
  echo -e "${COLOR}└───────────────────────────────────────────────────┘${NC}"

  {
    echo "## Tech Lead: $task"
    echo "Date: $(date)"
    echo ""
    echo "$response"
    echo ""
    echo "---"
  } >> "$PROJECT_DIR/architecture/tech_notes.md" 2>/dev/null

  # Workflow handoff: write for review if this was a workflow task
  if [[ -n "$WORKFLOW_ID" && -n "$HANDOFF_TO" ]]; then
    mkdir -p "$SHARED_DIR/workflow"
    handoff_file="$SHARED_DIR/workflow/${WORKFLOW_ID}_tech.handoff"
    {
      echo "HANDOFF_TO=$HANDOFF_TO"
      echo "---TASK---"
      echo "$task"
      echo "---OUTPUT---"
      echo "$response"
    } > "$handoff_file"
  fi

  echo ""
done

echo -e "${COLOR}[$ROLE] Session ended.${NC}"
