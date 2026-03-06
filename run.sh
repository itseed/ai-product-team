#!/bin/bash
# ============================================================
#  AI Product Team — Single launcher
#  Starts agents + web dashboard in one tmux session
#
#  Usage:
#    ./run.sh            start everything
#    ./run.sh --restart  kill existing session then start
#    ./run.sh --kill     kill session and exit
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="ai_team"
WEB_PORT="${PORT:-3030}"

# ── Helpers ──────────────────────────────────────────────────
red()   { echo -e "\033[0;31m$*\033[0m"; }
green() { echo -e "\033[0;32m$*\033[0m"; }
cyan()  { echo -e "\033[0;36m$*\033[0m"; }
dim()   { echo -e "\033[2m$*\033[0m"; }

# ── Banner ───────────────────────────────────────────────────
print_banner() {
  clear
  echo ""
  cyan "  ╔══════════════════════════════════════════════════════╗"
  cyan "  ║                                                      ║"
  cyan "  ║       🤖  AI PRODUCT TEAM  —  FULL LAUNCH           ║"
  cyan "  ║                                                      ║"
  cyan "  ║   Window 0 │ agents  (PO · Tech · Dev · QA · Ops)   ║"
  cyan "  ║   Window 1 │ web     http://localhost:${WEB_PORT}          ║"
  cyan "  ║                                                      ║"
  cyan "  ╚══════════════════════════════════════════════════════╝"
  echo ""
}

