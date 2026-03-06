## DevOps: review code in this project
Date: Thu Mar  5 23:05:43 +07 2026

Here's my DevOps & security review of the project:

---

## Code Review — AI Product Team

### Architecture Summary
A multi-agent tmux orchestration system: shell scripts (agents, coordinator, config) + Node.js dashboard (Express + SSE). Agents communicate via file-based inbox (`shared/inbox/<role>/*.task`).

---

### Security Issues

#### 🔴 Critical

**1. Unrestricted file read via `/api/files/*` path traversal (partial)**
`server.js:319-321` — The path check `full.startsWith(path.resolve(projectRoot))` can be bypassed if `projectRoot` itself is controlled. More critically, `POST /api/paths` (`server.js:222-233`) lets any caller change `projectRoot` to `/` or any path on the filesystem, then `/api/files/*` reads those files. No auth whatsoever.

**2. `POST /api/config` writes to `config.sh` with no input validation**
`server.js:79-88` — The regex replacement `updateConfig()` blindly writes user-supplied values into `config.sh`. An attacker can inject shell metacharacters that execute when any agent sources `config.sh`.

**3. `POST /api/workspace/parse` reads arbitrary server-side paths**
`server.js:252-282` — `filePath` from the request body is resolved to an absolute path and read with no restriction. Can read `/etc/passwd`, SSH keys, `.env` files, etc.

**4. No authentication on the dashboard**
All API endpoints are unauthenticated and accept arbitrary POST bodies. Anyone with network access to port 3030 can route tasks to all agents, modify config, and read filesystem files.

#### 🟡 Medium

**5. Task content injected unsanitized into shell prompts**
`config.sh:57-59` — `call_ai` builds `full_prompt="$system\n\nUser request: $input"`. If `$input` comes from an inbox file controlled by the web API (which accepts raw task strings), an attacker could craft a prompt that, when echoed to Claude's stdin, attempts prompt injection.

**6. `cd` in `call_ai` for cursor is side-effect-y**
`config.sh:75` — `cd "${WORKSPACE_DIR:-$PROJECT_DIR/code}"` changes the working directory of the caller's shell subprocess permanently. Not dangerous per se but fragile.

**7. Log file appended without size limit**
`shared/logs/team.log` grows unbounded. Long-running sessions will eventually fill disk.

**8. `execSync('tmux has-session ...')` without timeout**
`server.js:102` — If tmux hangs, the Node process blocks synchronously.

**9. `firebase-debug.log` present in project root**
Suggests Firebase credentials or project config may have been used here. Verify no secrets are committed.

#### 🟢 Low / Observations

- `run.sh:177` — `npm install --silent` runs on every launch; should pin to `npm ci` with a lockfile for reproducibility.
- `config.sh:63` — `claude --print` falls back to `claude -p` — if the primary fails silently, errors are swallowed entirely.
- `coordinator.sh:60` — `ls "$INBOX_DIR/$role"/*.task` will error (and emit to stderr) if glob expands to nothing; should use `find` (already done in `check_inbox` in `config.sh` — inconsistent).
- `setup.sh` — `mkdir -p` with no permission restrictions; inbox dirs are world-readable by default on most systems.
- No `.gitignore` visible — `shared/` directory (with task files, logs, and generated code) may get committed.

---

### Top Fixes (Priority Order)

| # | Issue | Fix |
|---|-------|-----|
| 1 | No auth on dashboard | Add basic auth middleware or bind to `127.0.0.1` only (`app.listen(PORT, '127.0.0.1', ...)`) |
| 2 | Arbitrary file read via `/api/workspace/parse` | Restrict `filePath` to a whitelist of allowed directories |
| 3 | Config write allows shell injection | Validate `v` against `[a-z]+` allowlist in `updateConfig()` |
| 4 | `projectRoot` overridable by API | Remove the paths POST endpoint or require admin token |
| 5 | Log rotation | Add `maxBytes` check or use `logrotate` |

**Quick localhost-only fix** for the dashboard (most impactful, one-line):

```js
// server.js:329 — bind to localhost only
app.listen(PORT, '127.0.0.1', () => { ... });
```

This alone eliminates all network-based attacks since the system is local-only by design.

---

### What's Done Well
- File-based inbox pattern is simple, debuggable, and crash-safe (files persist across agent restarts)
- `check_inbox` uses `find -print0` + `sort -z` (null-safe, correct)
- `mark_done` renames rather than deletes — audit trail preserved
- `read_input` 3s poll loop avoids busy-waiting
- SSE implementation correctly handles `req.on('close')` to clean up intervals
- `savePaths` resolves `~` and calls `path.resolve` before writing

---
## DevOps: เริ่มพัฒนางานตามแผน
Date: Thu Mar  5 23:52:41 +07 2026

ดูเหมือนต้องการการอนุมัติเพื่อแก้ไขไฟล์ ขอสรุปแผนงานที่จะดำเนินการก่อน:

---

## DevOps Sprint Plan — สรุปงานที่จะดำเนินการ

### ก. Security Fixes (P0 — Critical) — `server.js`

| # | ปัญหา | ไฟล์:บรรทัด | การแก้ไข |
|---|---|---|---|
| 1 | `role` ไม่ validate → path traversal | `server.js:212` | เพิ่ม `VALID_ROLES` check + `res.status(400)` |
| 2 | `sender` ไม่ sanitize → field injection | `server.js:123` | Strip `\r\n` + cap 64 chars |
| 3 | Server bind `0.0.0.0` → network exposed | `server.js:412` | `app.listen(PORT, '127.0.0.1', ...)` |

### ข. Performance Fix — `server.js`

| # | ปัญหา | การแก้ไข |
|---|---|---|
| 4 | `execSync(tmux)` ทุก 1500ms ต่อ client | Cache result 5s TTL |
| 5 | SSE buffer ไม่จำกัดขนาด | Cap read ที่ 64KB |
| 6 | Task filename collision (millisecond) | เพิ่ม random suffix |

### ค. Regex Bug Fix — `server.js`

| # | ปัญหา | การแก้ไข |
|---|---|---|
| 7 | `parseConfig` regex `/\w+/` ไม่ match hyphen | เปลี่ยนเป็น `[^"]+` |

### ง. Shell Script Fixes — `config.sh`, `run.sh`

| # | ปัญหา | การแก้ไข |
|---|---|---|
| 8 | `date +%s%N` ใช้ไม่ได้บน macOS | เปลี่ยนเป็น `date +%s`_`$$` |
| 9 | `call_ai` cursor ทำ `cd` side-effect | Wrap ใน subshell |
| 10 | `run.sh` รัน `npm install` ทุกครั้ง | Check `node_modules` ก่อน |

### จ. Infra / DevOps Setup

| # | งาน |
|---|---|
| 11 | เพิ่ม `.gitignore` (node_modules, shared/, logs) |
| 12 | เขียน CI/CD pipeline plan สำหรับ SaaS CRM landing page |

---

⚠️ **ต้องการการอนุมัติเพื่อแก้ไขไฟล์** — กรุณากดอนุมัติเมื่อ tool ขอ permission จะเริ่ม fix ทีละข้อตามลำดับ priority

พร้อมเริ่มได้เลยไหมครับ? หรือต้องการ review แผนก่อน?

---
## DevOps: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 02:58:39 +07 2026

You've hit your limit · resets 4am (Asia/Bangkok)
You've hit your limit · resets 4am (Asia/Bangkok)
[Error] Claude CLI unavailable

---
