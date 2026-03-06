#!/bin/bash
# ============================================================
#  AI Product Team - Global Configuration
# ============================================================

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Role colors
COLOR_PO=$CYAN
COLOR_TECH=$BLUE
COLOR_DEV=$GREEN
COLOR_QA=$YELLOW
COLOR_DEVOPS=$MAGENTA
COLOR_COORD=$WHITE

# ── Paths ────────────────────────────────────────────────────
TEAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="$TEAM_DIR/shared"
INBOX_DIR="$SHARED_DIR/inbox"
LOGS_DIR="$SHARED_DIR/logs"
PROJECT_DIR="$SHARED_DIR/project"
AGENTS_DIR="$TEAM_DIR/agents"

# ── AI Assignments ───────────────────────────────────────────
CLAUDE_CMD="claude"
GEMINI_CMD="gemini"

# Role → AI model assignments
AI_PO="gemini"          # Product Owner    → Claude
AI_TECH="cursor"        # Tech Lead        → Claude
AI_DEV="cursor"         # Developer        → Cursor Agent (writes files!)
AI_QA="gemini"          # QA Tester        → Gemini
AI_DEVOPS="claude"      # DevOps           → Claude

# ── tmux Session ─────────────────────────────────────────────
SESSION="ai_team"
TERM_WIDTH=220
TERM_HEIGHT=55

# ── Helper: call AI ──────────────────────────────────────────
# Usage: call_ai "ai_name" "system_prompt" "user_input"
call_ai() {
  local ai="$1"
  local system="$2"
  local input="$3"
  local full_prompt="$system

User request: $input"

  case "$ai" in
    claude)
      # Try -p first (more reliable); fallback to --print
      "$CLAUDE_CMD" -p "$full_prompt" 2>/dev/null \
        || (echo "$full_prompt" | "$CLAUDE_CMD" --print 2>/dev/null) \
        || echo "[Error] Claude CLI unavailable"
      ;;
    gemini)
      "$GEMINI_CMD" -p "$full_prompt" 2>/dev/null \
        || (echo "$full_prompt" | "$GEMINI_CMD" 2>/dev/null) \
        || echo "[Error] Gemini CLI unavailable"
      ;;
    cursor)
      # cursor agent --print: headless mode, full tools (write files, bash, edit)
      # Used when routing tasks from coordinator → dev pane via file inbox
      cd "${WORKSPACE_DIR:-$PROJECT_DIR/code}" 2>/dev/null
      echo "$full_prompt" | cursor agent --print 2>/dev/null \
        || echo "[Error] Cursor agent ยังไม่ login. วิธีแก้: (1) ใน pane Developer พิมพ์ exit แล้วรัน: cursor agent login จากนั้นรัน agent ใหม่ หรือ (2) ไป Dashboard → Agent Config เปลี่ยน Developer เป็น claude/gemini"
      ;;
    *)
      echo "[Error] Unknown AI: $ai"
      ;;
  esac
}

