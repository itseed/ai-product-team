## Tech Lead: review code in this project
Date: Thu Mar  5 23:06:43 +07 2026

Here's a comprehensive code review across the entire project.

---

## Code Review — AI Product Team

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  tmux Session (ai_team)                                  │
│  ┌───────────┬───────────┬───────────┐                  │
│  │  po.sh    │ tech_lead │ cursor_dev│  ← agents        │
│  ├───────────┼───────────┼───────────┤                  │
│  │  qa.sh    │ devops.sh │coordinator│                  │
│  └───────────┴───────────┴───────────┘                  │
│         ↕ file-based IPC (inbox/*.task)                  │
│  ┌─────────────────────────────────┐                    │
│  │  web/server.js :3030             │  ← dashboard      │
│  │  reads config.sh, inbox/, logs/ │                    │
│  └─────────────────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

The design is clean and well-structured for a dev tool. Core concerns below.

---

### 🔴 Critical Security Issues

**1. Arbitrary File Read via `/api/workspace/parse`** (`server.js:252-282`)

The endpoint accepts a `filePath` from the request body and reads any file on the server filesystem with no restrictions:
```js
const content = fs.readFileSync(resolved, 'utf8');  // line 261
```
An attacker can POST `{ "filePath": "/etc/passwd" }` or any sensitive file. This needs a whitelist of allowed directories.

**2. Shell Code Injection via `/api/config`** (`server.js:79-88`)

`updateConfig()` writes user-supplied values directly into `config.sh`, which all agents `source` on startup. A value like `claude"; rm -rf /; echo "` would be injected into the shell script.
```js
content = content.replace(regex, `$1${v}$2`);  // v is unvalidated
```
Fix: validate values against an allowlist (e.g., `/^[a-z0-9_-]+$/`).

**3. No Authentication on Any Endpoint**

The server binds to `0.0.0.0` (Express default), exposing all APIs on every network interface. Anyone on the same network can:
- Dispatch tasks to AI agents (`POST /api/task`)
- Overwrite `config.sh` (`POST /api/config`)
- Set arbitrary filesystem paths (`POST /api/paths`)
- Read project files (`GET /api/files/*`)

⚠️ For a local dev tool this is low risk, but document it explicitly.

---

### 🟠 High — Bugs

**4. macOS date `%N` not supported** (`config.sh:118`)

```bash
ts=$(date +%s%N)   # %N = nanoseconds — GNU only, not macOS
```
On macOS, this produces `1234567890N` as the filename. Tasks created from the coordinator may never sort/process correctly. Use `$(date +%s)_$$` (epoch + PID) instead.

**5. Glob expansion failure in `show_status`** (`coordinator.sh:60`)

```bash
count=$(ls "$INBOX_DIR/$role"/*.task 2>/dev/null | wc -l | tr -d ' ')
```
When no `.task` files exist, `ls` fails and the shell prints an error before stderr is suppressed. The `check_inbox` function in `config.sh:132-138` correctly uses `find -print0` — `show_status` should match that pattern.

**6. `call_ai` `cd` side-effect leaks to caller** (`config.sh:75`)

```bash
cursor)
  cd "${WORKSPACE_DIR:-$PROJECT_DIR/code}" 2>/dev/null
  echo "$full_prompt" | cursor agent --print 2>/dev/null
```
This `cd` mutates the calling process's working directory permanently. The `dev.sh` workaround (`cd "$WORKSPACE_DIR"` / `cd "$SCRIPT_DIR"`) is fragile. The `cd` should not be inside `call_ai` — it belongs only in the agent that needs it.

**7. Duplicate dev agent scripts** (`agents/dev.sh` vs `agents/cursor_dev.sh`)

`run.sh` and `launch.sh` both launch `cursor_dev.sh`, but `dev.sh` still exists and references `$AI_DEV` which is `"cursor"` — routing through `call_ai` in batch/headless mode. `cursor_dev.sh` runs it interactively. These two modes are incompatible. `dev.sh` appears to be dead code but is confusing. Remove or clearly document the distinction.

---

### 🟡 Medium — Code Quality

**8. XSS in file tree rendering** (`app.js:466, 490`)

```js
row.innerHTML = `<span class="tree-name">${item.name}</span>`;
```
`item.name` comes from filesystem paths. A file named `<img src=x onerror=alert(1)>` would execute JavaScript. Use `document.createElement` + `textContent`.

**9. Fragile JSONC parser** (`server.js:238-239`)

```js
text.replace(/\/\/[^\n]*/g, '')
```
This strips `//` inside JSON string values too. A path like `"workspace": "//network/share"` would be corrupted. Use a proper JSONC parser (e.g., `jsonc-parser`) or strip only at line start: `/^\s*\/\/[^\n]*/gm`.

