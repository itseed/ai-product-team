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

echo -e "${BOLD}Route tasks with:${NC}"
echo -e "  ${CYAN}@po${NC}     <task>   → Product Owner"
echo -e "  ${BLUE}@tech${NC}   <task>   → Tech Lead"
echo -e "  ${GREEN}@dev${NC}    <task>   → Developer"
echo -e "  ${YELLOW}@qa${NC}     <task>   → QA Tester"
echo -e "  ${MAGENTA}@devops${NC} <task>   → DevOps Engineer"
echo -e "  ${WHITE}@all${NC}    <task>   → Broadcast to all agents"
echo -e "  ${WHITE}ask${NC}     <task>   → Ask Scrum Master"
echo -e "  ${WHITE}status${NC}           → Show team log"
echo -e "  ${WHITE}exit${NC}             → Quit coordinator"
echo ""

# ── Show team status ─────────────────────────────────────────
show_status() {
  echo -e "\n${BOLD}═══ Team Activity Log ═══${NC}"
  if [[ -f "$LOGS_DIR/team.log" ]]; then
    tail -20 "$LOGS_DIR/team.log"
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
      echo -e "${GRAY}Unknown command. Try: @po, @tech, @dev, @qa, @devops, @all, ask, status, exit${NC}"
      ;;
  esac
done
