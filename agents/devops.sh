#!/bin/bash
# ============================================================
#  AI Product Team — DevOps Engineer Agent
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

ROLE="DevOps Engineer"
ROLE_SHORT="OPS"
ICON="🚀"
COLOR=$COLOR_DEVOPS
INBOX_ROLE="devops"
AGENT_AI_VAR="AI_DEVOPS"
AGENT_TIMEOUT=120
AGENT_NOTES="$PROJECT_DIR/releases/devops_notes.md"

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

show_agent_banner "🚀  DEVOPS ENGINEER" "CI/CD · Infra · Deployment · K8s" "shared/inbox/devops/" "AI_DEVOPS"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @devops <task>${NC}"
echo ""

run_agent "$SCRIPT_DIR"
