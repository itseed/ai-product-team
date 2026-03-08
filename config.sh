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
# Waits for user input while a background watcher polls the inbox
# every 2 s. When a task arrives, SIGUSR1 interrupts blocking read
# so the user's prompt is never cleared on a timer.
#
# Usage:  read_input ROLE COLOR SHORT_NAME
# Output: sets AGENT_TASK and AGENT_TASK_SOURCE ("inbox"|"user")
# Returns: 0 = task ready, 1 = user typed exit/quit or EOF
read_input() {
  local role="$1" color="$2" short="$3"
  AGENT_TASK="" AGENT_TASK_SOURCE=""
  WORKFLOW_ID="" HANDOFF_TO=""

  while true; do
    # ── Check inbox immediately before prompting ─────────
    local inbox_file
    inbox_file=$(check_inbox "$role")
    if [[ -n "$inbox_file" ]]; then
      local sender task
      sender=$(grep "^FROM:" "$inbox_file" 2>/dev/null | sed 's/^FROM: //')
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

    # ── Start background inbox watcher ───────────────────
    local _inbox_arrived=0 _watcher_pid
    ( while true; do
        sleep 2
        [[ -n "$(check_inbox "$role")" ]] && { kill -USR1 $$ 2>/dev/null; exit; }
      done
    ) &
    _watcher_pid=$!
    trap '_inbox_arrived=1' USR1

    # ── Blocking read — no timeout, no flicker ───────────
    echo -ne "${color}[${short}]${NC} ❯ "
    IFS= read -r AGENT_TASK 2>/dev/null
    local _read_status=$?

    # ── Cleanup ──────────────────────────────────────────
    kill "$_watcher_pid" 2>/dev/null
    wait "$_watcher_pid" 2>/dev/null
    trap - USR1

    # ── Handle result ────────────────────────────────────
    if [[ $_read_status -ne 0 ]]; then
      if [[ $_inbox_arrived -eq 1 ]]; then
        echo ""   # newline after any partial input on screen
        continue  # loop back → check inbox → handle task
      fi
      return 1    # EOF / Ctrl+D → agent exits
    fi

    [[ "$AGENT_TASK" == "exit" || "$AGENT_TASK" == "quit" ]] && return 1
    [[ -z "$AGENT_TASK" ]] && continue   # empty Enter → re-prompt

    AGENT_TASK_SOURCE="user"
    return 0
  done
}