**10. `parseConfig` regex misses hyphenated values** (`server.js:72`)

```js
const re = /^(AI_\w+)="(\w+)"/gm;
```
`\w` does not match `-`. Values like `claude-opus` or `claude-haiku-4-5` will silently return empty. Change to `[^"]+`.

**11. `npm install` on every launch** (`run.sh:177`)

```bash
(cd "$SCRIPT_DIR/web" && npm install --silent 2>/dev/null)
```
Slow on every start. Check `node_modules` exists first:
```bash
[[ -d "$SCRIPT_DIR/web/node_modules" ]] || (cd "$SCRIPT_DIR/web" && npm install --silent)
```

---

### 🟡 Medium — Reliability

**12. Task collision on `sendTask`** (`server.js:109`)

```js
const file = path.join(dir, `${Date.now()}.task`);
```
Millisecond precision can collide if two tasks are dispatched rapidly. Add a random suffix: `` `${Date.now()}_${Math.random().toString(36).slice(2)}.task` ``.

**13. SSE can allocate unbounded buffer** (`server.js:181`)

```js
const buf = Buffer.alloc(stat.size - lastSize);
```
If the log file grows several MB between ticks (e.g., a verbose AI response), this allocates all of it in one shot. Cap reads at e.g. 64KB and emit a truncation message.

**14. No log rotation**

`team.log` grows unbounded. Add rotation (e.g., max 10MB, keep 3 files) or truncate on session start.

---

### 🟢 What's Working Well

- `config.sh:read_input` — The 3-second polling with `read -t 3` is an elegant approach, avoids busy-looping
- `check_inbox` uses `find -print0 | sort -z` — correctly handles filenames with spaces
- `server.js` path traversal check at line 320 (`full.startsWith(path.resolve(projectRoot))`) — correct
- SSE reconnect logic in `app.js:123-127` — properly tears down and retries
- `buildFileTree` — clean recursive implementation with proper stat calls
- Agent scripts are DRY — all share config.sh helpers uniformly

---

### Priority Fix List

| Priority | File | Issue |
|----------|------|-------|
| P0 | `server.js:261` | Arbitrary file read — add path restriction |
| P0 | `server.js:83` | Shell injection in config values — add validation |
| P1 | `config.sh:118` | `%N` broken on macOS |
| P1 | `config.sh:75` | `cd` side-effect in `call_ai` |
| P2 | `app.js:466,490` | XSS in file tree |
| P2 | `server.js:72` | Regex missing hyphens in values |
| P2 | `server.js:238` | Fragile JSONC stripper |
| P3 | `run.sh:177` | Always-running npm install |
| P3 | `server.js:109` | Task filename collision |

Want me to fix any of these?

---
## Tech Lead: review code in this project
Date: Thu Mar  5 23:31:18 +07 2026

Here's the full code review:

---

## Code Review — AI Product Team

### Overall Assessment

The architecture is clean and well-structured for its purpose. Shell scripts handle tmux orchestration and agent I/O; Express handles the dashboard. Code is readable and consistently organized. Below are findings by severity.

---

### Security Issues

#### ⚠️ Critical — Path Traversal in `/api/task` (`server.js:212-213`)

```js
const targets = role === 'all' ? ['po', 'tech', 'dev', 'qa', 'devops'] : [role];
targets.forEach(r => sendTask(r, sender, task));
```

