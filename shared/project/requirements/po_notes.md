## PO: review code in this project
Date: Thu Mar  5 23:05:36 +07 2026

Here's my Product Owner review of the codebase:

---

## Code Review — AI Product Team

### What the System Does
A multi-agent AI team simulator: 5 role-based agents (PO, Tech Lead, Dev, QA, DevOps) run in tmux panes, each backed by a different AI CLI (Claude/Gemini/Cursor). A Node.js/Express web dashboard dispatches tasks via file-based inbox queues and streams logs via SSE.

---

### Strengths
- **Clean separation of concerns** — each agent is self-contained in its own `.sh` file, all sharing `config.sh` helpers
- **Consistent patterns** — all agents use the same `read_input` / `call_ai` / `log_event` pattern; new agents are trivial to add
- **File-based queue** — simple, no external dependencies (no Redis, no message broker); easy to debug
- **Web dashboard integration** — SSE live log, inbox counts, config editor, file browser — solid feature set
- **Path traversal protection** in `server.js:320` — `full.startsWith(path.resolve(projectRoot))` guard is correct

---

### Issues Found

#### Security
| Severity | Location | Issue |
|---|---|---|
| **High** | `server.js:211-213` | `updateConfig()` writes user-supplied values directly into `config.sh` with no input sanitization — shell injection risk if malicious content is sent to `POST /api/config` |
| **Medium** | `server.js:252-282` | `POST /api/workspace/parse` reads arbitrary server-side file paths from request body — no path restriction; an attacker can read any file the server process can access |
| **Low** | `server.js:164` | SSE endpoint sets `Access-Control-Allow-Origin: *` — fine for local dev, but a concern if ever exposed publicly |

#### Functional Bugs
| Location | Issue |
|---|---|
| `config.sh:63` | `call_ai` for Claude tries `--print` then falls back to `-p` — if `--print` hangs instead of failing, the fallback never runs |
| `coordinator.sh:60` | `ls "$INBOX_DIR/$role"/*.task 2>/dev/null \| wc -l` — glob fails silently when no files exist; `wc -l` still returns `0`, so this is safe but fragile on some shells |
| `cursor_dev.sh:35` | `exec cursor agent --workspace "$WORKSPACE_DIR"` — no inbox polling loop; tasks routed via `@dev` go to the file inbox but `cursor_dev.sh` never reads them (it hands off immediately to the interactive cursor agent) |

#### Consistency / Design
| Location | Issue |
|---|---|
| Agent banners | `po.sh` says "Claude (Opus)", `tech_lead.sh` says "Claude (Sonnet)", `devops.sh` says "Claude (Haiku)" — but `config.sh` assigns all three the same `claude` command with no model differentiation. The banners are misleading. |
| `dev.sh` (unused) | There's both `dev.sh` and `cursor_dev.sh`. `run.sh:85` launches `cursor_dev.sh`, but `dev.sh` still exists — dead code risk |
| `server.js:239` | `parseJsonc` regex-strips comments before JSON parsing — this is fragile for strings containing `//` |

---

### Backlog Items (Prioritized)

**Must (MVP blockers)**
- [ ] Sanitize inputs to `POST /api/config` to prevent shell injection
- [ ] Restrict `POST /api/workspace/parse` to whitelisted directories

**Should**
- [ ] Add inbox polling to `cursor_dev.sh` (or have coordinator relay tasks differently to the dev pane)
- [ ] Unify Claude model spec in `config.sh` — use `--model` flag or remove misleading banner text

**Could**
- [ ] Remove or document `dev.sh` (unused since `cursor_dev.sh` replaced it)
- [ ] Replace `parseJsonc` comment stripping with a proper JSONC parser

**Won't (out of scope for local tool)**
- Authentication on the web dashboard (local-only use case)

---

Overall this is well-structured, readable shell+Node code with a clear architecture. The two security items in `server.js` are the priority fixes before any wider sharing or deployment.

---
## PO: Check all feature to ready to release
Date: Thu Mar  5 23:06:22 +07 2026

---

## Release Readiness Assessment — AI Product Team v1.0

**Assessment Date:** 2026-03-05 | **Sprint Status:** Pre-Release Review

---

## Feature Inventory & Release Gate Status

| Feature | Status | Release Gate |
|---|---|---|
| Multi-agent tmux orchestration (6 panes) | ✅ Done | PASS |
| File-based inbox task queue | ✅ Done | PASS |
| Coordinator task routing (`@po`, `@tech`, `@dev`, `@qa`, `@devops`, `@all`) | ✅ Done | PASS |
| Web dashboard (SSE live log, agent cards, task router) | ✅ Done | PASS |
| Config editor (web UI) | ✅ Done | **BLOCKED** |
| File browser (project files) | ✅ Done | **BLOCKED** |
| `run.sh` single-command launcher | ✅ Done | PASS |
| Cursor Dev agent (file write to `shared/project/code/`) | ✅ Done | CONDITIONAL |

---

## Blockers — **NOT RELEASE-READY** ❌

These are **Must-fix** items before any release or sharing:

### 🔴 Critical Security (2 open)
1. **Shell injection via `POST /api/config`** (`server.js:79-88`)
   - User-supplied values written directly into `config.sh` — no sanitization
   - **Acceptance Criteria:** Values must match `[A-Za-z0-9_/. -]+` allowlist before write

2. **Arbitrary file read via `POST /api/workspace/parse`** (`server.js:252-282`)
   - Any file path accepted — attacker can read SSH keys, `/etc/passwd`, `.env`
   - **Acceptance Criteria:** `filePath` restricted to whitelisted project directories only

---

## Conditional Items — **Release with Caveats** ⚠️

| Item | Condition |
|---|---|
| Cursor Dev agent | Works for interactive use; inbox polling missing — `@dev` tasks go unread |
| Dashboard (`app.listen`) | Bind to `127.0.0.1` only before any network exposure |
| Agent model banners | Currently misleading (all Claude, no `--model` differentiation) |

---

## Ready to Release ✅

- Core agent loop (PO, Tech Lead, QA, DevOps)
- Coordinator routing logic
- `run.sh` / `start-web.sh` launchers
- SSE log streaming
- `mark_done` audit trail (rename vs delete)
- `check_inbox` (null-safe, sort-stable)

---

## Release Decision (MoSCoW)

| Priority | Item | Verdict |
|---|---|---|
| **Must** | Fix shell injection in config writer | ❌ Open — blocks release |
| **Must** | Fix arbitrary file read in workspace parser | ❌ Open — blocks release |
| **Should** | Add inbox polling to `cursor_dev.sh` | Not blocking MVP |
| **Should** | Bind server to `127.0.0.1` | Quick win — do before release |
| **Could** | Remove dead `dev.sh` | Tech debt |
| **Could** | Add `.gitignore` for `shared/` | Prevents secret leaks in git |
| **Won't** | Dashboard authentication | Out of scope (local tool) |

---

## QA Gap — No Test Artifacts Found

`shared/project/tests/` is **empty**. No test results from QA are on record. Before releasing:
- [ ] QA sign-off required on core agent routing flows
- [ ] Smoke test: `run.sh` → web dashboard → task dispatch → inbox delivery

---

## PO Verdict: **NOT READY FOR RELEASE** 🚫

