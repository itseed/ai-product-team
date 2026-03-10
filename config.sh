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
AI_PO="claude"          # Product Owner    → Claude
AI_TECH="claude"        # Tech Lead        → Claude
AI_DEV="cursor"         # Developer        → Cursor Agent (writes files!)
AI_QA="claude"          # QA Tester        → Gemini
AI_DEVOPS="claude"      # DevOps           → Claude

# ── tmux Session ─────────────────────────────────────────────
SESSION="ai_team"
TERM_WIDTH=220
TERM_HEIGHT=55

# ── Helper: append skills to system prompt ───────────────────
# Usage: append_skills "system_prompt" "role"
# Reads shared/skills.json and appends assigned skill names to the prompt
append_skills() {
  local system="$1"
  local role="$2"
  local skills_file="$SHARED_DIR/skills.json"

  [[ ! -f "$skills_file" ]] && { echo "$system"; return; }

  local skill_names
  skill_names=$(python3 -c "
import json
try:
    data = json.load(open('$skills_file'))
    ids = data.get('$role', [])
    if ids:
        print('\n'.join('- ' + s.replace('-', ' ').title() for s in ids))
except: pass
" 2>/dev/null)

  if [[ -z "$skill_names" ]]; then
    echo "$system"
    return
  fi

  echo "$system

## Active Skills
You have been assigned these specialized capabilities. Apply them as relevant when handling the task:
$skill_names"
}

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

# ── Timeout-aware AI call ─────────────────────────────────────
# Usage: call_ai_timeout "ai_name" "system_prompt" "input" [timeout_sec]
# Returns: response text; exits with 1 on timeout/empty
call_ai_timeout() {
  local ai="$1" system="$2" input="$3" timeout_sec="${4:-120}"
  local full_prompt="$system

User request: $input"
  local result exit_code

  case "$ai" in
    claude)
      result=$(timeout "$timeout_sec" "$CLAUDE_CMD" -p "$full_prompt" 2>/dev/null)
      exit_code=$?
      ;;
    gemini)
      result=$(timeout "$timeout_sec" "$GEMINI_CMD" -p "$full_prompt" 2>/dev/null)
      exit_code=$?
      ;;
    cursor)
      cd "${WORKSPACE_DIR:-$PROJECT_DIR/code}" 2>/dev/null
      result=$(echo "$full_prompt" | timeout "$timeout_sec" cursor agent --print 2>/dev/null)
      exit_code=$?
      ;;
    *)
      echo "[Error] Unknown AI: $ai"; return 1
      ;;
  esac

  if [[ $exit_code -eq 124 ]]; then
    echo "[Timeout] $ai did not respond within ${timeout_sec}s — task skipped"
    return 1
  fi
  if [[ -z "$result" ]]; then
    echo "[Error] $ai returned empty response"
    return 1
  fi
  echo "$result"
}

# ── Shared agent banner ───────────────────────────────────────
# Usage: show_agent_banner "EMOJI TITLE" "Focus line" "inbox/role/" "AI_VAR_NAME"
show_agent_banner() {
  local title="$1" focus="$2" inbox="$3" ai_var="$4"
  local ai_val="${!ai_var}"
  local color="$COLOR"
  clear
  echo -e "${color}"
  printf ' ╔══════════════════════════════════════════════════╗\n'
  printf " ║  %-47s║\n" "$title  AGENT"
  printf ' ║══════════════════════════════════════════════════║\n'
  printf " ║  AI Model  : %-35s║\n" "$ai_val"
  printf " ║  Focus     : %-35s║\n" "$focus"
  printf " ║  Inbox     : %-35s║\n" "$inbox"
  printf ' ╚══════════════════════════════════════════════════╝\n'
  echo -e "${NC}"
}