`role` is never validated against the allowed list when it's not `'all'`. `sendTask` does `path.join(INBOX_DIR, role)` — an attacker can POST `role: "../../etc"` and write a `.task` file anywhere on the filesystem that the process has write access to.

**Fix:**
```js
const VALID_ROLES = ['po', 'tech', 'dev', 'qa', 'devops'];
const targets = role === 'all' ? VALID_ROLES : [role];
if (!VALID_ROLES.includes(targets[0]))
  return res.status(400).json({ error: 'Invalid role' });
```

#### ⚠️ High — XSS via innerHTML with server/user data (`app.js`)

Three locations render untrusted data as raw HTML:

- `app.js:444`: `data.error` and `data.path` injected into `container.innerHTML`
- `app.js:274-286`: `f.name` and `f.absolutePath` from uploaded `.code-workspace` files — a malicious workspace file can inject arbitrary HTML/JS
- `app.js:469-471`: `item.name` from filesystem — if an attacker can create files in the project directory, filenames like `<img src=x onerror=alert(1)>` execute

**Fix:** Use `textContent` assignments or `createElement`/`appendChild` instead of template literals in `innerHTML`.

#### ⚠️ Medium — No authentication on web server (`server.js`)

The dashboard exposes task dispatch, file reading, config writing, and log streaming with zero auth. On a shared machine or network, anyone who reaches port 3030 has full control.

**Fix:** At minimum, bind to `127.0.0.1` only (it already does by default via `app.listen(PORT)` which binds `0.0.0.0` — explicitly pass `app.listen(PORT, '127.0.0.1', ...)`).

#### ⚠️ Medium — Unvalidated `sender` field written to task files (`server.js:123`)

```js
fs.writeFileSync(file, `FROM: ${sender}\nTIME: ...\nTASK: ${task}\n`);
```

`sender` comes from the POST body without sanitization. A `\nTASK: injected` value in `sender` can override the TASK field when parsed with `grep "^TASK:"` in shell agents.

---

### Performance Issues

#### ⚠️ Medium — `execSync` called on every SSE tick (`server.js:202`)

```js
res.write(`data: ${JSON.stringify({ inbox: getInboxCounts(), tmux: checkTmux() })}\n\n`);
```

`checkTmux()` calls `execSync('tmux has-session ...')` every 1500ms **per connected client**. With 5 clients, that's ~3,300 synchronous child process spawns per minute, blocking the Node.js event loop.

**Fix:** Cache the tmux status with a 5-second TTL or check it independently via `setInterval` and share the cached result.

---

### Shell Script Issues

#### `config.sh:76` — `cd` mutates calling shell's working directory

```bash
cursor)
  cd "${WORKSPACE_DIR:-$PROJECT_DIR/code}" 2>/dev/null
  echo "$full_prompt" | cursor agent --print 2>/dev/null
```

This `cd` changes the CWD of the agent script that called `call_ai`. In `dev.sh`, there's a compensating `cd "$SCRIPT_DIR"` after the call, but this is fragile. If `call_ai` errors and returns early, the CWD is left dirty.

**Fix:** Wrap in a subshell: `(cd "$WORKSPACE_DIR" && echo "$full_prompt" | cursor agent --print)`

#### `config.sh:93-100` — `draw_box` has misaligned padding for odd-length strings

```bash
local pad_title=$(( (width - ${#title} - 2) / 2 ))
printf "${color}│%*s${BOLD}%s%*s${NC}${color}│${NC}\n" \
  $pad_title "" "$title" $pad_title ""
```

Both sides get the same padding from integer division. For odd `(width - title_len)`, this produces boxes that are one character short, misaligning the border.

#### `shared/paths.sh` is sourced with `source` in `cursor_dev.sh:11`

```bash
[[ -f "$SHARED_DIR/paths.sh" ]] && source "$SHARED_DIR/paths.sh"
```

`paths.sh` is auto-generated by the web server. If the server writes invalid shell syntax (e.g., path with a `"` or `$` in it), sourcing it will corrupt the agent's environment.