**2 critical security items remain open.** Once those are fixed and QA provides a smoke test sign-off, the product is releasable as a **local developer tool**.

**Next Action:** Route security fixes to Tech Lead + Dev via `@tech` / `@dev`, then re-run QA before tagging v1.0.

---
## PO: ออกแบบ landing page สำหรับขาย CRM แบบ SaaS
Date: Thu Mar  5 23:49:48 +07 2026

# Landing Page — SaaS CRM Product

## Product Vision
**"CRM ที่ทีมขายรัก — เริ่มใช้ได้ใน 5 นาที ไม่ต้องฝึกอบรม"**

---

## Target Users (Personas)
| Persona | คำอธิบาย | Pain Point |
|---|---|---|
| **SME Owner** | เจ้าของธุรกิจ 10-50 คน | ไม่มีเวลาดูแลระบบซับซ้อน |
| **Sales Manager** | หัวหน้าทีมขาย | ต้องการ visibility ทีม real-time |
| **Sales Rep** | พนักงานขาย | อยากบันทึก lead เร็ว ๆ จากมือถือ |

---

## Epic: Landing Page เพื่อ Conversion

### User Stories (MVP)

---

**US-01 — Hero Section**
> As a SME Owner, I want to see value proposition ชัดเจนในหน้าแรก, so that I can understand ภายใน 5 วินาทีว่า CRM นี้แก้ปัญหาอะไร

**Acceptance Criteria:**
- **Given** ผู้เยี่ยมชมเข้าหน้าเว็บ
- **When** โหลดหน้าเสร็จ
- **Then** เห็น Headline, Sub-headline, CTA button ("ทดลองฟรี 14 วัน"), และภาพ product screenshot ภายใน viewport แรก

---

**US-02 — Social Proof Section**
> As a prospective buyer, I want to see testimonials และ logos ลูกค้า, so that I can trust ว่าผลิตภัณฑ์ใช้งานจริง

**Acceptance Criteria:**
- **Given** ผู้เยี่ยมชม scroll ลงมา
- **When** เห็น social proof section
- **Then** แสดง: จำนวนลูกค้า (e.g. "500+ ทีมไว้วางใจ"), logo แถบ, testimonial cards พร้อมรูปและชื่อ

---

**US-03 — Feature Highlights**
> As a Sales Manager, I want to see features หลัก 3-4 ข้อ พร้อม visual, so that I can evaluate ว่าตรงความต้องการทีมไหม

**Acceptance Criteria:**
- **Given** ผู้เยี่ยมชมอ่าน features section
- **When** เห็น feature cards
- **Then** แต่ละ card มี icon, ชื่อฟีเจอร์, คำอธิบาย 1-2 บรรทัด เช่น:
  - Pipeline Management
  - Mobile App
  - Auto Follow-up
  - Analytics Dashboard

---

**US-04 — Pricing Section**
> As a decision maker, I want to เห็น pricing plans เปรียบเทียบ, so that I can ตัดสินใจ plan ที่เหมาะกับทีม

**Acceptance Criteria:**
- **Given** ผู้เยี่ยมชมดู pricing
- **When** เห็น pricing table
- **Then** แสดง 3 plans (Starter / Growth / Enterprise), highlight "Most Popular", มี CTA ต่อ plan, และ toggle รายเดือน/รายปี (ประหยัด 20%)

---

**US-05 — Lead Capture / CTA**
> As a visitor, I want to ลงทะเบียนทดลองฟรีได้ทันที, so that I can เริ่มใช้โดยไม่ต้องคุยกับ sales ก่อน

**Acceptance Criteria:**
- **Given** ผู้เยี่ยมชมคลิก CTA
- **When** กรอก form (Email, ชื่อบริษัท, เบอร์โทร)
- **Then** ได้รับ confirmation email ภายใน 1 นาที และถูก redirect ไป onboarding page

---

## MoSCoW Prioritization

| Priority | Feature |
|---|---|
| **Must** | Hero, Feature Highlights, CTA/Sign-up form |
| **Should** | Pricing, Social Proof, FAQ |
| **Could** | Demo video, Live chat widget, Blog section |
| **Won't (v1)** | Multi-language, Partner marketplace |

---

## Definition of Done (Landing Page)
- [ ] Load time < 3 วินาที (Lighthouse score ≥ 90)
- [ ] Mobile responsive ทุก breakpoint
- [ ] A/B test CTA copy ได้ (ผ่าน feature flag)
- [ ] Google Analytics + Meta Pixel ติดครบ
- [ ] Conversion rate tracking: visitor → sign-up

---

## Sprint Goal (Sprint 1)
**"ส่ง landing page MVP ที่รับ lead ได้จริง ภายใน 2 สัปดาห์"**

ต้องการให้ผมเขียน detailed AC เพิ่มเติม หรือต้องการให้ส่งต่อให้ Tech Lead ออกแบบ component structure ต่อไปไหมครับ?

---
## PO: เริ่มพัฒนางานตามแผน
Date: Thu Mar  5 23:51:41 +07 2026

## Sprint Planning — เริ่ม Sprint 1

จากการ review ที่ผ่านมา มี **2 แผนที่รอพัฒนา**:

---

### แผน A: แก้ Security Issues (AI Product Team Tool)
**สถานะ:** ❌ NOT READY FOR RELEASE — บล็อก 2 critical items

| Priority | Task | Owner |
|---|---|---|
| **P0** | Fix shell injection in `POST /api/config` (`server.js:83`) | Dev |
| **P0** | Fix arbitrary file read in `POST /api/workspace/parse` (`server.js:261`) | Dev |
| **P0** | Bind server to `127.0.0.1` (one-line fix) | Dev |
| **P1** | Fix XSS in file tree (`app.js:469`) | Dev |
| **P1** | Fix `date +%s%N` macOS bug (`config.sh:119`) | Dev |

---

### แผน B: CRM SaaS Landing Page (Sprint 1 Goal)
**Sprint Goal:** _"ส่ง landing page MVP ที่รับ lead ได้จริง ภายใน 2 สัปดาห์"_

| Story | Priority | Status |
|---|---|---|
| US-01 Hero Section | Must | Ready for Dev |
| US-03 Feature Highlights | Must | Ready for Dev |
| US-05 Lead Capture / CTA | Must | Ready for Dev |
| US-02 Social Proof | Should | Backlog |
| US-04 Pricing Section | Should | Backlog |

---

## PO Recommendation

**แนะนำลำดับนี้:**
1. **ทำ Security fixes ก่อน** (P0 — ใช้เวลา ~2 ชั่วโมง) → unblock release
2. **ตามด้วย Landing Page Sprint 1** → ส่ง Hero + Features + CTA form

---

**ต้องการเริ่มแผนไหนก่อน?**
- `A` — Security fixes (AI Product Team)
- `B` — CRM Landing Page development
- `AB` — Security ก่อน แล้วต่อ Landing Page

---
## PO: ออกแบบหน้า landing page เกี่ยวกับระบบ CRM แบบ SaaS
Date: Fri Mar  6 01:04:55 +07 2026

## Product Backlog — SaaS CRM Landing Page

### Epic: Landing Page สำหรับระบบ CRM แบบ SaaS

---

### MVP Scope (MoSCoW)