# ── Check deps ───────────────────────────────────────────────
check_deps() {
  local missing=()
  command -v tmux   &>/dev/null || missing+=("tmux")
  command -v node   &>/dev/null || missing+=("node")
  command -v claude &>/dev/null || missing+=("claude")
  command -v gemini &>/dev/null || missing+=("gemini")
  if [[ ${#missing[@]} -gt 0 ]]; then
    red "Missing: ${missing[*]}"
    exit 1
  fi
}

# ── Kill ─────────────────────────────────────────────────────
kill_session() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    green "  ✓ Killed session '$SESSION'"
  fi
}

# ── Window 0: Agent grid (3×2) ───────────────────────────────
build_agents_window() {
  local W="$SESSION:0"

  # 3 columns
  tmux split-window -h -t "$W.0"
  tmux split-window -h -t "$W.1"
  tmux select-layout -t "$W" even-horizontal

  # Split each column in half
  tmux split-window -v -t "$W.0"
  tmux split-window -v -t "$W.1"
  tmux split-window -v -t "$W.2"
  tmux select-layout -t "$W" tiled

  # Titles
  tmux select-pane -t "$W.0" -T "🧑‍💼 Product Owner (Claude)"
  tmux select-pane -t "$W.1" -T "🏗️  Tech Lead (Claude)"
  tmux select-pane -t "$W.2" -T "💻 Developer (Cursor Agent)"
  tmux select-pane -t "$W.3" -T "🧪 QA Tester (Gemini)"
  tmux select-pane -t "$W.4" -T "🚀 DevOps (Claude)"
  tmux select-pane -t "$W.5" -T "📋 Coordinator"

  # Launch agents
  tmux send-keys -t "$W.0" "bash '$SCRIPT_DIR/agents/po.sh'"          Enter
  tmux send-keys -t "$W.1" "bash '$SCRIPT_DIR/agents/tech_lead.sh'"   Enter
  tmux send-keys -t "$W.2" "bash '$SCRIPT_DIR/agents/dev.sh'"  Enter
  tmux send-keys -t "$W.3" "bash '$SCRIPT_DIR/agents/qa.sh'"          Enter
  tmux send-keys -t "$W.4" "bash '$SCRIPT_DIR/agents/devops.sh'"      Enter
  tmux send-keys -t "$W.5" "bash '$SCRIPT_DIR/coordinator.sh'"        Enter

  tmux rename-window -t "$W" "agents"
  tmux select-pane   -t "$W.5"   # focus coordinator
}

# ── Window 1: Web server ─────────────────────────────────────
build_web_window() {
  tmux new-window -t "$SESSION" -n "web :${WEB_PORT}"
  local W="$SESSION:1"

  tmux send-keys -t "$W" \
    "cd '$SCRIPT_DIR' && PORT=$WEB_PORT node web/server.js" Enter

  tmux select-pane -t "$W" -T "🌐 Dashboard :${WEB_PORT}"
}

# ── Status bar ───────────────────────────────────────────────
apply_theme() {
  tmux set-option -t "$SESSION" pane-border-status    top
  tmux set-option -t "$SESSION" pane-border-format    " #{pane_title} "
  tmux set-option -t "$SESSION" status-style          "bg=colour234,fg=colour250"
  tmux set-option -t "$SESSION" status-left-length    40
  tmux set-option -t "$SESSION" status-right-length   50
  tmux set-option -t "$SESSION" status-left  \
    "#[bold,fg=cyan] 🤖 AI TEAM #[default]#[fg=colour240] | "
  tmux set-option -t "$SESSION" status-right \
    "#[fg=green]web:${WEB_PORT} #[fg=colour240]| #[fg=colour250]%H:%M  %d %b"
  tmux set-option -t "$SESSION" status-interval       5
  tmux set-option -t "$SESSION" base-index            0
}

# ── Attach ───────────────────────────────────────────────────
attach() {
  # Go back to agents window before attaching
  tmux select-window -t "$SESSION:0"

  if [[ -n "$TMUX" ]]; then
    tmux switch-client -t "$SESSION"
  else
    tmux attach-session -t "$SESSION"
  fi
}

# ── Open browser (macOS / Linux) ─────────────────────────────
open_browser() {
  sleep 1.5  # give server time to bind
  local url="http://localhost:${WEB_PORT}"
  if command -v open &>/dev/null; then
    open "$url" 2>/dev/null &
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$url" 2>/dev/null &
  fi
}

# ── Main ─────────────────────────────────────────────────────
main() {
  print_banner
  check_deps

  case "${1:-}" in
    --kill|-k)
      kill_session
      exit 0
      ;;
    --restart|-r)
      kill_session
      ;;
    "")
      if tmux has-session -t "$SESSION" 2>/dev/null; then
        echo "  Session '$SESSION' already running."
        echo ""
        dim "  Re-attach:  tmux attach -t $SESSION"
        dim "  Restart:    ./run.sh --restart"
        dim "  Kill:       ./run.sh --kill"
        echo ""
        read -r -p "  Re-attach now? [Y/n] " ans
        [[ "${ans:-Y}" =~ ^[Yy]$ ]] && attach
        exit 0
      fi
      ;;
  esac

  # Init shared workspace
  echo "  Initializing workspace..."
  bash "$SCRIPT_DIR/shared/setup.sh" > /dev/null
  green "  ✓ Workspace ready"

  echo "  Checking web dependencies..."
  (cd "$SCRIPT_DIR/web" && npm install --silent 2>/dev/null)
  green "  ✓ Web dependencies ready"

  # Create tmux session
  echo "  Building tmux session..."
  tmux new-session -d -s "$SESSION" \
    -x "${COLUMNS:-220}" -y "${LINES:-55}"

  build_agents_window
  green "  ✓ Agent grid ready  (window 0)"

  build_web_window
  green "  ✓ Web server started (window 1 — :${WEB_PORT})"

  apply_theme

  # Open browser in background
  open_browser &

  echo ""
  cyan "  ─────────────────────────────────────────────"
  echo "  tmux windows:"
  echo "    [0] agents  — Ctrl+b 0"
  echo "    [1] web     — Ctrl+b 1"
  echo ""
  echo "  tmux keys:"
  echo "    Ctrl+b 0/1  switch window"
  echo "    Ctrl+b →←   move between panes"
  echo "    Ctrl+b z    zoom pane"
  echo "    Ctrl+b d    detach"
  cyan "  ─────────────────────────────────────────────"
  echo ""
  sleep 0.5
  attach
}

main "$@"