**Fix:** The `savePaths` function in `server.js` should escape values properly, or use `printf '%q'` equivalents.

---

### Architecture Observations

#### No `.gitignore`
`web/node_modules/`, `shared/inbox/`, `shared/logs/`, `shared/project/`, `shared/paths.sh`, and `shared/paths.json` should all be gitignored. Currently `node_modules` would be committed.

#### `team.log` has no rotation
Unbounded log growth. The SSE handler tracks `lastSize` by byte offset which works fine, but the file will grow indefinitely. Add logrotate config or cap at N MB.

#### Two launcher scripts with duplicated logic (`launch.sh` vs `run.sh`)
`launch.sh` and `run.sh` duplicate `build_layout`/`build_agents_window`, dependency checks, and session management. `run.sh` is the canonical entry point per `run.sh` itself and `MEMORY.md`. `launch.sh` can be removed.

#### `cursor_dev.sh` is unused
The dev pane launches `agents/dev.sh` (which calls `cursor agent --print` via `call_ai`). `cursor_dev.sh` is an alternative that runs `cursor agent` interactively — but it's never invoked by any launcher. Worth documenting or removing to avoid confusion.

---

### Summary Table

| Severity | Issue | File | Line |
|---|---|---|---|
| Critical | Path traversal via unvalidated `role` | `server.js` | 212 |
| High | XSS in file/folder name rendering | `app.js` | 274, 444, 469 |
| Medium | No auth on web server | `server.js` | 365 |
| Medium | `sender` field injection in task files | `server.js` | 123 |
| Medium | `execSync` in SSE hot path | `server.js` | 202 |
| Low | `cd` side-effect in `call_ai` | `config.sh` | 76 |
| Low | `draw_box` padding off-by-one | `config.sh` | 93 |
| Low | `paths.sh` source without escaping | `cursor_dev.sh` | 11 |
| Debt | Duplicate launchers (`launch.sh` vs `run.sh`) | `launch.sh` | — |
| Debt | No `.gitignore` | — | — |
| Debt | No log rotation | `server.js` | 17 |

The most actionable quick wins are: fix the role validation in `/api/task`, replace the three `innerHTML` injections with safe DOM methods, and wrap the `cursor` case in `call_ai` in a subshell.

---
## Tech Lead: เริ่มพัฒนางานตามแผน
Date: Thu Mar  5 23:52:55 +07 2026

ก่อนดำเนินการ ขอสรุปแผนการแก้ไขทั้งหมดก่อน เพื่อให้เห็นภาพรวมของงาน:

---

## สรุปแผนพัฒนา

### Sprint 1 — Security Fixes (P0/P1 Blockers)

| # | ไฟล์ | ปัญหา | การแก้ |
|---|------|-------|--------|
| 1 | `server.js:212` | ไม่ validate `role` → path traversal | เพิ่ม `VALID_ROLES` whitelist |
| 2 | `server.js:123` | `sender` inject newline ได้ | sanitize ตัด `\r\n` |
| 3 | `server.js:412` | bind `0.0.0.0` → expose ทุก interface | bind `127.0.0.1` |
| 4 | `server.js:73` | regex `\w+` ไม่จับ `-` → `claude-opus` = empty | เปลี่ยนเป็น `[^"]+` |
| 5 | `server.js:115` | `execSync` ไม่มี timeout → block event loop | เพิ่ม `{ timeout: 3000 }` |
| 6 | `server.js:122` | filename ชนกันถ้า dispatch เร็ว | เพิ่ม random suffix |
| 7 | `app.js:483,508` | XSS via `innerHTML` + `item.name` | ใช้ `textContent` แทน |
| 8 | `config.sh:119` | `date +%s%N` ไม่รองรับ macOS | ใช้ `$(date +%s)_$$` |
| 9 | `config.sh:76` | `cd` ใน `call_ai` leak ไป caller | wrap ใน subshell `(cd ...)` |

### Sprint 2 — CRM Landing Page