# ── Shared agent loop ─────────────────────────────────────────
# Call from each agent after setting globals:
#   ROLE, ROLE_SHORT, COLOR, INBOX_ROLE, ICON
#   AGENT_AI_VAR   — name of config var, e.g. "AI_PO"
#   AGENT_TIMEOUT  — seconds (default 120)
#   AGENT_NOTES    — path to notes .md file
#   AGENT_FINAL    — set to "1" if this is the last pipeline stage (QA)
# Optional: define custom_ai_call() to override AI invocation (used by dev)
run_agent() {
  local script_dir="$1"
  local ai_var="${AGENT_AI_VAR:-AI_PO}"
  local timeout_sec="${AGENT_TIMEOUT:-120}"

  while true; do
    source "$script_dir/../config.sh"
    [[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
    local ai="${!ai_var}"

    read_input "$INBOX_ROLE" "$COLOR" "$ROLE_SHORT" || break
    local task="$AGENT_TASK"

    # Built-in utility commands
    if [[ "$task" == "workspace" && -n "$WORKSPACE_DIR" ]]; then
      echo -e "${GRAY}$WORKSPACE_DIR${NC}"; ls "$WORKSPACE_DIR" 2>/dev/null; continue
    fi

    echo ""
    echo -e "${COLOR}┌─ ${ICON:-🤖} $ROLE processing... ──────────────────────┐${NC}"
    echo -e "${COLOR}│${NC}  ${GRAY}AI: $ai${NC}"
    log_event "$ROLE" "$task"

    # Get system prompt
    local system_prompt
    if declare -f get_system_prompt > /dev/null 2>&1; then
      system_prompt=$(get_system_prompt)
    else
      system_prompt="$SYSTEM_PROMPT"
    fi
    local full_system
    full_system=$(append_skills "$system_prompt" "$INBOX_ROLE")

    # Call AI — use custom_ai_call if defined, else call_ai_timeout
    local response
    if declare -f custom_ai_call > /dev/null 2>&1; then
      response=$(custom_ai_call "$ai" "$full_system" "$task" "$timeout_sec")
    else
      response=$(call_ai_timeout "$ai" "$full_system" "$task" "$timeout_sec")
    fi

    # Retry once on failure
    if [[ -z "$response" || "$response" == \[Error\]* || "$response" == \[Timeout\]* ]]; then
      local err_msg="$response"
      echo -e "${COLOR}│${NC}  ${YELLOW}⚠ ${err_msg:-Empty response}. Retrying in 3s...${NC}"
      sleep 3
      if declare -f custom_ai_call > /dev/null 2>&1; then
        response=$(custom_ai_call "$ai" "$full_system" "$task" "$timeout_sec")
      else
        response=$(call_ai_timeout "$ai" "$full_system" "$task" "$timeout_sec")
      fi
      if [[ -z "$response" || "$response" == \[Error\]* || "$response" == \[Timeout\]* ]]; then
        response="${response:-[Error] $ai did not respond. Check CLI or switch AI in config.}"
      fi
    fi

    echo -e "${COLOR}│${NC}"
    echo "$response" | while IFS= read -r line; do
      echo -e "${COLOR}│${NC}  $line"
    done
    echo -e "${COLOR}│${NC}"
    echo -e "${COLOR}└───────────────────────────────────────────────────┘${NC}"

    # Save to notes
    if [[ -n "$AGENT_NOTES" ]]; then
      mkdir -p "$(dirname "$AGENT_NOTES")" 2>/dev/null
      { echo "## $ROLE ($ai): $task"; echo "Date: $(date)"; echo ""; echo "$response"; echo ""; echo "---"; } \
        >> "$AGENT_NOTES" 2>/dev/null
    fi

    # Workflow handoff
    if [[ -n "$WORKFLOW_ID" ]]; then
      mkdir -p "$SHARED_DIR/workflow"
      local hfile="$SHARED_DIR/workflow/${WORKFLOW_ID}_${INBOX_ROLE}.handoff"
      { echo "HANDOFF_TO=${HANDOFF_TO:-}"; echo "---TASK---"; echo "$task"; echo "---OUTPUT---"; echo "$response"; } \
        > "$hfile"
      if [[ -n "$HANDOFF_TO" ]]; then
        log_event "$ROLE" "Workflow $WORKFLOW_ID → handoff to $HANDOFF_TO"
      else
        log_event "$ROLE" "Workflow $WORKFLOW_ID complete"
      fi
    fi

    echo ""
  done

  echo -e "${COLOR}[$ROLE] Session ended.${NC}"
}
