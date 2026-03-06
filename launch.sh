#!/bin/bash
# ============================================================
#  AI Product Team — tmux Launcher
#  Layout: 3-column × 2-row grid (6 panes)
#
#  ┌──────────────┬──────────────┬──────────────┐
#  │ 🧑‍💼 PO (Claude)│ 🏗️ Tech(Claude)│ 💻 Dev(Claude)│
#  ├──────────────┼──────────────┼──────────────┤
#  │ 🧪 QA(Gemini)│ 🚀 Ops(Claude)│ 📋 Coord     │
#  └──────────────┴──────────────┴──────────────┘
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="ai_team"

# ── Check dependencies ───────────────────────────────────────
check_deps() {
  local missing=()
  command -v tmux   &>/dev/null || missing+=("tmux")
  command -v claude &>/dev/null || missing+=("claude")
  command -v gemini &>/dev/null || missing+=("gemini")

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Missing dependencies: ${missing[*]}"
    echo "Please install and try again."
    exit 1
  fi
}

# ── Initialize workspace ─────────────────────────────────────
init_workspace() {
  bash "$SCRIPT_DIR/shared/setup.sh"
}

# ── Kill existing session ────────────────────────────────────
kill_session() {
  tmux kill-session -t "$SESSION" 2>/dev/null && echo "Killed existing session: $SESSION"
}

# ── Print intro ──────────────────────────────────────────────
print_intro() {
  clear
  echo ""
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║                                                          ║"
  echo "  ║       🤖  AI PRODUCT TEAM  —  tmux Multi-Agent          ║"
  echo "  ║                                                          ║"
  echo "  ║   PO: Claude    Tech: Claude    Dev: Cursor Agent          ║"
  echo "  ║   QA: Gemini    DevOps: Claude  Coord: Claude             ║"
  echo "  ║                                                          ║"
  echo "  ╚══════════════════════════════════════════════════════════╝"
  echo ""
}

# ── Build tmux layout ────────────────────────────────────────
build_layout() {
  # Create new detached session (pane 0 = top-left = PO)
  tmux new-session -d -s "$SESSION" \
    -x "${COLUMNS:-220}" -y "${LINES:-55}" 2>/dev/null \
    || { echo "Session '$SESSION' already exists. Kill it first with: tmux kill-session -t $SESSION"; exit 1; }

  local W="$SESSION:0"   # window 0

  # ── Row 1: split pane 0 into 3 columns ──────────────────
  # pane 0 → split right → pane 1
  tmux split-window -h -t "$W.0"
  # pane 1 → split right → pane 2
  tmux split-window -h -t "$W.1"

  # Equalize the 3 columns
  tmux select-layout -t "$W" even-horizontal

  # ── Row 2: split each column vertically ─────────────────
  # col 0 (pane 0) → split down → pane 3
  tmux split-window -v -t "$W.0"
  # col 1 (pane 1) → split down → pane 4
  tmux split-window -v -t "$W.1"
  # col 2 (pane 2) → split down → pane 5
  tmux split-window -v -t "$W.2"

  # Apply tiled layout for perfect grid
  tmux select-layout -t "$W" tiled

  # ── Set pane titles ──────────────────────────────────────
  tmux select-pane -t "$W.0" -T "🧑‍💼 Product Owner (Claude)"
  tmux select-pane -t "$W.1" -T "🏗️  Tech Lead (Claude)"
  tmux select-pane -t "$W.2" -T "💻 Developer (Cursor Agent)"
  tmux select-pane -t "$W.3" -T "🧪 QA Tester (Gemini)"
  tmux select-pane -t "$W.4" -T "🚀 DevOps (Claude)"
  tmux select-pane -t "$W.5" -T "📋 Coordinator"

  # ── Launch agents in each pane ───────────────────────────
  tmux send-keys -t "$W.0" "bash '$SCRIPT_DIR/agents/po.sh'"        Enter
  tmux send-keys -t "$W.1" "bash '$SCRIPT_DIR/agents/tech_lead.sh'" Enter
  tmux send-keys -t "$W.2" "bash '$SCRIPT_DIR/agents/dev.sh'" Enter
  tmux send-keys -t "$W.3" "bash '$SCRIPT_DIR/agents/qa.sh'"        Enter
  tmux send-keys -t "$W.4" "bash '$SCRIPT_DIR/agents/devops.sh'"    Enter
  tmux send-keys -t "$W.5" "bash '$SCRIPT_DIR/coordinator.sh'"      Enter

  # Focus coordinator pane
  tmux select-pane -t "$W.5"

  # ── tmux appearance ──────────────────────────────────────
  tmux set-option -t "$SESSION" pane-border-status top
  tmux set-option -t "$SESSION" pane-border-format " #{pane_title} "
  tmux set-option -t "$SESSION" status-style "bg=colour235,fg=colour250"
  tmux set-option -t "$SESSION" status-left  "#[bold,fg=cyan] AI TEAM #[default] | "
  tmux set-option -t "$SESSION" status-right "#[fg=grey]%H:%M  %Y-%m-%d "
  tmux set-option -t "$SESSION" status-interval 10

  # Window name
  tmux rename-window -t "$W" "AI Product Team"
}

# ── Attach or switch ─────────────────────────────────────────
attach_session() {
  if [[ -n "$TMUX" ]]; then
    echo "Already inside tmux. Switching to session '$SESSION'..."
    tmux switch-client -t "$SESSION"
  else
    tmux attach-session -t "$SESSION"
  fi
}

# ── Main ─────────────────────────────────────────────────────
main() {
  print_intro
  check_deps

  # Handle --kill flag
  if [[ "$1" == "--kill" || "$1" == "-k" ]]; then
    kill_session
    echo "Session killed."
    exit 0
  fi

  # Handle --restart flag
  if [[ "$1" == "--restart" || "$1" == "-r" ]]; then
    kill_session
  fi

  echo "Initializing workspace..."
  init_workspace
  echo ""

  echo "Building tmux layout..."
  build_layout

  echo ""
  echo "  Agents started. Attaching to session '$SESSION'..."
  echo ""
  echo "  tmux tips:"
  echo "  Ctrl+b → arrow  : move between panes"
  echo "  Ctrl+b z        : zoom in/out a pane"
  echo "  Ctrl+b d        : detach (session keeps running)"
  echo "  Ctrl+b [        : scroll mode (q to exit)"
  echo ""
  sleep 1

  attach_session
}

main "$@"