จาก PO requirements (`po_notes.md`):
```
US-01: Hero Section     → Headline + CTA + Product screenshot
US-02: Social Proof     → Testimonials + Logo bar
US-03: Feature Cards    → 4 features พร้อม icon
US-04: Pricing Table    → 3 plans + toggle รายเดือน/ปี
US-05: Lead Capture     → Signup form
```

**Tech Stack สำหรับ Landing Page:**
```
Next.js 14 (App Router)
├── Tailwind CSS + shadcn/ui
├── Framer Motion (animations)
├── React Hook Form + Zod (form validation)
└── Vercel Analytics (conversion tracking)
```

**Component Architecture:**
```
app/
├── page.tsx                 ← root layout + sections
├── components/
│   ├── HeroSection.tsx      → US-01
│   ├── SocialProof.tsx      → US-02
│   ├── FeatureGrid.tsx      → US-03
│   ├── PricingTable.tsx     → US-04 (with toggle state)
│   ├── SignupForm.tsx        → US-05
│   └── Navbar.tsx
└── api/
    └── leads/route.ts       → POST handler + email
```

---

กำลังรอ permission เพื่อเขียนไฟล์ โปรด **อนุมัติ** การแก้ไข `server.js` เพื่อเริ่มลงมือ Sprint 1 ครับ

---
## Tech Lead: Based on Product Owner requirements:
Date: Fri Mar  6 01:06:15 +07 2026

It looks like your message got cut off — the Product Owner requirements weren't included.

Could you paste the requirements you'd like me to review and architect around?

---
## Tech Lead: Based on Product Owner requirements:
Date: Fri Mar  6 01:17:07 +07 2026

It looks like your message was cut off — the Product Owner requirements weren't included.

Could you paste the requirements you'd like me to review?

---
## Tech Lead: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 03:00:14 +07 2026

ในฐานะ **Tech Lead** ผมขอเสนอการออกแบบสถาปัตยกรรมและโครงสร้างทางเทคนิคสำหรับ **Real Estate Landing Page** (หน้าโครงการบ้านจัดสรร) โดยเน้นที่การทำ Performance (Core Web Vitals), SEO และ User Experience ในการค้นหาโครงการครับ

---

### 🏗️ System Architecture & Component Breakdown

เราจะใช้โครงสร้างแบบ Component-Based Architecture เพื่อให้สามารถนำไป Re-use ในโครงการใหม่ๆ ได้ง่าย

```text
Frontend: React (TypeScript) + Vite
Styling: Vanilla CSS (Custom Properties for Theming)
State Management: React Hooks (Context API for Search/Filter)

Components Architecture:
├── Layout/
│   ├── Navbar (Sticky, Transparent to Solid transition)
│   └── Footer (Sitemap, Social Media, Registration)
├── Hero/
│   └── SearchBar (Overlay on Hero image, Quick Filter by Location/Price)
├── ProjectSelection/
│   ├── FilterBar (Status: Pre-sale/Ready, Type: Single House/Townhome)
│   ├── ProjectGrid (Responsive grid layout)
│   └── ProjectCard (Skeleton loading, Image Lazy-loading)
├── LeadCapture/
│   └── InquiryForm (Multi-step form for better conversion)
└── TrustSignals/
    ├── Testimonials
    └── Certification/Awards
```

---

### 📊 Data Schema (TypeScript Interface)

การออกแบบ Model สำหรับโครงการบ้านต้องครอบคลุมทั้งข้อมูลพื้นฐานและสถานะการขาย

```typescript
// types/project.ts
export interface Project {
  id: string;
  name: string;
  brand: 'Prestige' | 'Modem' | 'Eco-Living'; // แบ่งตาม segment
  type: 'SingleHouse' | 'Townhome' | 'Condo';
  location: {
    zone: string; // เช่น บางนา, พระราม 9
    lat: number;
    lng: number;
  };
  priceRange: {
    start: number; // Unit: Baht
    end?: number;
  };
  status: 'Pre-sale' | 'ReadyToMove' | 'SoldOut';
  thumbnailUrl: string;
  features: string[]; // ['Smart Home', 'Clubhouse', 'Pool']
  slug: string; // สำหรับ SEO Friendly URL
}
```