**Must Have**
- Hero section — Value proposition + CTA หลัก
- Features section — ฟีเจอร์เด่น 3–6 ข้อ
- Social Proof — ตัวเลข / testimonials
- Pricing section — แผนราคา (Free / Pro / Enterprise)
- CTA section — ลงทะเบียนทดลองใช้ฟรี
- Navigation + Footer

**Should Have**
- How it works section (3 steps)
- FAQ section
- Demo video embed / screenshot

**Could Have**
- Live chat widget
- Blog teaser
- Integration logos (Slack, Gmail, etc.)

**Won't Have (v1)**
- Multi-language toggle
- Animated onboarding tour

---

### User Stories

#### US-01: Hero Section
> **As a** prospect ที่เพิ่งเข้าเว็บ,
> **I want** เห็น headline ที่ชัดเจนว่าระบบนี้แก้ปัญหาอะไร,
> **so that** ฉันตัดสินใจได้ว่าจะอ่านต่อหรือไม่

**Acceptance Criteria:**
- Given ผู้ใช้เข้าหน้าเว็บ, When โหลดเสร็จ, Then เห็น headline ≤ 10 คำ + sub-headline ≤ 20 คำ
- มี CTA button "ทดลองใช้ฟรี 14 วัน" ที่ครึ่งบนของหน้า (above the fold)
- ไม่ต้องกรอก credit card

#### US-02: Features Section
> **As a** decision maker,
> **I want** เห็นฟีเจอร์หลักพร้อม icon และคำอธิบาย,
> **so that** ฉันประเมินได้ว่าระบบตอบโจทย์ธุรกิจหรือไม่

**Acceptance Criteria:**
- Given เลื่อนลงมาถึง features, Then เห็นการ์ด 6 ฟีเจอร์: Contact Management, Deal Pipeline, Email Automation, Analytics Dashboard, Team Collaboration, Mobile App
- แต่ละการ์ดมี icon + title + คำอธิบาย 2 บรรทัด

#### US-03: Pricing Section
> **As a** SMB owner,
> **I want** เห็นแผนราคาที่เปรียบเทียบกันได้ชัดเจน,
> **so that** ฉันเลือกแผนที่เหมาะสมกับงบประมาณ

**Acceptance Criteria:**
- Given ดูหน้า pricing, Then เห็น 3 tier: Free / Pro (฿990/เดือน) / Enterprise (custom)
- Pro tier มี badge "Popular"
- แต่ละ tier แสดง feature list + CTA button

#### US-04: Social Proof
> **As a** prospect ที่ยังลังเล,
> **I want** เห็นว่ามีบริษัทอื่นใช้แล้วได้ผลจริง,
> **so that** ฉันมั่นใจพอที่จะลงทะเบียน

**Acceptance Criteria:**
- แสดง metric: "บริษัท 500+ ไว้วางใจ", "ดีล 1M+ บันทึกแล้ว", "NPS 72"
- มี testimonial ≥ 3 รายการ พร้อมรูป + ชื่อ + ตำแหน่ง

---

### Definition of Done
- [ ] Responsive (Mobile / Tablet / Desktop)
- [ ] Lighthouse Performance ≥ 90
- [ ] CTA ทุกจุดเชื่อมกับ signup flow
- [ ] Copy ผ่าน stakeholder review

---

ต้องการให้สร้างโค้ด Landing Page จริงด้วยไหม? สามารถใช้ `/frontend-design` เพื่อ generate UI ได้เลย

---
## PO: ออกแบบหน้า landing page เกี่ยวกับระบบ CRM แบบ SaaS
Date: Fri Mar  6 01:14:33 +07 2026

# Product Brief: SaaS CRM Landing Page

## Product Vision
แพลตฟอร์ม CRM แบบ SaaS ที่ช่วยให้ทีมขายจัดการลูกค้า ติดตามดีล และเพิ่มรายได้ — ใช้งานได้ทันที ไม่ต้องติดตั้ง

---

## Target Users
- **Primary:** Sales Manager / ผู้จัดการฝ่ายขาย (ตัดสินใจซื้อ)
- **Secondary:** Sales Rep / พนักงานขาย (ผู้ใช้งานรายวัน)
- **Tertiary:** Startup Founder / SME Owner (ซื้อเองใช้เอง)

---

## MoSCoW Prioritization — Landing Page Sections

| Priority | Section |
|----------|---------|
| **Must** | Hero + CTA หลัก (Trial Free) |
| **Must** | Features หลัก (3–5 จุดเด่น) |
| **Must** | Pricing Plans |
| **Must** | Social Proof (Testimonials / Logos) |
| **Should** | Demo Video / Product Screenshot |
| **Should** | FAQ |
| **Could** | Comparison Table (vs. Competitors) |
| **Won't** | Blog / Full Documentation |

---

## User Stories

### 1. Hero Section
**As a** Sales Manager visiting the site for the first time,  
**I want to** understand what the product does within 5 seconds,  
**so that** I can decide whether to explore further.

**Acceptance Criteria:**
- Given ผู้ใช้เข้าสู่ landing page
- When โหลดเสร็จ
- Then เห็น headline ชัดเจน, sub-headline อธิบาย value prop, และปุ่ม "ทดลองใช้ฟรี 14 วัน"
- And hero image/screenshot แสดง UI ของระบบ

---

### 2. Features Section
**As a** potential buyer,  
**I want to** see key features with benefit-focused descriptions,  
**so that** I understand how it solves my pain points.

**Acceptance Criteria:**
- Given ผู้ใช้เลื่อนลงมา
- When ถึง section features
- Then แสดงอย่างน้อย 5 features: Contact Management, Pipeline Tracking, Email Integration, Analytics Dashboard, Mobile App
- And แต่ละ feature มี icon + headline + description 1–2 ประโยค

---

### 3. Pricing Section
**As a** decision maker,  
**I want to** compare pricing plans ได้ง่าย,  
**so that** I can choose the right tier for my team.

**Acceptance Criteria:**
- Given ผู้ใช้ดู pricing
- When เห็น pricing cards
- Then มี 3 plans: Starter / Growth / Enterprise
- And แต่ละ plan มี: ราคา/user/month, feature list, CTA button
- And มี toggle Monthly/Annual (ส่วนลด 20% เมื่อจ่ายรายปี)

---

### 4. Social Proof
**As a** skeptical buyer,  
**I want to** see proof that other companies use this successfully,  
**so that** I trust the product before signing up.

**Acceptance Criteria:**
- Given ผู้ใช้เลื่อนดู social proof
- When ถึง section นี้
- Then เห็น testimonials อย่างน้อย 3 รายการ พร้อมชื่อ/บริษัท/รูปถ่าย
- And มี logo bar แสดง company logos ที่ใช้งาน
- And มี stat highlight เช่น "เพิ่มยอดขาย 35%" / "ลดเวลา follow-up 50%"

---

## MVP Scope (Sprint 1)

```
✅ Hero Section + CTA
✅ 5 Key Features
✅ 3-Tier Pricing
✅ 3 Testimonials
✅ Footer (links, contact)
⬜ Demo Video (Sprint 2)
⬜ FAQ (Sprint 2)
⬜ Comparison Table (Sprint 3)
```

---

