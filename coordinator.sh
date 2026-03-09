#!/bin/bash
# ============================================================
#  AI Product Team — Coordinator / Scrum Master Agent
#  Routes tasks between agents, shows team status
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

ROLE="Coordinator"
COLOR=$COLOR_COORD

SYSTEM_PROMPT="You are an Agile Coach and Scrum Master for a software development team. Your responsibilities:
- Facilitate sprint ceremonies (planning, standup, review, retrospective)
- Remove blockers and resolve team conflicts
- Track sprint progress and velocity
- Coordinate cross-functional collaboration between PO, Tech Lead, Dev, QA, DevOps
- Coach on agile best practices (Scrum, Kanban, SAFe)
- Generate status reports and sprint summaries
- Identify risks and escalate issues
When coordinating, be neutral, facilitative, and focused on team outcomes."

# ── Banner ───────────────────────────────────────────────────
clear
echo -e "${WHITE}${BOLD}"
cat << 'EOF'
 ╔══════════════════════════════════════════════════════════╗
 ║          📋  COORDINATOR / SCRUM MASTER                  ║
 ║══════════════════════════════════════════════════════════║
 ║  AI Model : Claude  │  Routes tasks to all agents        ║
 ╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BOLD}Route tasks:${NC}"
echo -e "  ${CYAN}@po${NC}     <task>   → Product Owner"
echo -e "  ${BLUE}@tech${NC}   <task>   → Tech Lead"
echo -e "  ${GREEN}@dev${NC}    <task>   → Developer"
echo -e "  ${YELLOW}@qa${NC}     <task>   → QA Tester"
echo -e "  ${MAGENTA}@devops${NC} <task>   → DevOps Engineer"
echo -e "  ${WHITE}@all${NC}    <task>   → Broadcast to all agents"
echo -e "${BOLD}Workflow:${NC}"
echo -e "  ${WHITE}workflow${NC} <task>  → Start pipeline (PO→Tech→Dev→QA)"
echo -e "  ${WHITE}approve${NC}         → Approve latest pending review"
echo -e "  ${WHITE}reject${NC}  [notes] → Reject + send bugs back to Dev"
echo -e "  ${WHITE}auto on${NC}         → Enable auto-approve (PO/Tech/Dev)"
echo -e "  ${WHITE}auto off${NC}        → Disable auto-approve"
echo -e "${BOLD}Other:${NC}"
echo -e "  ${WHITE}ask${NC}     <q>     → Ask Scrum Master"
echo -e "  ${WHITE}status${NC}          → Pipeline + inbox + review queue"
echo -e "  ${WHITE}exit${NC}            → Quit"
echo ""

# ── Workflow helpers (call web server API) ────────────────────
WEB_URL="http://localhost:3030"

workflow_start() {
  local task="$1"
  local result
  result=$(curl -s -X POST "$WEB_URL/api/workflow/start" \
    -H "Content-Type: application/json" \
    -d "{\"task\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$task")}" 2>/dev/null)
  if echo "$result" | grep -q '"success":true'; then
    local id
    id=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin).get('workflowId','?'))" 2>/dev/null)
    echo -e "${GREEN}✓ Workflow started (id: $id) → PO inbox${NC}"
    log_event "Coordinator" "WORKFLOW START: $task"
  else
    echo -e "${RED}✗ Failed to start workflow (is web server running? ./start-web.sh)${NC}"
  fi
}