---

### 🛠️ Technical Decisions & Recommendations

1.  **Performance Optimization**:
    *   **Image Optimization**: ใช้ WebP format และทำ `srcset` สำหรับ Mobile/Desktop
    *   **Critical CSS**: แยก CSS ของ Hero Section ออกมาโหลดก่อนเพื่อลด LCP (Largest Contentful Paint)
2.  **Filtering Logic**:
    *   ควรทำแบบ **Client-side Filtering** ในกรณีที่มีโครงการไม่เกิน 50 โครงการ เพื่อความรวดเร็ว (Instant Response)
3.  **SEO Strategy**:
    *   ใช้ **Server-Side Rendering (SSR)** หรือ **Static Site Generation (SSG)** (แนะนำ Next.js หากต้องการ Scale ในอนาคต)
    *   Schema.org markup: ใส่ `Product` และ `RealEstateListing` เพื่อให้ Google แสดงผล Rich Snippets

---

### ⚠️ Technical Risks & Mitigation

*   **Risk 1: High Resolution Images**: รูปบ้านตัวอย่างมักจะไฟล์ใหญ่มาก
    *   *Mitigation*: ใช้ CDN (เช่น Cloudinary/Imgix) ในการทำ Auto-resize และ Compression
*   **Risk 2: Form Spam**: หน้า Landing Page มักเจอบอทกรอกข้อมูล
    *   *Mitigation*: Implement Google reCAPTCHA v3 (Non-intrusive)
*   **Risk 3: Map API Cost**: หากใช้ Google Maps API ในทุก Card จะเสียค่าใช้จ่ายสูง
    *   *Mitigation*: ใช้ Static Map Image ในหน้า List และโหลด Interactive Map เฉพาะเมื่อ User คลิกดูตำแหน่ง

---

### 🚀 Next Steps (Implementation Roadmap)

1.  **Phase 1**: สถาปนาโครงสร้าง Folder และ Mock Data ตาม Interface ที่ออกแบบไว้
2.  **Phase 2**: พัฒนา `ProjectCard` และ `FilterBar` (Core Functionality)
3.  **Phase 3**: เชื่อมต่อระบบ CRM ผ่าน API เพื่อส่งข้อมูล Lead
4.  **Phase 4**: ทำ Unit Test สำหรับ Filtering Logic (ใช้ Vitest)

ต้องการให้ผมเริ่มลงรายละเอียดในส่วนของ **Project Selection UI** หรือ **Lead Capture Form** ก่อนดีครับ?

---
## Tech Lead: Based on Product Owner requirements:
Date: Fri Mar  6 03:03:11 +07 2026

I will read the Product Owner's notes to understand the current requirements and project status.
I will examine the existing codebase for the CRM landing page to determine the current progress and identify what needs to be implemented.
I'll review the current task list to understand what's already planned or in progress, ensuring I don't duplicate efforts or miss any critical priorities.
I'll check the current project's `package.json` to identify the established tech stack, ensuring consistency and adherence to workspace conventions for the new landing page.
Based on the Product Owner's requirements for the **Real Estate Landing Page (Multi-Project)** and the current state of the project, I have defined the system architecture and technical specifications.

### 🏠 Real Estate Landing Page: Technical Specification

This project will follow the existing workspace conventions: **React 19 + TypeScript + Vite + TailwindCSS 4**.

#### 1. Component Architecture
The application will be organized into functional, atomic components for reusability and testability.