## Definition of Done
- [ ] Responsive (Mobile / Tablet / Desktop)
- [ ] Page load < 3 วินาที
- [ ] CTA ทุกจุด track ด้วย Analytics
- [ ] SEO: meta title, description, OG tags
- [ ] A/B test CTA copy พร้อมใช้งาน

---

ต้องการให้สร้าง HTML/CSS จริงของ landing page นี้ไหมครับ? หรือต้องการ refine user stories เพิ่มเติม?

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 02:46:41 +07 2026

You've hit your limit · resets 4am (Asia/Bangkok)
You've hit your limit · resets 4am (Asia/Bangkok)
[Error] Claude CLI unavailable

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 02:48:00 +07 2026

You've hit your limit · resets 4am (Asia/Bangkok)
You've hit your limit · resets 4am (Asia/Bangkok)
[Error] Claude CLI unavailable

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 02:49:15 +07 2026

You've hit your limit · resets 4am (Asia/Bangkok)
You've hit your limit · resets 4am (Asia/Bangkok)
[Error] Claude CLI unavailable

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 02:56:39 +07 2026

I will research the existing landing page structure and components to define the user stories and MVP for the new real estate landing page.

I'll review the existing PO notes to align with previous project requirements and business value.

# Product Brief: Real Estate Landing Page (Multi-Project)

**Product Vision:** *"บ้านในฝันที่ใช่ ในโครงการที่คุณชอบ — ค้นหาง่าย นัดชมได้ทันที"*
แพลตฟอร์มที่รวบรวมโครงการบ้านและคอนโดหลากหลายทำเล ช่วยให้ผู้ซื้อค้นหาบ้านที่ตรงใจได้รวดเร็วและนัดหมายเข้าชมได้ง่ายที่สุด

---

## Target Users
- **Home Buyers:** ผู้ที่กำลังมองหาที่อยู่อาศัยใหม่ (บ้านเดี่ยว, ทาวน์โฮม, คอนโด)
- **Real Estate Investors:** นักลงทุนที่มองหาโครงการในทำเลศักยภาพ
- **First-time Owners:** กลุ่มคนทำงานที่ต้องการซื้อทรัพย์สินชิ้นแรก

---

## MoSCoW Prioritization

| Priority | Section / Feature |
|----------|-------------------|
| **Must** | **Hero & Search Filter** (ค้นหาตามทำเล, ราคา, ประเภท) |
| **Must** | **Featured Projects** (การ์ดแสดงรูปภาพ, ราคาเริ่มต้น, สถานะโครงการ) |
| **Must** | **Lead Capture Form** (ลงทะเบียนนัดชมโครงการ / ขอข้อมูลเพิ่ม) |
| **Must** | **Project Categories** (แยกประเภท บ้านเดี่ยว / ทาวน์โฮม / คอนโด) |
| **Should** | **Map Integration** (แสดงตำแหน่งโครงการบนแผนที่) |
| **Should** | **Amenities & Facilities** (ไฮไลท์ส่วนกลาง: สระว่ายน้ำ, ฟิตเนส, สวน) |
| **Should** | **Loan Calculator** (เครื่องคำนวณเงินกู้เบื้องต้น) |
| **Could** | **Virtual Tour (360°)** (ชมห้องตัวอย่างออนไลน์) |
| **Won't** | **Booking Online** (ระบบชำระเงินจองออนไลน์ - v1) |

---

## User Stories (MVP)

### US-01: Hero & Search Filter
**As a** home buyer,  
**I want to** search and filter projects by location, type, and price range,  
**so that** I can find homes that fit my budget and preferred area.

**Acceptance Criteria:**
- **Given** ผู้ใช้เข้าสู่หน้า Landing Page
- **When** โหลดหน้าเสร็จ
- **Then** เห็น Search Bar ที่มีตัวเลือก: "ทำเล (Location)", "ประเภทโครงการ (Type)", และ "ช่วงราคา (Price Range)"
- **And** มีปุ่ม "ค้นหา" ที่แสดงผลลัพธ์ที่ตรงเงื่อนไขทันที

---

### US-02: Featured Projects Gallery
**As a** user browsing the site,  
**I want to** see a list of available projects with key highlights,  
**so that** I can compare different projects without clicking into every page.

**Acceptance Criteria:**
- **Given** ผู้ใช้เลื่อนลงมาที่หน้าโครงการแนะนำ
- **When** เห็นการ์ดโครงการ (Project Cards)
- **Then** แต่ละการ์ดต้องแสดง: ชื่อโครงการ, รูปภาพหลัก, ราคาเริ่มต้น (e.g. "เริ่ม 3.59 ลบ."), ทำเล และสถานะ (เช่น Pre-sale, Ready to move)
- **And** สามารถคลิกดูรายละเอียดเพิ่มเติมได้

---

### US-03: Lead Capture (Inquiry & Viewing)
**As a** prospective buyer,  
**I want to** leave my contact information for a specific project,  
**so that** a sales representative can contact me with more details or schedule a visit.

**Acceptance Criteria:**
- **Given** ผู้ใช้สนใจโครงการใดโครงการหนึ่ง
- **When** กรอกฟอร์ม (ชื่อ, เบอร์โทร, อีเมล, โครงการที่สนใจ)
- **Then** ระบบแสดงข้อความยืนยันการส่งข้อมูล (Success Message)
- **And** ข้อมูลต้องถูกส่งไปที่ระบบหลังบ้านหรืออีเมลฝ่ายขายภายใน 1 นาที

---

### US-04: Project Categories Navigation
**As a** user with a specific preference,  
**I want to** browse projects by category,  
**so that** I don't waste time looking at property types I'm not interested in.

**Acceptance Criteria:**
- **Given** ผู้ใช้ต้องการดูเฉพาะ "คอนโด" หรือ "บ้านเดี่ยว"
- **When** คลิกที่เมนูหรือ Icon หมวดหมู่โครงการ
- **Then** ระบบกรองผลลัพธ์โครงการให้เหลือเฉพาะประเภทที่เลือก

---

## Definition of Done (DoD)
- [ ] UI เป็น Mobile-first และ Responsive ครบทุก Device
- [ ] ภาพโครงการต้องเป็น High-quality และรองรับ Lazy Loading
- [ ] แบบฟอร์ม Lead Capture ต้องมีการทำ Validation (เบอร์โทร/อีเมล)
- [ ] มีช่องทางติดต่อด่วน (WhatsApp/Line/Call) ที่ลอยอยู่หน้าจอ (Sticky CTA)

---

**ต้องการให้ผมส่งต่อรายละเอียดเหล่านี้ให้ Tech Lead เพื่อออกแบบ Component Structure หรือให้ Dev เริ่มสร้าง Prototype เลยไหมครับ?**

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 03:03:07 +07 2026

I will start by reviewing the current project state and any existing requirements to ensure the new landing page aligns with our established patterns and documentation.

I'll examine the existing PO notes to ensure our new landing page strategy is consistent with previous requirements and the overall product roadmap.

ในฐานะ Product Owner ผมได้ออกแบบโครงสร้าง Landing Page สำหรับโครงการขายบ้านที่มีหลายโครงการให้เลือก (Multi-Project Real Estate) โดยเน้นที่การสร้างความเชื่อมั่นและการนำเสนอข้อมูลที่ช่วยให้ลูกค้าตัดสินใจนัดชมโครงการได้ง่ายที่สุดครับ

---

