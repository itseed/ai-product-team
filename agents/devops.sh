#!/bin/bash
# ============================================================
#  AI Product Team — DevOps Engineer Agent
#  AI: Claude | Role: CI/CD, Infrastructure, Deployment
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

ROLE="DevOps Engineer"
ROLE_SHORT="OPS"
EMOJI="🚀"
COLOR=$COLOR_DEVOPS
AI=$AI_DEVOPS
INBOX_ROLE="devops"

SYSTEM_PROMPT="You are a senior DevOps / Platform Engineer in an Agile team. Your responsibilities:
- Design and maintain CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Manage infrastructure as code (Terraform, Pulumi, CDK)
- Container orchestration (Docker, Kubernetes, Helm)
- Cloud platforms (AWS, GCP, Azure)
- Monitoring & observability (Prometheus, Grafana, Datadog, ELK)
- Security scanning, secrets management, compliance
- Deployment strategies: blue/green, canary, rolling updates
- Incident response and on-call runbooks

When providing solutions:
- Include actual config files/scripts (YAML, Dockerfile, etc.)
- Always consider security best practices
- Flag ⚠️ potential pitfalls or breaking changes
- Suggest monitoring/alerting for new deployments
Be pragmatic — production reliability is the top priority."

# ── Banner (AI model from config.sh) ─────────────────────────
clear
echo -e "${COLOR}"
cat << EOF
 ╔══════════════════════════════════════════════════╗
 ║         🚀  DEVOPS ENGINEER  AGENT               ║
 ║══════════════════════════════════════════════════║
 ║  AI Model  : ${AI_DEVOPS}
 ║  Focus     : CI/CD · Infra · Deployment · K8s    ║
 ║  Inbox     : shared/inbox/devops/                ║
 ╚══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @devops <task>${NC}"
echo ""

# ── Main loop ────────────────────────────────────────────────
while true; do
  # Re-load config so dashboard Agent Config changes apply without restart
  source "$SCRIPT_DIR/../config.sh"
  AI=$AI_DEVOPS

  read_input "$INBOX_ROLE" "$COLOR" "$ROLE_SHORT" || break
  task="$AGENT_TASK"

  echo ""
  echo -e "${COLOR}┌─ 🚀 $ROLE deploying... ───────────────────────────┐${NC}"
  echo -e "${COLOR}│${NC}  ${GRAY}AI: $AI${NC}"
  log_event "$ROLE" "$task"

  response=$(call_ai "$AI" "$(append_skills "$SYSTEM_PROMPT" "$INBOX_ROLE")" "$task")

  echo -e "${COLOR}│${NC}"
  echo "$response" | while IFS= read -r line; do
    echo -e "${COLOR}│${NC}  $line"
  done
  echo -e "${COLOR}│${NC}"
  echo -e "${COLOR}└───────────────────────────────────────────────────┘${NC}"

  {
    echo "## DevOps: $task"
    echo "Date: $(date)"
    echo ""
    echo "$response"
    echo ""
    echo "---"
  } >> "$PROJECT_DIR/releases/devops_notes.md" 2>/dev/null

  echo ""
done

echo -e "${COLOR}[$ROLE] Session ended.${NC}"