```text
/src
├── /components
│   ├── /common
│   │   ├── Button.tsx          (Reusable CTA)
│   │   ├── Card.tsx            (Base card style)
│   │   └── Input.tsx           (Styled form inputs)
│   ├── /Hero
│   │   ├── Hero.tsx            (Main viewport)
│   │   └── SearchFilter.tsx    (Location/Type/Price search)
│   ├── /Projects
│   │   ├── ProjectGallery.tsx  (Grid container)
│   │   ├── ProjectCard.tsx     (Image, Price, Status badge)
│   │   └── CategoryNav.tsx     (Tabs for House/Condo/Townhome)
│   ├── /LeadCapture
│   │   └── InquiryForm.tsx     (Validation + Success state)
│   └── /Layout
│       ├── Navbar.tsx
│       └── Footer.tsx
├── /hooks
│   └── useProjects.ts          (Data fetching & filtering logic)
├── /types
│   └── index.ts                (Project & Category interfaces)
└── /data
    └── projects.ts             (Initial mock data for MVP)
```

#### 2. Technical Decisions & Data Model
- **Filtering Strategy:** Client-side filtering for the MVP (using `useMemo` for performance). If the project count exceeds 100, we will move to server-side query parameters.
- **Image Optimization:** Implement `loading="lazy"` and `srcset` for high-quality project images to maintain Lighthouse scores ≥ 90.
- **Form Handling:** Controlled components with native HTML5 validation + custom regex for phone numbers.

**Data Schema (`Project`):**
```typescript
interface Project {
  id: string;
  name: string;
  type: 'House' | 'Condo' | 'Townhome';
  location: string;
  priceStart: number;
  status: 'Pre-sale' | 'Ready to move' | 'Sold out';
  imageUrl: string;
  amenities: string[];
}
```

---

### 🚨 Critical Risks & Blockers (⚠️)

Before proceeding with the new landing page, we MUST address the following vulnerabilities found in the core system (`server.js`):

1.  **⚠️ Shell Injection (High):** `POST /api/config` writes directly to `config.sh`.
    *   *Solution:* Implement a strict allowlist regex `^[A-Za-z0-9_/. -]+$` for all config values.
2.  **⚠️ Arbitrary File Read (Medium):** `POST /api/workspace/parse` accepts any path.
    *   *Solution:* Resolve the requested path and ensure it starts with the `projectRoot` directory using `path.resolve` and `.startsWith()`.
3.  **⚠️ Local Network Exposure:** Bind the server to `127.0.0.1` explicitly to prevent accidental external access.

---

### 📋 Task Breakdown (Sprint 1)

**Task 1: Security Hardening (P0)**
- [ ] Implement input sanitization in `server.js` for config updates.
- [ ] Add path restriction guards to `workspace/parse` endpoint.
- [ ] Update `app.listen` to bind only to `localhost`.

**Task 2: Real Estate Project Scaffolding (P1)**
- [ ] Initialize `real-estate-landing` project structure.
- [ ] Implement `Hero` and `SearchFilter` components with basic state.
- [ ] Create `ProjectCard` and `ProjectGallery` to display mock data.

**Task 3: Lead Capture & Conversion (P1)**
- [ ] Build `InquiryForm` with validation.
- [ ] Implement `CategoryNav` for filtering by property type.

**Next Action:** I am ready to assign these to the Dev team. Should we fix the security blockers first, or start the UI prototype in parallel?

---
## Tech Lead: Based on Product Owner requirements:
Date: Fri Mar  6 03:32:36 +07 2026

It looks like your message got cut off - you mentioned "Based on Product Owner requirements:" but didn't include the actual requirements.

Could you share the Product Owner requirements you'd like me to review and break down into technical tasks? I can help with:

- **Architecture design** for the proposed features
- **Technical task breakdown** with clear acceptance criteria
- **Technology evaluation** and recommendations
- **Risk assessment** and technical debt identification
- **Implementation specifications** with code examples

Please paste the requirements and I'll get started.

---
## Tech Lead: Based on Product Owner requirements:
Date: Fri Mar  6 03:32:52 +07 2026

It looks like your message got cut off - you mentioned "Based on Product Owner requirements:" but didn't include the actual requirements.

Could you share the Product Owner requirements you'd like me to review and break down? I can then:

- Design the system architecture
- Break down into implementable tasks
- Evaluate technology choices
- Identify risks and technical debt
- Create technical specifications

Please paste the requirements or point me to a file in the project that contains them.

---