# Product Brief: Real Estate Multi-Project Landing Page

**Product Vision:** *"รวมโครงการบ้านคุณภาพในทำเลที่ใช่ ให้การหาบ้านในฝันเป็นเรื่องง่ายและจบในที่เดียว"*

---

## 1. User Stories & Acceptance Criteria (MVP)

### US-01: Hero & Search Filter (การค้นหาเบื้องต้น)
**As a** home buyer, **I want to** filter projects by location, price range, and house type, **so that** I can quickly find projects that match my budget and preferred area.

*   **Acceptance Criteria:**
    *   **Given** ผู้ใช้เข้าสู่หน้า Landing Page
    *   **When** โหลดหน้าแรก (Above the fold)
    *   **Then** เห็นช่องค้นหา (Search Bar) ที่มี Dropdown: ทำเล (e.g. บางนา, พระราม 9), ช่วงราคา (e.g. 3-5 ลบ., 5-10 ลบ.), และประเภท (บ้านเดี่ยว, ทาวน์โฮม)
    *   **And** มีปุ่ม "ค้นหาโครงการ" ที่ชัดเจน

---

### US-02: Featured Projects Gallery (รายการโครงการแนะนำ)
**As a** user browsing the site, **I want to** see a list of available projects with key highlights and starting prices, **so that** I can compare multiple options without clicking into every page.

*   **Acceptance Criteria:**
    *   **Given** ผู้ใช้เลื่อนลงมาที่ส่วนโครงการแนะนำ
    *   **When** เห็น Project Cards
    *   **Then** แต่ละ Card ต้องแสดง: รูปภาพหน้าโครงการ (High-res), ชื่อโครงการ, ทำเล, ราคาเริ่มต้น (e.g. "เริ่ม 4.59 ลบ."), และ Badge สถานะ (Pre-sale, พร้อมอยู่)

---

### US-03: Lead Capture Form (การลงทะเบียนนัดชม)
**As a** prospective buyer, **I want to** submit my contact details for a specific project, **so that** a sales representative can contact me for a private viewing.

*   **Acceptance Criteria:**
    *   **Given** ผู้ใช้สนใจโครงการใดโครงการหนึ่ง
    *   **When** คลิกปุ่ม "นัดชมโครงการ" หรือ "รับสิทธิพิเศษ"
    *   **Then** แสดง Modal หรือ Form ให้กรอก: ชื่อ-นามสกุล, เบอร์โทรศัพท์, อีเมล และโครงการที่สนใจ
    *   **And** หลังจากส่งข้อมูล ต้องเห็นข้อความ "Success" และได้รับการยืนยันทางอีเมล/SMS ภายใน 5 นาที

---

## 2. MoSCoW Prioritization

| Priority | Feature / Section |
| :--- | :--- |
| **Must (MVP)** | Hero Section with Search, Featured Projects Grid, Contact Form, Sticky Call/Line Button |
| **Should** | Map Integration (Google Maps), Project Facilities (Icons), Virtual Tour 360° |
| **Could** | Mortgage Calculator (เครื่องคำนวณเงินกู้), Customer Testimonials, Promo Countdown Timer |
| **Won't (v1)** | Online Booking/Payment System, Member Dashboard |

---

## 3. Definition of Done (DoD)
*   [ ] รองรับการแสดงผลทุกหน้าจอ (Mobile-First Responsive)
*   [ ] Page Load Time < 2 วินาที (เพื่อลด Bounce Rate)
*   [ ] ภาพประกอบทุกภาพต้องเป็นลิขสิทธิ์ของแบรนด์และมีความละเอียดสูง
*   [ ] แบบฟอร์ม Lead Capture ต้องมีการตรวจสอบความถูกต้องของเบอร์โทรศัพท์ (Validation)

---

**ต้องการให้ผมส่งต่อ User Stories เหล่านี้ให้ Tech Lead เพื่อเริ่มออกแบบ Component ใน React หรือต้องการให้ผมปรับปรุงส่วนไหนเพิ่มเติมไหมครับ?**

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือก
Date: Fri Mar  6 03:07:34 +07 2026

ยินดีครับ ในฐานะ Product Owner ผมขอเสนอโครงสร้างและ User Story สำหรับ Landing Page ขายโครงการบ้านจัดสรร (Multi-project Real Estate) ดังนี้ครับ

### **Objective**
สร้าง Landing Page ที่รวบรวมโครงการบ้านต่างๆ เพื่อสร้าง Lead (รายชื่อผู้สนใจ) และส่งต่อให้ทีมขายได้อย่างมีประสิทธิภาพ โดยเน้นความน่าเชื่อถือและการเปรียบเทียบข้อมูลที่ชัดเจน

---

### **User Stories & Acceptance Criteria**

#### **Story 1: Project Discovery & Filtering**
*As a potential home buyer, I want to browse and filter available housing projects, so that I can find a home that matches my budget and preferred location.*

**Acceptance Criteria:**
- **Given** ผู้สนใจเข้ามาที่หน้า Landing Page
- **When** ผู้ใช้ดูส่วน "Our Projects"
- **Then** ระบบต้องแสดงรายการโครงการทั้งหมดพร้อมรูปภาพปก, ช่วงราคาเริ่มต้น, และทำเลที่ตั้ง
- **Given** ผู้ใช้ต้องการจำกัดขอบเขตการค้นหา
- **When** ผู้ใช้เลือก Filter (เช่น โซนพื้นที่, ช่วงราคา, หรือประเภทบ้าน)
- **Then** ระบบต้องแสดงโครงการที่ตรงตามเงื่อนไขที่เลือกแบบ Real-time หรือกดค้นหาได้

#### **Story 2: Project Highlights**
*As a potential home buyer, I want to see key highlights and amenities of each project, so that I can decide which project suits my lifestyle.*

**Acceptance Criteria:**
- **Given** ผู้ใช้เลื่อนดูข้อมูลโครงการรายย่อย
- **When** ผู้ใช้คลิกดูรายละเอียดเบื้องต้น (Quick View)
- **Then** ระบบต้องแสดงจุดเด่น 3-5 ข้อ (เช่น ใกล้รถไฟฟ้า, พื้นที่ส่วนกลางขนาดใหญ่, ระบบความปลอดภัย)
- **Given** โครงการมีหลายแบบบ้าน
- **When** ผู้ใช้ดูในส่วนรายละเอียด
- **Then** ระบบต้องแสดงตารางเปรียบเทียบแบบบ้านเบื้องต้น (พื้นที่ใช้สอย, จำนวนห้องนอน/ห้องน้ำ)

#### **Story 3: Lead Capture (The Main Goal)**
*As a potential home buyer, I want to easily request more information or book a site visit, so that I can move forward with my purchase decision.*

**Acceptance Criteria:**
- **Given** ผู้ใช้สนใจโครงการใดโครงการหนึ่ง
- **When** ผู้ใช้กรอกฟอร์ม "ติดต่อเรา" (ชื่อ, เบอร์โทร, โครงการที่สนใจ)
- **Then** ระบบต้องแสดงข้อความขอบคุณ (Thank you message) และส่งข้อมูลไปยังระบบ CRM หรือ Email ของฝ่ายขายทันที
- **Given** ผู้ใช้ต้องการความรวดเร็ว
- **When** ผู้ใช้กดปุ่ม Floating Action (เช่น LINE หรือ Call)
- **Then** ระบบต้องเปิดแอปพลิเคชันที่เกี่ยวข้องเพื่อเริ่มการสนทนาได้ทันที

