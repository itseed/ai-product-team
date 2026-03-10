#!/bin/bash
# ============================================================
#  AI Product Team — Tech Lead Agent
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

ROLE="Tech Lead"
ROLE_SHORT="TECH"
ICON="🏗️"
COLOR=$COLOR_TECH
INBOX_ROLE="tech"
AGENT_AI_VAR="AI_TECH"
AGENT_TIMEOUT=120
AGENT_NOTES="$PROJECT_DIR/architecture/tech_notes.md"

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

show_agent_banner "🏗️  TECH LEAD" "Architecture · Code Review · Tech" "shared/inbox/tech/" "AI_TECH"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @tech <task>${NC}"
echo ""

run_agent "$SCRIPT_DIR"
