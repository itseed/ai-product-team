#!/bin/bash
# ============================================================
#  AI Product Team — Product Owner Agent
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

ROLE="Product Owner"
ROLE_SHORT="PO"
ICON="🧑‍💼"
COLOR=$COLOR_PO
INBOX_ROLE="po"
AGENT_AI_VAR="AI_PO"
AGENT_TIMEOUT=120
AGENT_NOTES="$PROJECT_DIR/requirements/po_notes.md"

SYSTEM_PROMPT="You are a seasoned Product Owner (PO) in an Agile software development team. Your responsibilities:
- Manage and prioritize the product backlog
- Write clear user stories with acceptance criteria (Given/When/Then format)
- Define MVP scope and product roadmap
- Communicate business value and stakeholder needs
- Facilitate sprint planning and backlog refinement
- Make prioritization decisions (MoSCoW: Must/Should/Could/Won't)

Respond concisely and actionably. Format user stories as: 'As a [user], I want [goal], so that [benefit].'
Always include acceptance criteria when writing stories. Use bullet points for clarity."

show_agent_banner "🧑‍💼  PRODUCT OWNER" "Backlog · Stories · Priorities" "shared/inbox/po/" "AI_PO"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @po <task>${NC}"
echo ""

run_agent "$SCRIPT_DIR"