---

### **Prioritization (MoSCoW)**

*   **Must Have:**
    *   รายการโครงการบ้านพร้อมรูปภาพ ราคาเริ่มต้น และที่ตั้ง
    *   ฟอร์มลงทะเบียนเพื่อรับข้อมูล (Lead Capture Form)
    *   ข้อมูลติดต่อเบื้องต้น (เบอร์โทร, แผนที่ Google Maps)
    *   Responsive Design (แสดงผลได้ดีบนมือถือ)
*   **Should Have:**
    *   ระบบ Filter แยกตามโซนและราคา
    *   จุดเด่น/สิ่งอำนวยความสะดวก (Facilities) ของแต่ละโครงการ
    *   ปุ่มลัดสำหรับ LINE / Facebook Messenger
*   **Could Have:**
    *   Virtual Tour 360 องศาสำหรับบ้านตัวอย่าง
    *   โปรแกรมคำนวณเงินกู้เบื้องต้น (Mortgage Calculator)
    *   Section รีวิวจากลูกบ้านจริง (Social Proof)
*   **Won't Have (for MVP):**
    *   ระบบจองออนไลน์พร้อมชำระเงิน
    *   ระบบสมาชิกสำหรับติดตามสถานะการกู้

หากคุณเห็นชอบกับโครงสร้างนี้ ผมจะส่งต่อให้ทีม Technical Lead เพื่อออกแบบโครงสร้างไฟล์และเริ่มการพัฒนาใน Sprint ถัดไปครับ

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือกด้วย
Date: Fri Mar  6 03:19:03 +07 2026

ในฐานะ Product Owner ผมได้วิเคราะห์ความต้องการเบื้องต้นสำหรับการออกแบบ Landing Page ขายบ้านที่มีหลายโครงการ (Multi-project Real Estate) โดยแบ่งเป็น User Stories และเกณฑ์การตอบรับ (Acceptance Criteria) ดังนี้ครับ

### Product Backlog: Real Estate Landing Page (Multi-Project)

#### 1. User Story: ค้นหาและเปรียบเทียบโครงการ
**As a** ผู้ซื้อบ้าน
**I want** ดูรายการโครงการบ้านทั้งหมดที่มี พร้อมข้อมูลเบื้องต้น (ทำเล, ราคาเริ่มต้น, ประเภทบ้าน)
**So that** ฉันสามารถเลือกโครงการที่ตรงกับงบประมาณและทำเลที่ต้องการได้

**Acceptance Criteria:**
*   **Given** ผู้ใช้งานเข้ามาที่หน้า Landing Page
*   **When** เลื่อนลงมาที่ส่วน "โครงการที่น่าสนใจ" (Project Showcase)
*   **Then** ระบบต้องแสดงการ์ดโครงการที่มีรูปภาพสวยงาม, ชื่อโครงการ, พิกัดทำเล, และราคาเริ่มต้น (Starting Price) อย่างชัดเจน
*   **And** มีปุ่ม "ดูรายละเอียดโครงการ" เพื่อนำไปสู่หน้าข้อมูลเชิงลึก

#### 2. User Story: การคัดกรองโครงการ (Filter/Search)
**As a** ผู้ซื้อบ้านที่มีความต้องการเฉพาะเจาะจง
**I want** ค้นหาโครงการตามช่วงราคา หรือโซนทำเล
**So that** ฉันไม่ต้องเสียเวลาดูโครงการที่ไม่สนใจ

**Acceptance Criteria:**
*   **Given** ผู้ใช้งานอยู่ที่ส่วนแสดงรายการโครงการ
*   **When** ผู้ใช้งานเลือกโซน (เช่น บางนา, ราชพฤกษ์) หรือช่วงราคา (เช่น 5-10 ล้านบาท)
*   **Then** ระบบต้องแสดงผลเฉพาะโครงการที่ตรงตามเงื่อนไขทันที (Filtering)

#### 3. User Story: การลงทะเบียนเพื่อรับข้อมูล (Lead Capture)
**As a** ผู้ที่สนใจซื้อบ้าน
**I want** ลงทะเบียนแจ้งชื่อและเบอร์โทรศัพท์เพื่อขอรับสิทธิพิเศษหรือนัดชมโครงการ
**So that** เจ้าหน้าที่ฝ่ายขายสามารถติดต่อกลับเพื่อให้ข้อมูลเพิ่มเติมได้

**Acceptance Criteria:**
*   **Given** ผู้ใช้งานสนใจโครงการใดโครงการหนึ่ง
*   **When** กรอกข้อมูลในแบบฟอร์ม (ชื่อ, เบอร์โทร, โครงการที่สนใจ) และกดปุ่ม "รับสิทธิพิเศษ"
*   **Then** ระบบต้องแสดงข้อความขอบคุณ (Success Message) และบันทึกข้อมูลเข้าสู่ระบบหลังบ้าน (CRM)

---

### MVP Scope (MoSCoW Prioritization)

*   **Must Have:** ส่วน Hero แนะนำแบรนด์, รายการโครงการทั้งหมด (Grid View), ข้อมูลราคา/ทำเล, แบบฟอร์มติดต่อกลับ
*   **Should Have:** ตัวกรองค้นหาตามทำเลและราคา, แผนที่ Google Maps แสดงตำแหน่งโครงการ
*   **Could Have:** ระบบ Chatbot ช่วยตอบคำถามเบื้องต้น, วิดีโอ Virtual Tour 360 องศา
*   **Won't Have (v1):** ระบบจองบ้านออนไลน์พร้อมชำระเงิน

ผมจะเริ่มตรวจสอบไฟล์ในโปรเจกต์ปัจจุบันเพื่อดูว่ามี Component ไหนที่สามารถนำมาปรับใช้ได้บ้างครับ โดยเฉพาะในส่วนของ `shared/project/code/crm-landing/` เพื่อให้การพัฒนาเป็นไปอย่างรวดเร็วที่สุด

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือกด้วย
Date: Fri Mar  6 03:21:23 +07 2026

I will research the existing project structure and requirements to ensure the new landing page design aligns with the current CRM landing page architecture.
ในฐานะ Product Owner ผมได้ออกแบบโครงสร้างและรายละเอียดสำหรับ Landing Page ขายบ้านแบบหลายโครงการ (Multi-Project Real Estate) เพื่อให้ตอบโจทย์ทั้งผู้ซื้อที่กำลังมองหาบ้านและธุรกิจที่ต้องการเก็บ Lead คุณภาพครับ

### **Product Vision**
**"ค้นหาบ้านที่ใช่ ในทำเลที่ชอบ — รวมทุกโครงการคุณภาพไว้ในที่เดียว พร้อมนัดชมได้ทันที"**

---

### **User Stories (MVP)**

**US-01 — Project Discovery (การค้นหาโครงการ)**
> **As a** ผู้ซื้อบ้าน, **I want to** เห็นรายการโครงการบ้านที่หลากหลายพร้อมข้อมูลเบื้องต้น, **so that** ฉันสามารถเปรียบเทียบและเลือกโครงการที่สนใจได้ง่าย