# ── Helper: draw box border ──────────────────────────────────
draw_box() {
  local color="$1"
  local title="$2"
  local subtitle="$3"
  local width=50

  local pad_title=$(( (width - ${#title} - 2) / 2 ))
  local pad_sub=$(( (width - ${#subtitle} - 2) / 2 ))

  echo -e "${color}┌$(printf '─%.0s' $(seq 1 $width))┐${NC}"
  printf "${color}│%*s${BOLD}%s%*s${NC}${color}│${NC}\n" \
    $pad_title "" "$title" $pad_title ""
  printf "${color}│%*s${DIM}%s%*s${NC}${color}│${NC}\n" \
    $pad_sub "" "$subtitle" $pad_sub ""
  echo -e "${color}└$(printf '─%.0s' $(seq 1 $width))┘${NC}"
}

# ── Helper: log event ────────────────────────────────────────
log_event() {
  local role="$1"
  local msg="$2"
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$ts] [$role] $msg" >> "$LOGS_DIR/team.log" 2>/dev/null
}

# ── Helper: write to inbox ───────────────────────────────────
send_task() {
  local target="$1"
  local sender="$2"
  local task="$3"
  local ts
  ts=$(date +%s%N)
  local file="$INBOX_DIR/$target/${ts}.task"
  echo "FROM: $sender"    > "$file"
  echo "TIME: $(date)"   >> "$file"
  echo "TASK: $task"     >> "$file"
  echo "Sent task to @$target inbox"
}

# ── Helper: check & read inbox ───────────────────────────────
check_inbox() {
  local role="$1"
  local dir="$INBOX_DIR/$role"
  local tasks=()

  while IFS= read -r -d '' f; do
    tasks+=("$f")
  done < <(find "$dir" -maxdepth 1 -name '*.task' -print0 2>/dev/null | sort -z)

  if [[ ${#tasks[@]} -gt 0 ]]; then
    echo "${tasks[0]}"  # return oldest task
  fi
}

# ── Helper: mark task done ───────────────────────────────────
mark_done() {
  local file="$1"
  [[ -f "$file" ]] && mv "$file" "${file%.task}.done"
}

# ── Helper: read with inbox polling ──────────────────────────
# Polls inbox every 3 s so web-dispatched tasks are received
# without the user pressing Enter.
#
# Usage:  read_input ROLE COLOR SHORT_NAME
# Output: sets AGENT_TASK and AGENT_TASK_SOURCE ("inbox"|"user")
# Returns: 0 = task ready, 1 = user typed exit/quit
read_input() {
  local role="$1" color="$2" short="$3"
  AGENT_TASK="" AGENT_TASK_SOURCE=""

  while true; do
    # ── Check inbox (web / coordinator tasks) ────────────
    local inbox_file
    inbox_file=$(check_inbox "$role")
    if [[ -n "$inbox_file" ]]; then
      local sender task
      sender=$(grep "^FROM:" "$inbox_file" 2>/dev/null | sed 's/^FROM: //')
      # Full multiline task (from TASK: until WORKFLOW_ID:/HANDOFF_TO: or end)
      task=$(awk '/^TASK: /{p=1; sub(/^TASK: /,""); if(length) print; next} p{if(/^WORKFLOW_ID:|^HANDOFF_TO:/) exit; print}' "$inbox_file" 2>/dev/null)
      WORKFLOW_ID=$(grep "^WORKFLOW_ID:" "$inbox_file" 2>/dev/null | sed 's/^WORKFLOW_ID: //')
      HANDOFF_TO=$(grep "^HANDOFF_TO:" "$inbox_file" 2>/dev/null | sed 's/^HANDOFF_TO: //')
      export WORKFLOW_ID HANDOFF_TO
      mark_done "$inbox_file"
      echo -e "\n${color}╔═ 📨 TASK FROM: ${sender} ══════════════════════════╗${NC}"
      printf '%s\n' "$task" | while IFS= read -r line; do echo -e "${color}║${NC}  $line"; done
      echo -e "${color}╚══════════════════════════════════════════════════╝${NC}\n"
      AGENT_TASK="$task"
      AGENT_TASK_SOURCE="inbox"
      return 0
    fi

    # ── Wait for keyboard input (3 s timeout) ───────────
    echo -ne "${color}[${short}]${NC} ❯ "
    if IFS= read -r -t 3 AGENT_TASK 2>/dev/null; then
      [[ "$AGENT_TASK" == "exit" || "$AGENT_TASK" == "quit" ]] && return 1
      [[ -z "$AGENT_TASK" ]] && { echo -ne "\r\033[2K"; continue; }
      AGENT_TASK_SOURCE="user"
      return 0
    else
      # Timeout — erase prompt, loop back to check inbox
      echo -ne "\r\033[2K"
    fi
  done
}
