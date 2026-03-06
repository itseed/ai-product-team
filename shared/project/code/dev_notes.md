## Developer (Cursor): Implement CRM Landing Page per Tech Lead Architecture
Date: Fri Mar  6 2026

### Changes Made

**Updated existing components to match PO requirements:**

1. **Features.tsx** — Expanded from 4 to 6 cards per PO US-02:
   - Contact Management, Deal Pipeline, Email Automation, Analytics Dashboard, Team Collaboration, Mobile App
   - Changed grid from `lg:grid-cols-4` to `lg:grid-cols-3` for 6-card layout

2. **Pricing.tsx** — Realigned to PO US-03:
   - Free (฿0 / forever) → Pro (฿990/mo, ฿792/yr) → Enterprise (Custom / contact us)
   - Pro plan highlighted as "ยอดนิยม"
   - Conditional price rendering for Free (฿0), Pro (dynamic), Enterprise (Custom)

3. **SocialProof.tsx** — Updated metrics per PO US-04:
   - "500+ บริษัทไว้วางใจ", "1M+ ดีลที่บันทึกแล้ว", "NPS Score 72", "99.9% Uptime"

**New files created:**

4. **HowItWorks.tsx** — New "Should Have" section (3-step flow):
   - สมัครฟรี → Import ข้อมูล → เพิ่มยอดขาย
   - Connecting line between steps on desktop

5. **App.tsx** — Added HowItWorks between Features and Pricing

**Test files created/updated:**

6. **Features.test.tsx** — Updated to verify 6 features
7. **Pricing.test.tsx** — Updated for Free/Pro/Enterprise pricing
8. **SocialProof.test.tsx** — New: validates metrics, logos, testimonials
9. **FAQ.test.tsx** — New: expand/collapse, accordion behavior
10. **Footer.test.tsx** — New: brand, links, copyright year
11. **HowItWorks.test.tsx** — New: 3 steps, headings, descriptions

### To verify:
```bash
cd crm-landing && npm install && npm run test:run && npm run build
```

---
## Developer (Cursor): review code in this project
Date: Thu Mar  5 23:29:21 +07 2026

I've now read every source file in the project. Here's my comprehensive code review.

---

## Code Review: AI Product Team

### Project Overview

A multi-agent AI team orchestrator: 5 role-based agents (PO, Tech Lead, Dev, QA, DevOps) + a Coordinator running in tmux panes, each backed by different AI CLIs (Claude/Gemini/Cursor). A Node.js/Express web dashboard dispatches tasks via file-based inbox queues and streams logs via SSE.

**Files reviewed:** `config.sh`, `coordinator.sh`, `run.sh`, `launch.sh`, `start-web.sh`, `shared/setup.sh`, `agents/*.sh`, `web/server.js`, `web/public/app.js`, `web/public/index.html`, `web/public/style.css`

---

### What's Done Well

- **Clean separation of concerns** — each agent is self-contained, all sharing `config.sh` helpers
- **Consistent agent pattern** — `read_input` / `call_ai` / `log_event` is uniform; adding new agents is trivial
- **File-based IPC** — simple, debuggable, crash-safe; no external dependencies
- **`check_inbox`** uses `find -print0 | sort -z` — correctly handles filenames with spaces
- **`mark_done`** renames rather than deletes — preserves audit trail
- **Security fixes already applied** — config write validation (`ALLOWED_AI_VALUES`), JSONC parser replaced with `jsonc-parser` library, path restrictions on `/api/workspace/parse`
- **SSE implementation** properly handles `req.on('close')` cleanup
- **Beautiful dashboard UI** — well-crafted CSS with phosphor-glow terminal aesthetic, responsive layout

---

### Remaining Issues (Prioritized)

#### P0 — Security

**1. `POST /api/paths` overrides `projectRoot` with no restriction** (`server.js:235-246`)

The `/api/files/*` endpoint has a proper path traversal guard at line 356, but `POST /api/paths` lets any caller set `projectRoot` to `/` or any directory, effectively bypassing the file read protection.

