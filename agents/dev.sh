#!/bin/bash
# ============================================================
#  AI Product Team — Developer Agent
#  AI: configured via config.sh (AI_DEV)
#  Supports: claude (--dangerously-skip-permissions) | cursor | gemini
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
[[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
WORKSPACE_DIR="${WORKSPACE_DIR:-$PROJECT_DIR/code}"
export WORKSPACE_DIR

ROLE="Developer"
ROLE_SHORT="DEV"
ICON="💻"
COLOR=$COLOR_DEV
INBOX_ROLE="dev"
AGENT_AI_VAR="AI_DEV"
AGENT_TIMEOUT=300
AGENT_NOTES="$WORKSPACE_DIR/dev_notes.md"

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

# Custom AI call: claude uses --dangerously-skip-permissions for file write access
custom_ai_call() {
  local ai="$1" system="$2" input="$3" timeout_sec="$4"
  local full_prompt="$system

User request: $input"

  cd "$WORKSPACE_DIR" 2>/dev/null

  case "$ai" in
    claude)
      timeout "$timeout_sec" "$CLAUDE_CMD" --dangerously-skip-permissions -p "$full_prompt" 2>&1
      ;;
    cursor)
      echo "$full_prompt" | timeout "$timeout_sec" cursor agent --print 2>/dev/null \
        || echo "[Error] Cursor agent unavailable. Run: cursor agent login"
      ;;
    *)
      call_ai_timeout "$ai" "$system" "$input" "$timeout_sec"
      ;;
  esac

  cd "$SCRIPT_DIR" 2>/dev/null
}

mkdir -p "$WORKSPACE_DIR"

show_agent_banner "💻  DEVELOPER" "Code · Implementation · Tests" "shared/inbox/dev/" "AI_DEV"
echo -e "${GRAY}Commands: type task  │  'inbox' check inbox  │  'workspace' show dir  │  'exit' quit${NC}"
echo -e "${GRAY}Coordinator can route tasks here with: @dev <task>${NC}"
echo -e "${GRAY}Workspace: ${WORKSPACE_DIR}${NC}"
[[ "$AI_DEV" == "claude" ]] && echo -e "${GRAY}Mode: claude --dangerously-skip-permissions (file write enabled)${NC}"
[[ "$AI_DEV" == "cursor" ]] && echo -e "${GRAY}Tip: run 'cursor agent login' if auth fails${NC}"
echo ""

run_agent "$SCRIPT_DIR"
