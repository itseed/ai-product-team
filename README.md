# AI Product Team

Multi-agent AI team simulator: 5 role-based agents (PO, Tech Lead, Dev, QA, DevOps) run in tmux panes, each backed by a different AI CLI (Claude / Gemini / Cursor). A Node.js web dashboard dispatches tasks via file-based inbox queues and streams logs via SSE.

## Requirements

- **tmux** — terminal multiplexer
- **claude** — [Claude CLI](https://github.com/anthropics/anthropic-sdk-typescript)
- **gemini** — [Gemini CLI](https://ai.google.dev/gemini-api/docs)
- **cursor** — [Cursor](https://cursor.com) (for Developer agent with file write)
- **Node.js** — for web dashboard (v18+)

## Quick Start

```bash
# Full launch: agents + web dashboard
./run.sh

# Agents only (no web)
./launch.sh

# Restart
./run.sh --restart

# Kill session
./run.sh --kill
```

## Layout

```
┌──────────────┬──────────────┬──────────────┐
│ 🧑‍💼 PO       │ 🏗️ Tech Lead  │ 💻 Developer  │
├──────────────┼──────────────┼──────────────┤
│ 🧪 QA        │ 🚀 DevOps    │ 📋 Coordinator│
└──────────────┴──────────────┴──────────────┘
```

## Roles & AI Models

| Role | Default AI | Focus |
|------|------------|-------|
| Product Owner | Claude | Backlog, user stories, priorities |
| Tech Lead | Claude | Architecture, code review |
| Developer | Cursor Agent | Implementation (writes files) |
| QA Tester | Gemini | Testing, bug reports |
| DevOps | Claude | CI/CD, deployment |
| Coordinator | Claude | Scrum Master, task routing |

## Task Routing

**From Coordinator pane:**
- `@po <task>` → Product Owner
- `@tech <task>` → Tech Lead
- `@dev <task>` → Developer
- `@qa <task>` → QA Tester
- `@devops <task>` → DevOps
- `@all <task>` → Broadcast to all
- `ask <question>` → Ask Scrum Master
- `status` → Show team log

**From Web Dashboard:** http://localhost:3030 — dispatch tasks, view logs, configure workspace.

## Project Structure

```
ai-product-team/
├── config.sh        # Global config, AI assignments, helpers
├── coordinator.sh   # Scrum Master / task router
├── launch.sh        # tmux launcher (agents only)
├── run.sh           # Full launch (agents + web)
├── agents/
│   ├── po.sh        # Product Owner
│   ├── tech_lead.sh # Tech Lead
│   ├── dev.sh       # Developer (Cursor Agent, inbox polling)
│   ├── qa.sh        # QA Tester
│   └── devops.sh    # DevOps
├── shared/
│   ├── inbox/       # po, tech, dev, qa, devops — .task files
│   ├── logs/       # team.log
│   ├── paths.json  # workspace, projectRoot (from dashboard)
│   └── project/    # requirements/, architecture/, code/, tests/
└── web/            # Express dashboard
```

## Configuration

- **config.sh** — AI model per role (`AI_PO`, `AI_TECH`, etc.). Values: `claude`, `gemini`, `cursor`.
- **Web Dashboard** — Set workspace (where Cursor writes) and project root (file browser). Supports `.code-workspace` import.

## tmux Tips

- `Ctrl+b 0/1` — switch window (agents / web)
- `Ctrl+b →←↑↓` — move between panes
- `Ctrl+b z` — zoom pane
- `Ctrl+b d` — detach (session keeps running)
- `Ctrl+b [` — scroll mode (q to exit)

## License

MIT