```235:246:web/server.js
app.post('/api/paths', (req, res) => {
  const { workspace, projectRoot } = req.body;
  if (!workspace && !projectRoot)
    return res.status(400).json({ error: 'Provide workspace and/or projectRoot' });
  try {
    const saved = savePaths({ workspace, projectRoot });
    for (const p of Object.values(saved)) fs.mkdirSync(p, { recursive: true });
    res.json({ success: true, paths: saved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

**Fix:** Restrict `projectRoot` to an allowlist of base directories (same `ALLOWED_PARSE_BASE_DIRS` pattern used in the workspace parser), or at minimum bind the server to `127.0.0.1`.

**2. Server binds to `0.0.0.0`** (`server.js:365`)

Express default binds to all interfaces. Anyone on the same network can dispatch tasks, modify config, and read files.

```365:365:web/server.js
app.listen(PORT, () => {
```

**Fix:** One-line change — `app.listen(PORT, '127.0.0.1', () => {`

**3. XSS in file tree rendering** (`app.js:469-497`)

`item.name` comes from filesystem paths and is injected via `innerHTML`. A malicious filename like `<img src=x onerror=alert(1)>` would execute JavaScript.

```468:472:web/public/app.js
    if (item.type === 'dir') {
      row.innerHTML = `
        <span class="tree-arrow">▶</span>
        <span class="tree-name">${item.name}/</span>
      `;
```

**Fix:** Use `document.createElement` + `textContent` instead of `innerHTML`, or escape the value.

#### P1 — Bugs

**4. `parseConfig` regex misses hyphenated values** (`server.js:73`)

```73:73:web/server.js
    const re  = /^(AI_\w+)="(\w+)"/gm;
```

`\w` doesn't match `-`. Values like `claude-opus` or `claude-haiku` silently return empty. Should be `/^(AI_\w+)="([^"]+)"/gm`.

**5. macOS `date +%s%N` not supported** (`config.sh:119`)

```119:119:config.sh
  ts=$(date +%s%N)
```

macOS `date` doesn't support `%N` (nanoseconds). This produces timestamps like `1234567890N`, which may cause sorting issues. **Fix:** Use `$(date +%s)_$$` (epoch + PID).

**6. `cd` side-effect in `call_ai` leaks to caller** (`config.sh:76`)

```73:78:config.sh
    cursor)
      # cursor agent --print: headless mode, full tools (write files, bash, edit)
      # Used when routing tasks from coordinator → dev pane via file inbox
      cd "${WORKSPACE_DIR:-$PROJECT_DIR/code}" 2>/dev/null
      echo "$full_prompt" | cursor agent --print 2>/dev/null \
        || echo "[Error] Cursor agent unavailable — run: cursor agent login"
```

The `cd` permanently changes the working directory of the calling shell. `dev.sh` works around this (lines 79-81) but it's fragile. **Fix:** Wrap in a subshell `(cd ... && echo ... | cursor ...)`.

**7. `coordinator.sh` doesn't poll inbox** (`coordinator.sh:73`)

Unlike all other agents which use `read_input` (with inbox polling), the coordinator uses a raw `read -t 3` loop. Tasks dispatched to a hypothetical coordinator inbox would never be picked up. Minor since the coordinator isn't a task target, but inconsistent.

#### P2 — Code Quality

**8. Task filename collision** (`server.js:122`)

```122:122:web/server.js
  const file = path.join(dir, `${Date.now()}.task`);
```

Millisecond precision collides if two tasks dispatch rapidly. **Fix:** Add random suffix: `` `${Date.now()}_${Math.random().toString(36).slice(2,8)}.task` ``

**9. SSE unbounded buffer allocation** (`server.js:194`)

```193:196:web/server.js
        const fd  = fs.openSync(logFile, 'r');
        const buf = Buffer.alloc(stat.size - lastSize);
        fs.readSync(fd, buf, 0, buf.length, lastSize);
        fs.closeSync(fd);
```

If the log grows several MB between ticks (verbose AI response), this allocates it all at once. **Fix:** Cap reads at 64KB per tick.

**10. `npm install` on every launch** (`run.sh:177`, `start-web.sh:19`)

```177:177:run.sh
  (cd "$SCRIPT_DIR/web" && npm install --silent 2>/dev/null)
```

Slow and unnecessary after first run. **Fix:** Check `node_modules` existence first:
```bash
[[ -d "$SCRIPT_DIR/web/node_modules" ]] || (cd "$SCRIPT_DIR/web" && npm install --silent)
```

**11. Dead `dev.sh` / `cursor_dev.sh` confusion**

Both `dev.sh` and `cursor_dev.sh` exist. `run.sh:85` and `launch.sh:97` both launch `dev.sh`, while `cursor_dev.sh` provides interactive mode with no inbox polling. The relationship is unclear and confusing.

**12. No `.gitignore`**

No `.gitignore` exists. The `shared/` directory (task files, logs, generated code, `firebase-debug.log`) would get committed if this were a git repo. Secrets could leak.

**13. No log rotation**

`team.log` grows unbounded. Long-running sessions will fill disk.

**14. `execSync` without timeout** (`server.js:115`)

```115:115:web/server.js
  try { execSync('tmux has-session -t ai_team 2>/dev/null'); return true; }
```

If tmux hangs, the Node.js event loop blocks. **Fix:** Add `{ timeout: 3000 }`.

---

### Summary Table

| # | Priority | File | Issue |
|---|----------|------|-------|
| 1 | P0 | `server.js:235` | `POST /api/paths` allows unrestricted projectRoot override |
| 2 | P0 | `server.js:365` | Server binds to `0.0.0.0` — expose to all network interfaces |
| 3 | P0 | `app.js:469-497` | XSS via `innerHTML` with filesystem names |
| 4 | P1 | `server.js:73` | parseConfig regex misses hyphenated values |
| 5 | P1 | `config.sh:119` | `date +%s%N` broken on macOS |
| 6 | P1 | `config.sh:76` | `cd` side-effect leaks to caller |
| 7 | P1 | `coordinator.sh` | No inbox polling (inconsistent with other agents) |
| 8 | P2 | `server.js:122` | Task filename collision risk |
| 9 | P2 | `server.js:194` | Unbounded SSE buffer allocation |
| 10 | P2 | `run.sh:177` | `npm install` on every launch |
| 11 | P2 | agents/ | Dead `dev.sh` vs `cursor_dev.sh` confusion |
| 12 | P2 | root | Missing `.gitignore` |
| 13 | P2 | logs | No log rotation |
| 14 | P2 | `server.js:115` | `execSync` without timeout |

---

Would you like me to fix any or all of these issues? I can tackle them by priority group (P0 security first, then P1 bugs, then P2 quality).

---
## Developer (Cursor): Based on Tech Lead architecture:
Date: Fri Mar  6 01:12:05 +07 2026

All implementation is complete. Here's a summary of what was done based on the Tech Lead architecture and PO requirements:

---

### Files Modified (5)

| File | Change |
|---|---|
| `src/components/Features.tsx` | 4 cards -> 6 cards (Contact Mgmt, Deal Pipeline, Email Automation, Analytics, Team Collab, Mobile App) |
| `src/components/Pricing.tsx` | Starter/Growth/Enterprise -> Free (฿0) / Pro (฿990) / Enterprise (Custom) |
| `src/components/SocialProof.tsx` | Updated metrics: 500+ companies, 1M+ deals, NPS 72, 99.9% uptime |
| `src/App.tsx` | Added HowItWorks section between Features and Pricing |
| `src/__tests__/Features.test.tsx` | Updated assertions for 6 features |
| `src/__tests__/Pricing.test.tsx` | Updated assertions for Free/Pro/Enterprise |

### Files Created (5)

| File | Purpose |
|---|---|
| `src/components/HowItWorks.tsx` | 3-step onboarding flow (PO "Should Have") |
| `src/__tests__/SocialProof.test.tsx` | Tests for metrics, logos, testimonials |
| `src/__tests__/FAQ.test.tsx` | Tests for accordion expand/collapse |
| `src/__tests__/Footer.test.tsx` | Tests for links and copyright |
| `src/__tests__/HowItWorks.test.tsx` | Tests for 3-step flow |

### Page Flow

Navbar -> Hero (US-01) -> SocialProof (US-04) -> Features 6-grid (US-02) -> HowItWorks (3 steps) -> Pricing Free/Pro/Enterprise (US-03) -> FAQ -> LeadCapture (US-05) -> Footer

### To verify locally:

```bash
cd crm-landing && npm install && npm run test:run && npm run build
```

Shell access was restricted during this session, so please run these commands manually to confirm everything builds and passes.

---