**Acceptance Criteria:**
*   **Given** ผู้เยี่ยมชมเข้าสู่หน้า Landing Page
*   **When** เลื่อนมาที่ส่วน "โครงการทั้งหมด"
*   **Then** แสดงรายการโครงการในรูปแบบ Card ซึ่งประกอบด้วย: รูปภาพหลัก, ชื่อโครงการ, ทำเล (Location), และราคาเริ่มต้น (Starting Price)
*   **And** มีป้ายกำกับสถานะโครงการ (เช่น Pre-sale, พร้อมอยู่, หรือ Sold Out)

**US-02 — Search & Filter (การกรองข้อมูล)**
> **As a** ผู้ซื้อบ้านที่มีงบประมาณและทำเลในใจ, **I want to** กรองโครงการตามทำเล ราคา และประเภทบ้าน, **so that** ฉันพบโครงการที่ตรงความต้องการได้รวดเร็วโดยไม่ต้องไล่ดูทั้งหมด

**Acceptance Criteria:**
*   **Given** ผู้เยี่ยมชมอยู่ที่หน้าแรก
*   **When** ใช้งานแถบค้นหา (Search Bar) หรือ Filter
*   **Then** สามารถเลือกกรองได้ตาม: โซนพื้นที่ (เช่น บางนา, รามอินทรา), ช่วงราคา (เช่น 3-5 ลบ., 5-10 ลบ.), และประเภทบ้าน (บ้านเดี่ยว, ทาวน์โฮม)
*   **And** ผลลัพธ์ต้องอัปเดตทันทีตามเงื่อนไขที่เลือก

**US-03 — Lead Capture & Registration (การลงทะเบียน)**
> **As a** ผู้สนใจโครงการ, **I want to** ลงทะเบียนเพื่อรับสิทธิพิเศษหรือนัดชมโครงการ, **so that** เจ้าหน้าที่ฝ่ายขายสามารถติดต่อกลับเพื่อให้ข้อมูลเชิงลึกได้

**Acceptance Criteria:**
*   **Given** ผู้ใช้คลิกปุ่ม "สนใจโครงการ" หรือ "นัดชมบ้านตัวอย่าง"
*   **When** กรอกข้อมูลในฟอร์ม (ชื่อ-นามสกุล, เบอร์โทรศัพท์, อีเมล, และโครงการที่สนใจ)
*   **Then** ระบบต้องแสดงข้อความ "ขอบคุณ/ส่งข้อมูลสำเร็จ" และบันทึกข้อมูลเข้าสู่ระบบ CRM
*   **And** มีระบบตรวจสอบความถูกต้องของเบอร์โทรศัพท์ (Validation)

---

### **MoSCoW Prioritization**

| Priority | Feature / Section |
|----------|-------------------|
| **Must** | Hero Section + Search Bar, Project Cards (Image/Price/Location), Lead Capture Form, Sticky Call/Line CTA |
| **Should** | Map View (แสดงพิกัดโครงการ), Highlight Facilities (สระว่ายน้ำ, สวน, รปภ.), Testimonials จากลูกบ้าน |
| **Could** | Mortgage Calculator (เครื่องคำนวณเงินกู้), Virtual Tour 360°, Comparison Tool (เปรียบเทียบ 2 โครงการ) |
| **Won't** | ระบบจองออนไลน์ (Online Booking), Member Dashboard |

---

### **Sprint Goal (Sprint 1)**
**"ส่งมอบ Landing Page MVP ที่แสดงรายการโครงการและสามารถรับ Lead จากผู้สนใจได้จริง"**

ต้องการให้ผมจัดทำรายละเอียด Acceptance Criteria สำหรับส่วนใดเพิ่มเติม หรือต้องการให้ส่งต่อให้ Tech Lead เพื่อวางโครงสร้าง Component เลยไหมครับ?

---
## PO: ออกแบบหน้า landing page สำหรับการขายบ้าน มีหลายโครงการให้เลือกด้วย
Date: Fri Mar  6 03:30:19 +07 2026

I will start by reviewing the existing product owner notes and project structure to ensure the new "Real Estate Multi-Project Landing Page" aligns with current standards and avoids duplication.
ในฐานะ Product Owner ผมได้ออกแบบโครงสร้างและ User Story สำหรับ Landing Page ขายบ้านที่มีหลายโครงการ (Multi-Project Real Estate) เพื่อให้ตอบโจทย์ทั้งผู้ซื้อที่กำลังมองหาบ้านและธุรกิจที่ต้องการเก็บ Lead คุณภาพครับ

### **Product Vision**
**"ค้นหาบ้านที่ใช่ ในทำเลที่ชอบ — รวมทุกโครงการคุณภาพไว้ในที่เดียว พร้อมนัดชมได้ทันที"**

---

### **User Stories (MVP)**

**1. US-01 — Project Discovery & Search (การค้นหาโครงการ)**
> **As a** ผู้ซื้อบ้าน, **I want to** ค้นหาและกรองโครงการตามทำเล ราคา และประเภทบ้าน, **so that** ฉันพบโครงการที่ตรงความต้องการได้รวดเร็วโดยไม่ต้องไล่ดูทั้งหมด

**Acceptance Criteria:**
*   **Given** ผู้เยี่ยมชมเข้าสู่หน้า Landing Page
*   **When** ใช้งาน Search Bar ในส่วน Hero
*   **Then** สามารถเลือกกรองได้ตาม: โซนพื้นที่ (เช่น บางนา, ราชพฤกษ์), ช่วงราคา (เช่น 3-5 ลบ., 5-10 ลบ.), และประเภทบ้าน (บ้านเดี่ยว, ทาวน์โฮม)
*   **And** ผลลัพธ์ต้องแสดงรายการโครงการที่ตรงเงื่อนไขทันที

**2. US-02 — Project Showcase (การแสดงรายการโครงการ)**
> **As a** ผู้ซื้อบ้าน, **I want to** เห็นรายการโครงการบ้านที่หลากหลายพร้อมข้อมูลเบื้องต้น, **so that** ฉันสามารถเปรียบเทียบและเลือกโครงการที่สนใจได้ง่าย

**Acceptance Criteria:**
*   **Given** ผู้เยี่ยมชมเลื่อนมาที่ส่วน "โครงการทั้งหมด"
*   **When** แสดงรายการโครงการในรูปแบบ Card
*   **Then** แต่ละ Card ประกอบด้วย: รูปภาพหลัก (High-res), ชื่อโครงการ, ทำเล, ราคาเริ่มต้น (e.g. "เริ่ม 4.59 ลบ."), และป้ายสถานะ (Pre-sale, พร้อมอยู่)

**3. US-03 — Lead Capture & Registration (การลงทะเบียน)**
> **As a** ผู้สนใจโครงการ, **I want to** ลงทะเบียนเพื่อรับสิทธิพิเศษหรือนัดชมโครงการ, **so that** เจ้าหน้าที่ฝ่ายขายสามารถติดต่อกลับเพื่อให้ข้อมูลเชิงลึกได้