workflow_approve() {
  local result queue item id fromRole handoffTo output
  result=$(curl -s "$WEB_URL/api/workflow" 2>/dev/null)
  queue=$(echo "$result" | python3 -c "
import json,sys
d=json.load(sys.stdin)
q=d.get('reviewQueue',[])
if q:
    i=q[0]
    print(i.get('id',''),i.get('fromRole',''),i.get('handoffTo',''))
" 2>/dev/null)
  if [[ -z "$queue" ]]; then
    echo -e "${GRAY}No items pending review${NC}"; return
  fi
  read -r id fromRole handoffTo <<< "$queue"
  output=$(curl -s "$WEB_URL/api/workflow" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
q=d.get('reviewQueue',[])
if q: print(q[0].get('output',''))
" 2>/dev/null)
  local payload
  payload=$(python3 -c "import json; print(json.dumps({'reviewId':'$id','fromRole':'$fromRole','handoffTo':'$handoffTo','output':open('/dev/stdin').read()}))" <<< "$output" 2>/dev/null)
  result=$(curl -s -X POST "$WEB_URL/api/workflow/approve" \
    -H "Content-Type: application/json" -d "$payload" 2>/dev/null)
  if echo "$result" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Approved $fromRole → $handoffTo${NC}"
    log_event "Coordinator" "APPROVED $fromRole → $handoffTo"
  else
    echo -e "${RED}✗ Approve failed${NC}"
  fi
}

workflow_reject() {
  local notes="$1"
  local result id fromRole
  result=$(curl -s "$WEB_URL/api/workflow" 2>/dev/null)
  read -r id fromRole _ <<< "$(echo "$result" | python3 -c "
import json,sys
d=json.load(sys.stdin)
q=d.get('reviewQueue',[])
if q:
    i=q[0]
    print(i.get('id',''),i.get('fromRole',''))
" 2>/dev/null)"
  if [[ -z "$id" ]]; then
    echo -e "${GRAY}No items pending review${NC}"; return
  fi
  local payload
  payload=$(python3 -c "import json,sys; print(json.dumps({'reviewId':'$id','fromRole':'$fromRole','sendBackTo':'dev','bugReport':sys.argv[1]}))" "$notes" 2>/dev/null)
  result=$(curl -s -X POST "$WEB_URL/api/workflow/reject" \
    -H "Content-Type: application/json" -d "$payload" 2>/dev/null)
  if echo "$result" | grep -q '"success":true'; then
    echo -e "${YELLOW}✓ Rejected $fromRole → bug report sent to Dev${NC}"
    log_event "Coordinator" "REJECTED $fromRole → Dev (bugs: $notes)"
  else
    echo -e "${RED}✗ Reject failed${NC}"
  fi
}

workflow_auto() {
  local enabled="$1"  # "on" or "off"
  local stages='["po","tech","dev"]'
  [[ "$enabled" == "on" ]] && flag=true || flag=false
  local result
  result=$(curl -s -X POST "$WEB_URL/api/workflow/auto-approve" \
    -H "Content-Type: application/json" \
    -d "{\"enabled\":$flag,\"stages\":$stages}" 2>/dev/null)
  if echo "$result" | grep -q '"success":true'; then
    [[ "$enabled" == "on" ]] \
      && echo -e "${GREEN}⚡ Auto-approve ON (PO/Tech/Dev — QA still requires manual review)${NC}" \
      || echo -e "${GRAY}⚡ Auto-approve OFF${NC}"
    log_event "Coordinator" "AUTO-APPROVE $enabled"
  else
    echo -e "${RED}✗ Failed (is web server running?)${NC}"
  fi
}

# ── Show team status ─────────────────────────────────────────
show_status() {
  # Pipeline
  local wf_result stage task_name
  wf_result=$(curl -s "$WEB_URL/api/workflow" 2>/dev/null)
  if [[ -n "$wf_result" ]]; then
    stage=$(echo "$wf_result" | python3 -c "import json,sys; d=json.load(sys.stdin); c=d.get('current'); print(c['stage'] if c else 'none')" 2>/dev/null)
    task_name=$(echo "$wf_result" | python3 -c "import json,sys; d=json.load(sys.stdin); c=d.get('current'); print((c.get('task','')[:60]+'…') if c else '')" 2>/dev/null)
    local auto
    auto=$(echo "$wf_result" | python3 -c "import json,sys; d=json.load(sys.stdin); a=d.get('autoApprove',{}); print('ON' if a.get('enabled') else 'OFF')" 2>/dev/null)
    echo -e "\n${BOLD}═══ Pipeline ═══${NC}"
    echo -e "  Stage    : ${YELLOW}$stage${NC}"
    echo -e "  Task     : ${GRAY}$task_name${NC}"
    echo -e "  Auto     : ${GREEN}$auto${NC}"

    echo -e "\n${BOLD}═══ Review Queue ═══${NC}"
    local queue_count
    queue_count=$(echo "$wf_result" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('reviewQueue',[])))" 2>/dev/null)
    if [[ "$queue_count" -gt 0 ]]; then
      echo "$wf_result" | python3 -c "
import json,sys
q=json.load(sys.stdin).get('reviewQueue',[])
for i in q:
    print(f\"  [{i['fromRole']}→{i.get('handoffTo','done')}] {i.get('task','')[:50]}\")
" 2>/dev/null
    else
      echo -e "  ${GRAY}No pending reviews${NC}"
    fi
  fi

  echo -e "\n${BOLD}═══ Team Activity Log ═══${NC}"
  if [[ -f "$LOGS_DIR/team.log" ]]; then
    tail -15 "$LOGS_DIR/team.log"
  else
    echo -e "${GRAY}No activity yet${NC}"
  fi

  echo -e "\n${BOLD}═══ Pending Inbox Tasks ═══${NC}"
  local found=0
  for role in po tech dev qa devops; do
    local count
    count=$(find "$INBOX_DIR/$role" -maxdepth 1 -name '*.task' 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$count" -gt 0 ]]; then
      echo -e "  ${YELLOW}$role${NC}: $count pending task(s)"
      found=1
    fi
  done
  [[ "$found" -eq 0 ]] && echo -e "  ${GRAY}All inboxes clear${NC}"
  echo ""
}

# ── Main loop ────────────────────────────────────────────────
while true; do
  echo -ne "${WHITE}[COORD]${NC} ❯ "
  if ! IFS= read -r input 2>/dev/null; then
    break  # EOF / Ctrl+D
  fi
  [[ -z "$input" ]] && continue

  case "$input" in
    exit|quit)
      echo -e "${WHITE}[Coordinator] Shutting down...${NC}"
      break
      ;;

    status)
      show_status
      ;;

    workflow\ *)
      task="${input#workflow }"
      workflow_start "$task"
      ;;

    approve)
      workflow_approve
      ;;

    reject|reject\ *)
      notes="${input#reject}"
      notes="${notes# }"
      workflow_reject "$notes"
      ;;

    "auto on")
      workflow_auto "on"
      ;;

    "auto off")
      workflow_auto "off"
      ;;

    @all\ *)
      task="${input#@all }"
      echo -e "${WHITE}📢 Broadcasting to all agents: ${GRAY}$task${NC}"
      for role in po tech dev qa devops; do
        send_task "$role" "Coordinator" "$task"
      done
      log_event "Coordinator" "BROADCAST: $task"
      ;;

    @po\ *)
      task="${input#@po }"
      echo -e "${CYAN}→ Routing to Product Owner: ${GRAY}$task${NC}"
      send_task "po" "Coordinator" "$task"
      log_event "Coordinator" "→ PO: $task"
      ;;

    @tech\ *)
      task="${input#@tech }"
      echo -e "${BLUE}→ Routing to Tech Lead: ${GRAY}$task${NC}"
      send_task "tech" "Coordinator" "$task"
      log_event "Coordinator" "→ TECH: $task"
      ;;

    @dev\ *)
      task="${input#@dev }"
      echo -e "${GREEN}→ Routing to Developer: ${GRAY}$task${NC}"
      send_task "dev" "Coordinator" "$task"
      log_event "Coordinator" "→ DEV: $task"
      ;;

    @qa\ *)
      task="${input#@qa }"
      echo -e "${YELLOW}→ Routing to QA Tester: ${GRAY}$task${NC}"
      send_task "qa" "Coordinator" "$task"
      log_event "Coordinator" "→ QA: $task"
      ;;

    @devops\ *)
      task="${input#@devops }"
      echo -e "${MAGENTA}→ Routing to DevOps: ${GRAY}$task${NC}"
      send_task "devops" "Coordinator" "$task"
      log_event "Coordinator" "→ DEVOPS: $task"
      ;;

    ask\ *)
      task="${input#ask }"
      echo ""
      echo -e "${WHITE}┌─ 📋 Scrum Master responding... ───────────────────┐${NC}"
      response=$(call_ai "claude" "$SYSTEM_PROMPT" "$task")
      echo "$response" | while IFS= read -r line; do
        echo -e "${WHITE}│${NC}  $line"
      done
      echo -e "${WHITE}└───────────────────────────────────────────────────┘${NC}"
      log_event "Coordinator" "ASK: $task"
      echo ""
      ;;

    *)
      echo -e "${GRAY}Unknown command. Try: @po @tech @dev @qa @devops @all │ workflow approve reject auto │ ask status exit${NC}"
      ;;
  esac
done
