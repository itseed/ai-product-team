#!/bin/bash
# ============================================================
#  AI Product Team — Product Owner Agent
#  AI: Claude | Role: Backlog, Requirements, Priorities
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

ROLE="Product Owner"
ROLE_SHORT="PO"
EMOJI="🧑‍💼"
COLOR=$COLOR_PO
AI=$AI_PO
INBOX_ROLE="po"

SYSTEM_PROMPT="You are a seasoned Product Owner (PO) in an Agile software development team. Your responsibilities:
- Manage and prioritize the product backlog
- Write clear user stories with acceptance criteria (Given/When/Then format)
- Define MVP scope and product roadmap
- Communicate business value and stakeholder needs
- Facilitate sprint planning and backlog refinement
- Make prioritization decisions (MoSCoW: Must/Should/Could/Won't)

Respond concisely and actionably. Format user stories as: 'As a [user], I want [goal], so that [benefit].'
Always include acceptance criteria when writing stories. Use bullet points for clarity."

# ── Banner (AI model from config.sh) ─────────────────────────
clear
echo -e "${COLOR}"
cat << EOF
 ╔══════════════════════════════════════════════════╗
 ║         🧑‍💼  PRODUCT OWNER  AGENT               ║
 ║══════════════════════════════════════════════════║
 ║  AI Model  : ${AI_PO}
 ║  Focus     : Backlog · Stories · Priorities      ║
 ║  Inbox     : shared/inbox/po/                    ║
 ╚══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @po <task>${NC}"
echo ""

# ── Main loop ────────────────────────────────────────────────
while true; do
  # Re-load config so dashboard Agent Config changes apply without restart
  source "$SCRIPT_DIR/../config.sh"
  AI=$AI_PO

  read_input "$INBOX_ROLE" "$COLOR" "$ROLE_SHORT" || break
  task="$AGENT_TASK"

  echo ""
  echo -e "${COLOR}┌─ 🧑‍💼 $ROLE thinking... ──────────────────────────┐${NC}"
  echo -e "${COLOR}│${NC}  ${GRAY}AI: $AI${NC}"
  log_event "$ROLE" "$task"

  # Call AI
  response=$(call_ai "$AI" "$SYSTEM_PROMPT" "$task")

  echo -e "${COLOR}│${NC}"
  echo "$response" | while IFS= read -r line; do
    echo -e "${COLOR}│${NC}  $line"
  done
  echo -e "${COLOR}│${NC}"
  echo -e "${COLOR}└───────────────────────────────────────────────────┘${NC}"

  # Save to project docs
  {
    echo "## PO: $task"
    echo "Date: $(date)"
    echo ""
    echo "$response"
    echo ""
    echo "---"
  } >> "$PROJECT_DIR/requirements/po_notes.md" 2>/dev/null

  # Workflow handoff: write for review if this was a workflow task
  if [[ -n "$WORKFLOW_ID" && -n "$HANDOFF_TO" ]]; then
    mkdir -p "$SHARED_DIR/workflow"
    handoff_file="$SHARED_DIR/workflow/${WORKFLOW_ID}_po.handoff"
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