**Acceptance Criteria:**
*   **Given** ผู้ใช้คลิกปุ่ม "นัดชมบ้านตัวอย่าง" หรือ "รับสิทธิพิเศษ"
*   **When** กรอกฟอร์ม (ชื่อ, เบอร์โทรศัพท์, อีเมล, และโครงการที่สนใจ)
*   **Then** ระบบต้องบันทึกข้อมูลเข้าสู่ระบบ CRM และแสดงข้อความยืนยันความสำเร็จ
*   **And** มีระบบตรวจสอบความถูกต้องของเบอร์โทรศัพท์ (Validation)

---

### **MoSCoW Prioritization**

| Priority | Feature / Section |
|----------|-------------------|
| **Must** | Hero Section + Search Bar, Project Grid Cards, Lead Capture Form, Sticky CTA (Call/Line) |
| **Should** | Map View (แสดงพิกัดโครงการ), Highlight Facilities (สระว่ายน้ำ, สวน, รปภ.), Social Proof (Testimonials) |
| **Could** | Mortgage Calculator (เครื่องคำนวณเงินกู้), Virtual Tour 360°, Comparison Tool |
| **Won't** | ระบบจองออนไลน์ (Online Booking/Payment), Member Dashboard |

---

### **Sprint Goal (Sprint 1)**
**"ส่งมอบ Landing Page MVP ที่แสดงรายการโครงการและสามารถรับ Lead จากผู้สนใจได้จริง"**

ต้องการให้ผมส่งต่อรายละเอียดเหล่านี้ให้ Tech Lead เพื่อเริ่มออกแบบ Component Structure ใน React เลยไหมครับ?

---
## PO: ออกแบบหน้า landing page
Date: Fri Mar  6 17:24:17 +07 2026

I will start by researching the existing project requirements and technical notes to understand the current scope and identify any missing elements for the landing page.
ในฐานะ Product Owner ผมได้จัดทำรายละเอียดการออกแบบและข้อกำหนด (Requirements) สำหรับ **Landing Page ขายโครงการที่อยู่อาศัยแบบหลายโครงการ (Real Estate Multi-Project)** เพื่อให้ทีมพัฒนาสามารถนำไปดำเนินการต่อได้ดังนี้ครับ

### **Product Vision**
**"ค้นหาบ้านที่ใช่ ในทำเลที่ชอบ — รวมทุกโครงการคุณภาพไว้ในที่เดียว พร้อมนัดชมได้ทันที"**
เป้าหมายคือการสร้างแพลตฟอร์มที่ช่วยให้ผู้ซื้อค้นหาโครงการที่ตรงใจได้รวดเร็วที่สุด และสามารถเปลี่ยนความสนใจให้กลายเป็น "Lead" (รายชื่อผู้สนใจ) สำหรับทีมขายได้อย่างมีประสิทธิภาพ

---

### **User Stories & Acceptance Criteria**

#### **US-01: Hero & Search Filter (การค้นหาที่ชาญฉลาด)**
**As a** ผู้ที่กำลังมองหาบ้านใหม่,
**I want to** ค้นหาและกรองโครงการตามทำเล ช่วงราคา และประเภทที่อยู่อาศัย,
**so that** ฉันสามารถเห็นโครงการที่ตรงกับงบประมาณและทำเลที่ต้องการได้ทันที

*   **Acceptance Criteria:**
    *   **Given** ผู้เยี่ยมชมเข้าสู่หน้าแรก
    *   **When** โหลดหน้า Hero Section เสร็จสิ้น
    *   **Then** ต้องเห็น Search Bar ที่มีตัวเลือก: ทำเล (Zone), ช่วงราคา (Price Range), และประเภท (บ้านเดี่ยว/ทาวน์โฮม/คอนโด)
    *   **And** เมื่อกดปุ่ม "ค้นหา" ระบบต้องเลื่อนหน้าจอไปยังส่วนแสดงผลที่กรองข้อมูลแล้ว

#### **US-02: Featured Projects Showcase (รายการโครงการแนะนำ)**
**As a** ผู้ใช้งานที่กำลังเปรียบเทียบโครงการ,
**I want to** เห็นภาพรวมของโครงการต่างๆ พร้อมราคาเริ่มต้นและจุดเด่น,
**so that** ฉันสามารถประเมินเบื้องต้นได้โดยไม่ต้องคลิกเข้าไปดูทุกหน้า

*   **Acceptance Criteria:**
    *   **Given** ผู้เยี่ยมชมเลื่อนหน้าจอลงมา
    *   **When** แสดงรายการโครงการในรูปแบบ Grid/Card
    *   **Then** แต่ละการ์ดต้องมี: รูปภาพโครงการ (High-res), ชื่อโครงการ, ทำเล, ราคาเริ่มต้น (e.g. "เริ่ม 3.59 ลบ."), และ Badge สถานะ (เช่น พร้อมอยู่, Pre-sale)

#### **US-03: Lead Capture / Inquiry Form (การลงทะเบียนนัดชม)**
**As a** ผู้สนใจซื้อบ้าน,
**I want to** ลงทะเบียนเพื่อรับสิทธิพิเศษหรือนัดหมายเข้าชมโครงการ,
**so that** เจ้าหน้าที่ฝ่ายขายสามารถติดต่อกลับเพื่อให้ข้อมูลเพิ่มเติมได้

*   **Acceptance Criteria:**
    *   **Given** ผู้ใช้คลิกปุ่ม "สนใจโครงการ" หรือ "นัดชมบ้านตัวอย่าง"
    *   **When** กรอกข้อมูลในฟอร์ม (ชื่อ, เบอร์โทร, อีเมล, และโครงการที่สนใจ)
    *   **Then** ระบบต้องแสดงข้อความขอบคุณ และบันทึกข้อมูลเข้าสู่ระบบหลังบ้านทันที

---

### **MoSCoW Prioritization**

| ลำดับความสำคัญ | ฟีเจอร์ / ส่วนประกอบ |
| :--- | :--- |
| **Must (MVP)** | Hero Section พร้อม Search Bar, รายการโครงการ (Grid View), แบบฟอร์มลงทะเบียน, ปุ่มติดต่อด่วน (Call/Line) |
| **Should** | แผนที่แสดงพิกัดโครงการ (Google Maps), ไฮไลท์สิ่งอำนวยความสะดวก (Facilities Icons) |
| **Could** | เครื่องคำนวณเงินกู้ (Mortgage Calculator), วิดีโอ Virtual Tour 360°, รีวิวจากลูกค้า (Testimonials) |
| **Won't (v1)** | ระบบจองบ้านออนไลน์พร้อมชำระเงิน, ระบบสมาชิกสำหรับติดตามสถานะการกู้ |

---

### **Definition of Done (DoD)**
- [ ] แสดงผลได้สมบูรณ์แบบบน Mobile, Tablet และ Desktop (Responsive)
- [ ] ความเร็วในการโหลดหน้าเว็บ (Lighthouse Score) ≥ 90
- [ ] ทุกแบบฟอร์มต้องมีระบบตรวจสอบความถูกต้องของข้อมูล (Validation) โดยเฉพาะเบอร์โทรศัพท์
- [ ] รูปภาพโครงการรองรับ Lazy Loading เพื่อประสิทธิภาพการโหลด

**หากทีมเห็นชอบกับข้อกำหนดนี้ ผมจะส่งต่อให้ Tech Lead เพื่อออกแบบโครงสร้างไฟล์และเริ่มการพัฒนาใน Sprint 1 ต่อไปครับ**

---
