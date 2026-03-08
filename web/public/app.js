/* ============================================================
   AI Product Team Dashboard — app.js
   Vanilla JS, no dependencies
   ============================================================ */

'use strict';

// ── State ────────────────────────────────────────────────────
const   state = {
  autoScroll: true,
  sse: null,
  config: {},
  files: [],
  tasks: [],
  workflow: null,
  pendingDispatch: null,
  logFilter: { role: 'all', text: '' },
  logRoleCounts: {},
  skillsCatalog: [],
  agentSkills: {},
  skillsApiUnavailable: false,
  selectedSkillAgent: 'po',
  skillsSearch: '',
  graph3d: null,
};

// Role → CSS class map for log coloring
const ROLE_CLASS = {
  'PO':        'po',
  'PRODUCT OWNER': 'po',
  'TECH':      'tech',
  'TECH LEAD': 'tech',
  'DEV':       'dev',
  'DEVELOPER': 'dev',
  'QA':        'qa',
  'QA TESTER': 'qa',
  'DEVOPS':    'devops',
  'OPS':       'devops',
  'DASHBOARD': 'dash',
  'COORDINATOR':'dash',
};

const ROLE_LABELS = { po: 'Product Owner', tech: 'Tech Lead', dev: 'Developer', qa: 'QA Tester', devops: 'DevOps', all: 'All Agents' };
const STAGE_ORDER = ['po', 'tech', 'dev', 'qa'];

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Clock ────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Status ───────────────────────────────────────────────────
async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const { config, inbox, tmux, paths, active } = await r.json();
    state.config = config;
    applyConfig(config);
    applyInbox(inbox);
    applyTmux(tmux);
    if (active) applyActive(active);
    if (paths) applyPaths(paths);
  } catch (e) {
    console.warn('Status fetch failed', e);
  }
}

function applyConfig(cfg) {
  const map = { AI_PO: 'po', AI_TECH: 'tech', AI_DEV: 'dev', AI_QA: 'qa', AI_DEVOPS: 'devops' };
  for (const [key, role] of Object.entries(map)) {
    const val = (cfg[key] || '').toLowerCase();
    const aiEl = document.getElementById(`ai-${role}`);
    if (aiEl) aiEl.textContent = val || '—';
    const sel = document.getElementById(`cfg-${role}`);
    if (sel && val) {
      // Set matching option, create it if missing
      let opt = [...sel.options].find(o => o.value === val);
      if (!opt) {
        opt = new Option(val, val);
        sel.add(opt);
      }
      sel.value = val;
    }
  }
}

function applyInbox(inbox) {
  for (const [role, count] of Object.entries(inbox)) {
    const countEl = document.getElementById(`inbox-${role}`);
    const dotEl   = document.getElementById(`dot-${role}`);
    const barEl   = document.getElementById(`bar-${role}`);
    if (!countEl) continue;

    countEl.textContent = count;
    countEl.classList.toggle('has-tasks', count > 0);

    if (dotEl) {
      dotEl.className = 'status-dot';
      if (count > 0) {
        dotEl.classList.add('status-dot--pending');
      } else {
        dotEl.classList.add('status-dot--on');
      }
    }

    // Workload bar: fills up proportionally (max at 5 tasks = 100%)
    if (barEl) {
      barEl.style.width = count > 0 ? `${Math.min(count / 5 * 100, 100)}%` : '0';
    }
  }
}

// Show pulsing cyan dot when agent recently picked up a task (active window = 2 min)
function applyActive(active) {
  if (!active) return;
  for (const [role, isActive] of Object.entries(active)) {
    const dotEl    = document.getElementById(`dot-${role}`);
    const countEl  = document.getElementById(`inbox-${role}`);
    if (!dotEl) continue;
    const pending = parseInt(countEl?.textContent || '0');
    // Only show active if inbox is empty (agent is working, not just waiting)
    if (isActive && pending === 0) {
      dotEl.className = 'status-dot status-dot--active';
    }
  }
}

function applyTmux(running) {
  const badge   = document.getElementById('tmux-badge');
  const statusEl = document.getElementById('tmux-status');
  if (!badge || !statusEl) return;
  statusEl.textContent = running ? 'running' : 'offline';
  badge.className = `badge badge--${running ? 'on' : 'off'}`;
}

// ── SSE Log Stream ────────────────────────────────────────────
let _sseReconnecting = false;

function initSSE() {
  if (state.sse) state.sse.close();
  _sseReconnecting = false;

  const es = new EventSource('/api/logs/stream');
  state.sse = es;

  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);

      if (data.line !== undefined) {
        appendLogLine(data.line, data.seed === true);
      }
      if (data.inbox) applyInbox(data.inbox);
      if (data.tmux  !== undefined) applyTmux(data.tmux);
      if (data.active) applyActive(data.active);
      if (data.tasks) { state.tasks = data.tasks; renderTaskFlow(); }
      if (data.workflow) { state.workflow = data.workflow; renderWorkflow(); renderReviewQueue(); }
    } catch {}
  };

  es.onerror = () => {
    if (_sseReconnecting) return;
    _sseReconnecting = true;
    appendLogLine('[Dashboard] ⚠ Log stream disconnected — reconnecting…', false, 'system');
    state.sse = null;
    setTimeout(initSSE, 4000);
  };
}

function appendLogLine(raw, seed = false, forceClass = null) {
  const out = document.getElementById('log-output');
  if (!out) return;

  const el = document.createElement('span');
  el.className = 'log-line';

  // Detect role from bracket pattern: [ROLE]
  const roleMatch = raw.match(/\[([A-Z\s]+)\]/g);
  let roleClass = forceClass;
  if (!roleClass && roleMatch) {
    for (const m of roleMatch) {
      const key = m.replace(/[\[\]]/g, '').trim();
      if (ROLE_CLASS[key]) { roleClass = ROLE_CLASS[key]; break; }
    }
  }
  if (roleClass) el.classList.add(`log-line--${roleClass}`);

  el.textContent = raw;
  if (seed) el.style.opacity = '0.6';

  // Track per-role count and flash new (non-seed) lines
  if (!seed && roleClass && roleClass !== 'dash') {
    state.logRoleCounts[roleClass] = (state.logRoleCounts[roleClass] || 0) + 1;
    updateLogFilterCounts();
  }
  if (!seed) {
    el.classList.add('log-line--flash');
    el.addEventListener('animationend', () => el.classList.remove('log-line--flash'), { once: true });
  }

  // Apply current filter to new line
  const { role: fr, text: ft } = state.logFilter;
  if ((fr !== 'all' && !el.classList.contains(`log-line--${fr}`)) ||
      (ft && !raw.toLowerCase().includes(ft.toLowerCase()))) {
    el.style.display = 'none';
  }

  out.appendChild(el);

  if (state.autoScroll) {
    out.scrollTop = out.scrollHeight;
  }

  // Cap at 300 lines
  while (out.children.length > 300) {
    out.removeChild(out.firstChild);
  }
}

function updateLogFilterCounts() {
  const map = { po: 'PO', tech: 'TECH', dev: 'DEV', qa: 'QA', devops: 'OPS' };
  document.querySelectorAll('.role-filter-btn[data-filter]').forEach(btn => {
    const f = btn.dataset.filter;
    if (f === 'all') return;
    const count = state.logRoleCounts[f] || 0;
    btn.textContent = count > 0 ? `${map[f] || f.toUpperCase()} (${count})` : (map[f] || f.toUpperCase());
  });
}

// ── Workflow ──────────────────────────────────────────────────
async function loadWorkflow() {
  try {
    const r = await fetch('/api/workflow');
    const data = await r.json();
    state.workflow = data;
    renderWorkflow();
    renderReviewQueue();
  } catch (e) { console.warn('Workflow fetch failed', e); }
}

function renderWorkflow() {
  const w = state.workflow;
  if (!w) return;
  const currentEl = document.getElementById('workflow-current');
  const pipeline  = document.getElementById('workflow-pipeline');
  if (!currentEl || !pipeline) return;

  document.querySelectorAll('.workflow-stage').forEach(el => {
    el.classList.remove('active', 'done');
  });

  if (w.current) {
    currentEl.style.display = 'block';
    currentEl.textContent = `Current: ${(w.current.task || '').slice(0, 60)}…`;
    const stage = w.current.stage || 'po';
    const currentIdx = STAGE_ORDER.indexOf(stage);
    STAGE_ORDER.forEach((s, i) => {
      const el = pipeline.querySelector(`[data-stage="${s}"]`);
      if (!el) return;
      if (i < currentIdx)      el.classList.add('done');
      else if (i === currentIdx) el.classList.add('active');
    });
  } else {
    currentEl.style.display = 'none';
  }
}

let _lastReviewQueueKey = '';

function renderReviewQueue() {
  const queue = state.workflow?.reviewQueue || [];
  const container = document.getElementById('review-queue');
  if (!container) return;

  // Skip re-render if queue unchanged (prevents scroll jump from SSE every 1.5s)
  const queueKey = queue.map(i => `${i.id}:${i.fromRole}`).join('|');
  if (queueKey === _lastReviewQueueKey) return;
  _lastReviewQueueKey = queueKey;

  // Preserve which details were expanded (SSE re-renders every 1.5s would collapse them)
  const openIds = new Set();
  container.querySelectorAll('.review-item-output[open]').forEach(d => {
    const id = d.closest('.review-item')?.dataset?.id;
    if (id) openIds.add(id);
  });

  if (!queue.length) {
    container.innerHTML = '<div class="review-empty">No items pending review</div>';
    return;
  }

  container.innerHTML = queue.map(item => {
    const roleLabels = { po: 'Product Owner', tech: 'Tech Lead', dev: 'Developer', qa: 'QA Tester' };
    const fromLabel  = roleLabels[item.fromRole] || item.fromRole;
    const isComplete = item.fromRole === 'qa' || !item.handoffTo;
    const toLabel    = isComplete ? '✅ Pipeline Complete' : (ROLE_LABELS[item.handoffTo] || item.handoffTo);
    const taskShort  = (item.task || '').slice(0, 80) + ((item.task || '').length > 80 ? '…' : '');
    const actions = isComplete
      ? `<button class="btn btn--secondary btn-reject" data-action="reject">Dismiss</button>`
      : `<button class="btn-tiny btn-reject" data-action="reject">Reject</button>
         <button class="btn btn--primary btn-approve" data-action="approve">Approve & Send</button>`;
    return `
      <div class="review-item" data-id="${item.id}" data-from="${item.fromRole}">
        <div class="review-item-header">
          <span class="review-from">${fromLabel} → ${toLabel}</span>
        </div>
        <div class="review-item-task">${esc(taskShort)}</div>
        <details class="review-item-output">
          <summary>View output</summary>
          <pre>${esc(item.output || '')}</pre>
        </details>
        <div class="review-item-actions">${actions}</div>
      </div>`;
  }).join('');

  container.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = queue.find(i => i.id === btn.closest('.review-item').dataset.id);
      if (item) approveReview(item);
    });
  });
  container.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = queue.find(i => i.id === btn.closest('.review-item').dataset.id);
      if (item) rejectReview(item);
    });
  });

  // Restore expanded state
  openIds.forEach(id => {
    const item = container.querySelector(`.review-item[data-id="${id}"] .review-item-output`);
    if (item) item.setAttribute('open', '');
  });
}

async function approveReview(item) {
  const fb = document.getElementById('review-feedback');
  try {
    const r = await fetch('/api/workflow/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: item.id,
        fromRole: item.fromRole,
        handoffTo: item.handoffTo,
        output: item.output,
      }),
    });
    const data = await r.json();
    if (data.success) {
      const toLabel = ROLE_LABELS[item.handoffTo] || item.handoffTo;
      showFeedback(fb, `✓ Approved → ${toLabel}. เปิดเทอร์มินัล ${toLabel} ไว้ task จะเข้าในไม่กี่วินาที`, 'ok');
      loadWorkflow();
      loadStatus();
      loadTasks();
    } else {
      showFeedback(fb, `Error: ${data.error || 'Unknown'}`, 'err');
    }
  } catch (e) {
    console.warn(e);
    showFeedback(fb, `Network error: ${e.message}`, 'err');
  }
}

async function rejectReview(item) {
  try {
    await fetch('/api/workflow/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: item.id, fromRole: item.fromRole }),
    });
    loadWorkflow();
  } catch (e) { console.warn(e); }
}

// ── Task Flow ─────────────────────────────────────────────────
async function loadTasks() {
  try {
    const r = await fetch('/api/tasks');
    const data = await r.json();
    if (data.tasks) {
      state.tasks = data.tasks;
      renderTaskFlow();
    }
  } catch (e) {
    console.warn('Tasks fetch failed', e);
  }
}

function renderTaskFlow() {
  const list = document.getElementById('task-flow-list');
  if (!list) return;

  const tasks = state.tasks.slice(0, 15);
  if (!tasks.length) {
    list.innerHTML = '<div class="task-flow-empty">No tasks yet. Prepare & send from Orchestrator.</div>';
    return;
  }

  list.innerHTML = tasks.map(t => {
    const role = (t.targets || [t.role])[0];
    const statusClass = t.status === 'queued' ? 'queued' : t.status === 'done' ? 'done' : 'unknown';
    const statusLabel = t.status === 'queued' ? 'Queued' : t.status === 'done' ? 'Done' : '—';
    const time = t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '';
    const taskShort = (t.task || '').slice(0, 60) + ((t.task || '').length > 60 ? '…' : '');
    return `
      <div class="task-flow-item task-flow-item--${statusClass}">
        <span class="task-flow-role">${esc(ROLE_LABELS[role] || role)}</span>
        <span class="task-flow-status">${statusLabel}</span>
        <span class="task-flow-task" title="${esc(t.task || '')}">${esc(taskShort)}</span>
        <span class="task-flow-time">${esc(time)}</span>
      </div>`;
  }).join('');
}

// ── Dispatch Task (Orchestrator flow) ─────────────────────────

function showConfirmModal(role, task, mode) {
  const modal = document.getElementById('confirm-modal');
  const targetEl = document.getElementById('confirm-target');
  const previewEl = document.getElementById('confirm-task-preview');
  const hintEl = document.getElementById('confirm-hint');
  const titleEl = document.getElementById('confirm-title');
  if (!modal || !targetEl || !previewEl) return;
  if (mode === 'workflow') {
    if (titleEl) titleEl.textContent = 'Start workflow';
    targetEl.textContent = '→ PO (then Tech → Dev → QA with review)';
    if (hintEl) hintEl.textContent = 'Task goes to PO first. After PO completes, review & approve to send to Tech Lead.';
  } else {
    if (titleEl) titleEl.textContent = 'Confirm task';
    targetEl.textContent = `→ ${ROLE_LABELS[role] || role}`;
    if (hintEl) hintEl.textContent = 'Agent will process this task. Check Live Feed for progress.';
  }
  previewEl.textContent = task;
  modal.classList.remove('hidden');
  state.pendingDispatch = { role, task, mode: mode || 'direct' };
}

function hideConfirmModal() {
  document.getElementById('confirm-modal')?.classList.add('hidden');
  state.pendingDispatch = null;
}

function dispatchTask() {
  const mode  = document.getElementById('task-mode')?.value || 'direct';
  const role  = document.getElementById('task-role').value;
  const task  = document.getElementById('task-input').value.trim();
  const fb    = document.getElementById('dispatch-feedback');

  if (!task) {
    showFeedback(fb, 'Enter a task description first.', 'err');
    return;
  }
  showConfirmModal(role, task, mode);
}

async function confirmAndSend() {
  const { role, task, mode } = state.pendingDispatch || {};
  if (!task) return;

  const fb  = document.getElementById('dispatch-feedback');
  const btn = document.getElementById('btn-confirm-send');

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⟳</span> Sending…';
  hideConfirmModal();

  try {
    let data;
    if (mode === 'workflow') {
      const r = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      data = await r.json();
      if (data.success) {
        showFeedback(fb, '✓ Workflow started → PO. Review when done, then approve.', 'ok');
        loadWorkflow();
      }
    } else {
      const r = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, task }),
      });
      data = await r.json();
      if (data.success) {
        const targets = data.routed.join(', ').toUpperCase();
        showFeedback(fb, `✓ Sent to ${targets}. Check Task Flow & Live Feed.`, 'ok');
        loadTasks();
      }
    }
    if (data && !data.success) showFeedback(fb, `Error: ${data.error}`, 'err');
    if (data?.success) {
      document.getElementById('task-input').value = '';
      loadStatus();
    }
  } catch (e) {
    showFeedback(fb, `Network error: ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✓</span> Confirm & Send';
  }
}

// ── Save Config ───────────────────────────────────────────────
async function saveConfig() {
  const fb  = document.getElementById('config-feedback');
  const btn = document.getElementById('btn-save-config');

  const updates = {
    AI_PO:     document.getElementById('cfg-po').value,
    AI_TECH:   document.getElementById('cfg-tech').value,
    AI_DEV:    document.getElementById('cfg-dev').value,
    AI_QA:     document.getElementById('cfg-qa').value,
    AI_DEVOPS: document.getElementById('cfg-devops').value,
  };

  btn.disabled = true;

  try {
    const r    = await fetch('/api/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates),
    });
    const data = await r.json();
    if (data.success) {
      if (data.config) {
        applyConfig(data.config);
        const labels = { AI_PO: 'PO', AI_TECH: 'Tech', AI_DEV: 'Developer', AI_QA: 'QA', AI_DEVOPS: 'DevOps' };
        const parts = Object.entries(labels).map(([k, l]) => `${l}: ${(data.config[k] || '—')}`);
        showFeedback(fb, `✓ Saved: ${parts.join(', ')} — ใช้ค่าทันทีใน task ถัดไป (ไม่ต้อง restart)`, 'ok');
      } else {
        showFeedback(fb, '✓ Config saved — agents use new settings on next task (no restart)', 'ok');
      }
      loadStatus();
    } else {
      showFeedback(fb, `Error: ${data.error}`, 'err');
    }
  } catch (e) {
    showFeedback(fb, `Network error: ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

// ── Workspace (.code-workspace) ──────────────────────────────

// Holds parsed folder data: [{ index, name, relativePath, absolutePath, exists }]
state.wsFolders = [];

function applyPaths(paths) {
  if (paths.workspace)   setVal('path-workspace', paths.workspace);
  if (paths.projectRoot) setVal('path-project',   paths.projectRoot);
  const same = paths.workspace && paths.projectRoot && paths.workspace === paths.projectRoot;
  const cb = document.getElementById('path-same-as-workspace');
  const projInput = document.getElementById('path-project');
  const btnBrowseProject = document.getElementById('btn-browse-project');
  if (cb) cb.checked = same;
  if (projInput) projInput.disabled = same;
  if (btnBrowseProject) btnBrowseProject.disabled = same;
}

// Render parsed folders as interactive rows
function renderFolders(folders, wsName) {
  state.wsFolders = folders;

  const wrap = document.getElementById('ws-folders-wrap');
  const list = document.getElementById('ws-folders-list');
  const badge= document.getElementById('ws-loaded-name');

  list.innerHTML = '';

  if (!folders.length) {
    wrap.classList.add('hidden');
    return;
  }

  folders.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'ws-folder-row';

    const dotClass = f.exists === true  ? 'folder-exists-dot--ok'
                   : f.exists === false ? 'folder-exists-dot--missing'
                   :                      'folder-exists-dot--unknown';

    // Auto-assign first folder as both, second as projectRoot if multi-root
    const defaultRole = folders.length === 1 ? 'both'
                      : i === 0              ? 'workspace'
                      : i === 1              ? 'projectRoot'
                      :                        '';

    row.innerHTML = `
      <span class="folder-exists-dot ${dotClass}" title="${f.exists === true ? 'exists' : f.exists === false ? 'not found' : 'unknown'}"></span>
      <div class="folder-info">
        <span class="folder-name">${f.name}</span>
        <span class="folder-path-abs">${f.absolutePath || f.relativePath}</span>
      </div>
      <select class="folder-role-select" data-index="${i}">
        <option value="">— ignore —</option>
        <option value="workspace"   ${defaultRole === 'workspace'   ? 'selected' : ''}>📁 Main folder</option>
        <option value="projectRoot" ${defaultRole === 'projectRoot' ? 'selected' : ''}>📂 Project Root</option>
        <option value="both"        ${defaultRole === 'both'        ? 'selected' : ''}>📁 Both</option>
      </select>
    `;

    const sel = row.querySelector('select');
    sel.addEventListener('change', () => {
      sel.className = `folder-role-select${sel.value ? ` role--${sel.value}` : ''}`;
      // Sync to manual inputs
      syncSelectionsToInputs();
    });
    // Set initial class
    if (defaultRole) sel.className = `folder-role-select role--${defaultRole}`;

    list.appendChild(row);
  });

  syncSelectionsToInputs();
  wrap.classList.remove('hidden');

  // Badge
  if (wsName) {
    badge.textContent = wsName;
    badge.classList.remove('hidden');
  }
}

// Read selects → update path inputs
function syncSelectionsToInputs() {
  let workspace = '', projectRoot = '';
  document.querySelectorAll('.folder-role-select').forEach(sel => {
    const idx  = parseInt(sel.dataset.index);
    const f    = state.wsFolders[idx];
    const abs  = f?.absolutePath || '';
    if (!abs) return;
    if (sel.value === 'workspace'   || sel.value === 'both') workspace   = abs;
    if (sel.value === 'projectRoot' || sel.value === 'both') projectRoot = abs;
  });
  if (workspace) setVal('path-workspace', workspace);
  if (projectRoot) setVal('path-project', projectRoot);
  else if (workspace) setVal('path-project', workspace);
  // Update checkbox: uncheck if different paths
  const cb = document.getElementById('path-same-as-workspace');
  const projInput = document.getElementById('path-project');
  if (cb && projInput) {
    const finalProj = projectRoot || workspace;
    cb.checked = workspace && finalProj && workspace === finalProj;
    projInput.disabled = cb.checked;
  }
}

// Parse server-side .code-workspace path
async function loadWorkspaceFromPath() {
  const filePath = document.getElementById('ws-server-path').value.trim();
  const fb = document.getElementById('paths-feedback');
  if (!filePath) { showFeedback(fb, 'Enter a .code-workspace file path', 'err'); return; }

  const btn = document.getElementById('btn-load-ws-path');
  btn.disabled = true; btn.textContent = '…';
  try {
    const r    = await fetch('/api/workspace/parse', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const data = await r.json();
    if (data.success) {
      renderFolders(data.folders, data.name);
      showFeedback(fb, `✓ Loaded "${data.name}" — ${data.folders.length} folder(s)`, 'ok');
    } else {
      showFeedback(fb, `Error: ${data.error}`, 'err');
    }
  } catch (e) {
    showFeedback(fb, `Network error: ${e.message}`, 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'LOAD';
  }
}

// Parse client-side .code-workspace via FileReader
function loadWorkspaceFromFile(file) {
  const fb = document.getElementById('paths-feedback');
  if (!file) return;
  if (!file.name.endsWith('.code-workspace')) {
    showFeedback(fb, 'Please select a .code-workspace file', 'err'); return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const r    = await fetch('/api/workspace/parse-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: e.target.result, name: file.name.replace('.code-workspace','') }),
      });
      const data = await r.json();
      if (data.success) {
        renderFolders(data.folders, data.name);
        const unknowns = data.folders.filter(f => !f.absolutePath).length;
        const msg = `✓ Loaded "${data.name}" — ${data.folders.length} folder(s)` +
          (unknowns ? `  ⚠ ${unknowns} relative path(s) — enter manually` : '');
        showFeedback(fb, msg, 'ok');
      } else {
        showFeedback(fb, `Parse error: ${data.error}`, 'err');
      }
    } catch (err) {
      showFeedback(fb, `Error: ${err.message}`, 'err');
    }
  };
  reader.readAsText(file);
}

async function savePaths() {
  let workspace   = document.getElementById('path-workspace').value.trim();
  let projectRoot = document.getElementById('path-project').value.trim();
  const sameAs   = document.getElementById('path-same-as-workspace')?.checked;
  const fb  = document.getElementById('paths-feedback');
  const btn = document.getElementById('btn-save-paths');

  if (!workspace && !projectRoot) {
    showFeedback(fb, 'Enter project folder path', 'err');
    return;
  }
  if (sameAs || !projectRoot) projectRoot = workspace;

  btn.disabled = true;
  try {
    const r = await fetch('/api/paths', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, projectRoot }),
    });
    const data = await r.json();
    if (data.success) {
      applyPaths(data.paths);
      showFeedback(fb, '✓ Applied — file browser updated', 'ok');
      loadFiles();
    } else {
      showFeedback(fb, `Error: ${data.error}`, 'err');
    }
  } catch (e) {
    showFeedback(fb, `Network error: ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ── File Tree ─────────────────────────────────────────────────
async function loadFiles() {
  const container = document.getElementById('file-tree');
  container.innerHTML = '<div style="color:var(--text-muted);padding:10px;font-size:11px;">Loading…</div>';

  try {
    const r    = await fetch('/api/files');
    const data = await r.json();

    container.innerHTML = '';

    // Show current root path above tree
    if (data.path) {
      const pathEl = document.createElement('div');
      pathEl.className = 'file-tree-root';
      pathEl.textContent = data.path;
      container.appendChild(pathEl);
    }

    if (data.error) {
      container.innerHTML += `<div class="file-tree-error">⚠ ${data.error}<br><span>${data.path || ''}</span></div>`;
      return;
    }

    const items = data.items || data; // support both shapes
    state.files = items;

    if (!items.length) {
      container.innerHTML += '<div style="color:var(--text-muted);padding:8px;font-size:11px;">Directory is empty</div>';
      return;
    }
    renderTree(items, container, 0);
  } catch (e) {
    container.innerHTML = '<div style="color:var(--red);padding:10px;font-size:11px;">Failed to load files</div>';
    console.warn('Files fetch failed', e);
  }
}

function renderTree(items, container, depth) {
  for (const item of items) {
    const row = document.createElement('div');
    row.className = `tree-item tree-item--${item.type}`;
    row.style.paddingLeft = `${depth * 14 + 6}px`;

    if (item.type === 'dir') {
      row.innerHTML = `
        <span class="tree-arrow">▶</span>
        <span class="tree-name">${item.name}/</span>
      `;

      const childWrap = document.createElement('div');
      childWrap.style.display = 'none';
      childWrap.style.borderLeft = '1px solid var(--border)';
      childWrap.style.marginLeft = `${depth * 14 + 12}px`;

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = row.classList.toggle('open');
        childWrap.style.display = open ? 'block' : 'none';
      });

      container.appendChild(row);
      container.appendChild(childWrap);

      if (item.children && item.children.length) {
        renderTree(item.children, childWrap, 0);
      } else {
        childWrap.innerHTML = '<div style="color:var(--text-muted);padding:4px 8px;font-size:10px;">empty</div>';
      }
    } else {
      row.innerHTML = `
        <span class="tree-file-icon">◆</span>
        <span class="tree-name">${item.name}</span>
        <span class="tree-size">${formatBytes(item.size)}</span>
      `;
      row.addEventListener('click', () => openFile(item.path));
      container.appendChild(row);
    }
  }
}

async function openFile(filePath) {
  try {
    const r    = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
    const data = await r.json();

    document.getElementById('file-viewer-path').textContent = data.path;
    document.getElementById('file-viewer-content').textContent =
      data.binary ? '⬡  Binary file — cannot display' : (data.content || '');
    document.getElementById('file-viewer').classList.remove('hidden');
  } catch (e) {
    console.warn('File open failed', e);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function formatBytes(b) {
  if (!b) return '0B';
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}K`;
  return `${(b / (1024 * 1024)).toFixed(1)}M`;
}

function showFeedback(el, msg, type) {
  el.textContent = msg;
  el.className = `feedback feedback--${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'feedback'; }, 4000);
}

// ── Agent card → prefill task router ─────────────────────────
function selectAgentTarget(role) {
  // Update hidden select
  const sel = document.getElementById('task-role');
  if (sel) sel.value = role;

  // Update chip active state
  document.querySelectorAll('.agent-chip').forEach(c => c.classList.remove('agent-chip--active'));
  const chip = document.querySelector(`.agent-chip[data-role="${role}"]`);
  if (chip) chip.classList.add('agent-chip--active');

  // Update card selected state
  document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('agent-card--selected'));
  const card = document.querySelector(`.agent-card[data-role="${role}"]`);
  if (card) card.classList.add('agent-card--selected');
}

function bindAgentCards() {
  // Agent card click → select target
  document.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      if (role === 'coord') return;
      selectAgentTarget(role);
      document.getElementById('task-input')?.focus();
    });
  });

  // Chip click → select target
  document.querySelectorAll('.agent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectAgentTarget(chip.dataset.role);
    });
  });

  // Char counter for textarea
  const taskInput = document.getElementById('task-input');
  const charCount = document.getElementById('task-char-count');
  taskInput?.addEventListener('input', () => {
    const len = taskInput.value.length;
    if (charCount) {
      charCount.textContent = `${len} char${len !== 1 ? 's' : ''}`;
      charCount.classList.toggle('char-count--warn', len > 500);
    }
  });
}

// ── Live View Tabs ────────────────────────────────────────────
function initLiveTabs() {
  const tabs = document.querySelectorAll('.live-tab[data-tab]');
  const panels = document.querySelectorAll('.live-tab-panel');
  const controls = document.getElementById('live-tab-controls');

  function switchTab(tabId) {
    tabs.forEach(t => {
      t.classList.toggle('live-tab--active', t.dataset.tab === tabId);
    });
    panels.forEach(p => {
      p.classList.toggle('live-tab-panel--active', p.id === `tab-panel-${tabId}`);
    });
    if (controls) controls.style.display = tabId === 'live' ? 'flex' : 'none';
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });

  switchTab('live');
}

// ── Main view: Dashboard | Skills ─────────────────────────────
function initMainNav() {
  const tabs = document.querySelectorAll('.main-nav-tab[data-view]');
  const views = document.querySelectorAll('.main-view');

  function switchView(viewId) {
    tabs.forEach(t => t.classList.toggle('main-nav-tab--active', t.dataset.view === viewId));
    views.forEach(v => {
      v.classList.toggle('main-view--active', v.id === `view-${viewId}`);
    });
    if (viewId === 'skills') onSkillsTabActivated();
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => switchView(t.dataset.view));
  });
}

// ── Skills ────────────────────────────────────────────────────

const AGENT_META = {
  po:     { label: 'Product Owner', emoji: '🧑‍💼', color: '#00e5ff' },
  tech:   { label: 'Tech Lead',     emoji: '🏗️',   color: '#2979ff' },
  dev:    { label: 'Developer',     emoji: '💻',   color: '#00e676' },
  qa:     { label: 'QA Tester',     emoji: '🧪',   color: '#ffd600' },
  devops: { label: 'DevOps',        emoji: '🚀',   color: '#d500f9' },
};

const CATEGORY_META = {
  api:     { label: 'API & Architecture',  color: '#ff9100' },
  dev:     { label: 'Development',         color: '#69f0ae' },
  lang:    { label: 'Languages',           color: '#40c4ff' },
  design:  { label: 'Design & Frontend',   color: '#f48fb1' },
  test:    { label: 'Testing & Quality',   color: '#c6ff00' },
  ops:     { label: 'Operations',          color: '#ffca28' },
  special: { label: 'Specialized',         color: '#ce93d8' },
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function loadSkills() {
  const emptyAgentSkills = { po: [], tech: [], dev: [], qa: [], devops: [] };
  try {
    const [sr, ar] = await Promise.all([fetch('/api/skills'), fetch('/api/agent-skills')]);
    const isJson = (r) => (r.headers.get('content-type') || '').includes('application/json');
    let skills = [];
    let agentSkills = emptyAgentSkills;
    let apiUnavailable = false;
    if (sr.ok && isJson(sr)) {
      const data = await sr.json();
      skills = data.skills || [];
    } else if (!sr.ok) {
      apiUnavailable = true;
      console.warn('Skills API not available (404). Restart dashboard server: cd web && node server.js');
    }
    if (ar.ok && isJson(ar)) {
      agentSkills = await ar.json();
      if (!agentSkills || typeof agentSkills !== 'object') agentSkills = emptyAgentSkills;
    } else if (!ar.ok) {
      apiUnavailable = true;
      if (!sr.ok) console.warn('Agent-skills API not available (404). Restart dashboard server: cd web && node server.js');
    }
    state.skillsApiUnavailable = apiUnavailable;
    state.skillsCatalog = skills;
    state.agentSkills   = agentSkills;
    const unavEl = document.getElementById('skills-api-unavailable');
    if (unavEl) unavEl.classList.toggle('hidden', !state.skillsApiUnavailable);
    renderSkillsContent();
    updateAgentTabCounts();
  } catch (e) {
    console.warn('Skills load failed', e);
    state.skillsCatalog = state.skillsCatalog || [];
    state.agentSkills   = state.agentSkills || emptyAgentSkills;
    state.skillsApiUnavailable = true;
    const unavEl = document.getElementById('skills-api-unavailable');
    if (unavEl) unavEl.classList.remove('hidden');
    renderSkillsContent();
    updateAgentTabCounts();
  }
}

function buildGraphData() {
  const nodes = [];
  const links = [];
  const addedSkills = new Set();

  for (const [id, meta] of Object.entries(AGENT_META)) {
    nodes.push({ id, label: meta.label, color: meta.color, group: 'agent', size: 8 });
  }

  for (const [agentId, skillIds] of Object.entries(state.agentSkills)) {
    if (!Array.isArray(skillIds)) continue;
    for (const skillId of skillIds) {
      const skill = state.skillsCatalog.find(s => s.id === skillId);
      if (!skill) continue;
      if (!addedSkills.has(skillId)) {
        const catColor = CATEGORY_META[skill.category]?.color || '#888';
        nodes.push({ id: skillId, label: skill.name, color: catColor, group: 'skill', size: 3 });
        addedSkills.add(skillId);
      }
      links.push({ source: agentId, target: skillId });
    }
  }
  return { nodes, links };
}

async function initSkillsGraph() {
  const container = document.getElementById('skills-graph-container');
  if (!container) return;

  if (state.graph3d) {
    state.graph3d.graphData(buildGraphData());
    return;
  }

  try {
    if (!window.ForceGraph3D) {
      await loadScript('https://unpkg.com/3d-force-graph');
    }
    const { default: SpriteText } = await import('https://esm.sh/three-spritetext@1');

    container.innerHTML = '';   // clear placeholder

    state.graph3d = ForceGraph3D()(container)
      .graphData(buildGraphData())
      .nodeThreeObject(node => {
        const sprite = new SpriteText(node.label || node.id);
        sprite.material.depthWrite = false;
        sprite.color         = node.color || '#fff';
        sprite.textHeight    = node.group === 'agent' ? 10 : 7;
        sprite.padding       = 2;
        sprite.borderWidth   = node.group === 'agent' ? 1.5 : 1;
        sprite.borderColor   = (node.color || '#fff') + '80';
        sprite.borderRadius  = 4;
        sprite.backgroundColor = node.group === 'agent'
          ? (node.color || '#fff') + '22'
          : 'rgba(0,0,0,0.5)';
        return sprite;
      })
      .nodeThreeObjectExtend(false)
      .nodeVal(node => node.size)
      .linkColor(() => 'rgba(255,255,255,0.5)')
      .linkWidth(1)
      .linkDirectionalParticles(1)
      .linkDirectionalParticleSpeed(0.005)
      .backgroundColor('#060910')
      .onNodeClick(node => {
        if (node.group !== 'agent') return;
        document.querySelectorAll('.skills-agent-tab').forEach(t => {
          t.classList.toggle('skills-agent-tab--active', t.dataset.agent === node.id);
        });
        state.selectedSkillAgent = node.id;
        renderSkillsContent();
        document.getElementById('skills-content')?.scrollIntoView({ behavior: 'smooth' });
      });

    state.graph3d.d3Force('charge').strength(-80);
    state.graph3d.d3Force('link').distance(60);
    state.graph3d.onEngineStop(() => state.graph3d.zoomToFit(400, 40));
  } catch (e) {
    console.warn('3D graph init failed', e);
    const c = document.getElementById('skills-graph-container');
    if (c) c.innerHTML = '<div class="graph-placeholder"><span>3D graph unavailable — check console</span></div>';
  }
}

function renderSkillsContent() {
  const container = document.getElementById('skills-content');
  if (!container || !state.skillsCatalog.length) return;

  const agentId  = state.selectedSkillAgent || 'po';
  const assigned = state.agentSkills[agentId] || [];
  const query    = (state.skillsSearch || '').toLowerCase().trim();

  const grouped = {};
  for (const skill of state.skillsCatalog) {
    if (query) {
      const haystack = (skill.name + ' ' + (skill.description || '')).toLowerCase();
      if (!haystack.includes(query)) continue;
    }
    if (!grouped[skill.category]) grouped[skill.category] = [];
    grouped[skill.category].push(skill);
  }

  if (!Object.keys(grouped).length) {
    container.innerHTML = `<div class="skills-no-results">No skills match "<em>${esc(query)}</em>"</div>`;
    return;
  }

  container.innerHTML = Object.entries(grouped).map(([cat, skills]) => {
    const meta = CATEGORY_META[cat] || { label: cat, color: '#888' };
    return `
      <div class="skills-category">
        <div class="skills-category-title" style="color:${meta.color}">${meta.label}</div>
        <div class="skills-cards">
          ${skills.map(skill => {
            const active = assigned.includes(skill.id);
            return `<button class="skill-card${active ? ' skill-card--active' : ''}"
              data-skill="${skill.id}"
              style="--chip-color:${meta.color}">
              <span class="skill-card-name">${esc(skill.name)}</span>
              ${skill.description ? `<span class="skill-card-desc">${esc(skill.description)}</span>` : ''}
            </button>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.skill-card').forEach(btn => {
    btn.addEventListener('click', () => toggleSkill(agentId, btn.dataset.skill));
  });
}

function updateAgentTabCounts() {
  document.querySelectorAll('.skills-agent-tab').forEach(btn => {
    const agent = btn.dataset.agent;
    const count = (state.agentSkills[agent] || []).length;
    const badge = btn.querySelector('.agent-skill-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  });
}

async function toggleSkill(agentId, skillId) {
  if (!state.agentSkills[agentId]) state.agentSkills[agentId] = [];
  const arr = state.agentSkills[agentId];
  const action = arr.includes(skillId) ? 'remove' : 'add';
  // Snapshot for rollback
  const prev = [...arr];
  if (action === 'add') arr.push(skillId);
  else state.agentSkills[agentId] = arr.filter(s => s !== skillId);

  renderSkillsContent();
  updateAgentTabCounts();
  if (state.graph3d) state.graph3d.graphData(buildGraphData());

  const hint = document.getElementById('skills-save-hint');
  try {
    const r = await fetch('/api/agent-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agentId, skillId, action }),
    });
    const data = await r.json();
    if (data.success) {
      if (hint) {
        hint.textContent = '✓ Saved';
        hint.className = 'skills-save-hint skills-save-hint--ok';
        setTimeout(() => { hint.textContent = ''; hint.className = 'skills-save-hint'; }, 2000);
      }
    } else {
      // Rollback optimistic update
      state.agentSkills[agentId] = prev;
      renderSkillsContent();
      updateAgentTabCounts();
      if (state.graph3d) state.graph3d.graphData(buildGraphData());
      if (hint) {
        hint.textContent = `Error: ${data.error}`;
        hint.className = 'skills-save-hint skills-save-hint--err';
        setTimeout(() => { hint.textContent = ''; hint.className = 'skills-save-hint'; }, 3000);
      }
    }
  } catch (e) {
    // Rollback on network error
    state.agentSkills[agentId] = prev;
    renderSkillsContent();
    updateAgentTabCounts();
    if (state.graph3d) state.graph3d.graphData(buildGraphData());
    if (hint) {
      hint.textContent = 'Network error — change not saved';
      hint.className = 'skills-save-hint skills-save-hint--err';
      setTimeout(() => { hint.textContent = ''; hint.className = 'skills-save-hint'; }, 3000);
    }
  }
}

function initSkillsSubTabs() {
  const tabs = document.querySelectorAll('.skills-sub-tab[data-skill-panel]');
  const panels = document.querySelectorAll('.skills-sub-panel');

  function switchSkillsPanel(panelId) {
    tabs.forEach(t => t.classList.toggle('skills-sub-tab--active', t.dataset.skillPanel === panelId));
    panels.forEach(p => p.classList.toggle('skills-sub-panel--active', p.id === `skills-panel-${panelId}`));
    if (panelId === 'map') setTimeout(initSkillsGraph, 50);
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => switchSkillsPanel(t.dataset.skillPanel));
  });
}

function onSkillsTabActivated() {
  if (!state.skillsCatalog.length) {
    loadSkills().then(() => setTimeout(initSkillsGraph, 150));
  } else {
    setTimeout(initSkillsGraph, 150);
  }
}

// ── Log Filter ────────────────────────────────────────────────
function applyLogFilter() {
  const { role, text } = state.logFilter;
  document.querySelectorAll('#log-output .log-line').forEach(line => {
    const roleMatch = role === 'all' || line.classList.contains(`log-line--${role}`);
    const textMatch = !text || line.textContent.toLowerCase().includes(text.toLowerCase());
    line.style.display = (roleMatch && textMatch) ? '' : 'none';
  });
}

function initLogFilter() {
  const search = document.getElementById('log-search');
  search?.addEventListener('input', () => {
    state.logFilter.text = search.value;
    applyLogFilter();
  });
  document.querySelectorAll('.role-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-filter-btn')
        .forEach(b => b.classList.remove('role-filter-btn--active'));
      btn.classList.add('role-filter-btn--active');
      state.logFilter.role = btn.dataset.filter;
      applyLogFilter();
    });
  });
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  startClock();
  loadStatus();
  initSSE();
  loadFiles();
  loadTasks();
  loadWorkflow();
  bindAgentCards();

  // Mode toggle: hide target when workflow
  document.getElementById('task-mode')?.addEventListener('change', () => {
    const mode = document.getElementById('task-mode').value;
    const field = document.getElementById('field-target-agent');
    if (field) field.style.display = mode === 'workflow' ? 'none' : 'block';
  });
  document.getElementById('field-target-agent').style.display =
    document.getElementById('task-mode')?.value === 'workflow' ? 'none' : 'block';

  // Dispatch button
  document.getElementById('btn-dispatch').addEventListener('click', dispatchTask);

  // Confirm modal
  document.getElementById('btn-confirm-close')?.addEventListener('click', hideConfirmModal);
  document.getElementById('confirm-modal')?.querySelector('.confirm-modal-backdrop')?.addEventListener('click', hideConfirmModal);
  document.getElementById('btn-confirm-edit')?.addEventListener('click', () => {
    hideConfirmModal();
    if (state.pendingDispatch) document.getElementById('task-input').focus();
  });
  document.getElementById('btn-confirm-send')?.addEventListener('click', confirmAndSend);

  // Task flow
  document.getElementById('btn-refresh-tasks')?.addEventListener('click', loadTasks);

  // Dispatch on Ctrl+Enter in textarea
  document.getElementById('task-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) dispatchTask();
  });

  // Save config button
  document.getElementById('btn-save-config').addEventListener('click', saveConfig);

  // Workspace panel — file browser
  const fileInput = document.getElementById('ws-file-input');
  fileInput.addEventListener('change', () => loadWorkspaceFromFile(fileInput.files[0]));

  // Browse button — stop propagation so it doesn't also trigger dropzone click
  document.getElementById('btn-browse-ws').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // Drag-and-drop on dropzone (click = open picker, but not when clicking the button)
  const dropzone = document.getElementById('ws-dropzone');
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover',  (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', ()  => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadWorkspaceFromFile(file);
  });

  // Load from server path
  document.getElementById('btn-load-ws-path').addEventListener('click', loadWorkspaceFromPath);
  document.getElementById('ws-server-path').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadWorkspaceFromPath();
  });

  // Same-as-workspace checkbox
  const sameCb = document.getElementById('path-same-as-workspace');
  const projInput = document.getElementById('path-project');
  const btnBrowseProject = document.getElementById('btn-browse-project');
  if (sameCb && projInput) {
    sameCb.addEventListener('change', () => {
      projInput.disabled = sameCb.checked;
      if (btnBrowseProject) btnBrowseProject.disabled = sameCb.checked;
      if (sameCb.checked) setVal('path-project', document.getElementById('path-workspace').value);
    });
  }
  // Sync project from workspace when typing (if same-as checked)
  const wsInput = document.getElementById('path-workspace');
  if (wsInput) wsInput.addEventListener('input', () => {
    if (sameCb?.checked) setVal('path-project', wsInput.value);
  });

  // Apply / save
  document.getElementById('btn-save-paths').addEventListener('click', savePaths);

  // Live view tabs
  initLiveTabs();
  initMainNav();
  initSkillsSubTabs();
  initLogFilter();

  // Clear log
  document.getElementById('btn-clear-log').addEventListener('click', () => {
    document.getElementById('log-output').innerHTML = '';
  });

  // Auto-scroll toggle
  document.getElementById('btn-autoscroll').addEventListener('click', (e) => {
    state.autoScroll = !state.autoScroll;
    e.target.classList.toggle('btn-tiny--active', state.autoScroll);
    e.target.textContent = state.autoScroll ? 'AUTO ↓' : 'MANUAL';
  });

  // Refresh files
  document.getElementById('btn-refresh-files').addEventListener('click', loadFiles);

  // Close file viewer
  document.getElementById('btn-close-viewer').addEventListener('click', () => {
    document.getElementById('file-viewer').classList.add('hidden');
  });

  // Skills — agent selector tabs
  document.getElementById('skills-agent-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.skills-agent-tab');
    if (!btn) return;
    document.querySelectorAll('.skills-agent-tab')
      .forEach(t => t.classList.remove('skills-agent-tab--active'));
    btn.classList.add('skills-agent-tab--active');
    state.selectedSkillAgent = btn.dataset.agent;
    renderSkillsContent();
  });

  // Skills — search input
  document.getElementById('skills-search')?.addEventListener('input', e => {
    state.skillsSearch = e.target.value;
    renderSkillsContent();
  });

  // Refresh status every 10s
  setInterval(loadStatus, 10_000);

  // Folder browse modal
  initBrowseModal();
}

// ── Folder Browse Modal ──────────────────────────────────────
function initBrowseModal() {
  const modal = document.getElementById('browse-modal');
  const listEl = document.getElementById('browse-folder-list');
  const pathInput = document.getElementById('browse-path-input');
  const btnClose = document.getElementById('btn-browse-close');
  const btnGo = document.getElementById('btn-browse-go');
  const btnSelect = document.getElementById('btn-browse-select');
  const btnBrowseFolder = document.getElementById('btn-browse-folder');
  const btnBrowseProject = document.getElementById('btn-browse-project');
  const backdrop = modal?.querySelector('.browse-modal-backdrop');

  let browseCurrentPath = '';
  let browseTarget = null; // 'workspace' | 'project'

  async function loadBrowseList(path) {
    if (!listEl) return;
    listEl.innerHTML = '<div class="browse-loading">Loading…</div>';
    try {
      const r = await fetch(`/api/browse?path=${encodeURIComponent(path || '')}`);
      const contentType = r.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await r.json();
      } else {
        const text = await r.text();
        const msg = r.status === 404
          ? 'API ไม่พบ (404). กรุณาเปิด Dashboard ผ่าน http://localhost:3030 และตรวจสอบว่า server กำลังรันอยู่ (cd web && node server.js)'
          : `Server error ${r.status}: ${text.slice(0, 80)}`;
        throw new Error(r.ok ? 'Invalid response from server' : msg);
      }
      listEl.innerHTML = '';
      if (data.error) {
        listEl.innerHTML = `<div class="browse-error">${escapeHtml(data.error)}</div>`;
        return;
      }
      browseCurrentPath = data.path;
      pathInput.value = data.path;

      if (data.parent && data.parent !== data.path) {
        const row = document.createElement('div');
        row.className = 'browse-item browse-item--parent';
        row.innerHTML = `<span class="browse-icon">↩</span> <span>.. (parent)</span>`;
        row.dataset.path = data.parent;
        row.addEventListener('click', () => loadBrowseList(data.parent));
        listEl.appendChild(row);
      }
      (data.items || []).forEach(item => {
        const row = document.createElement('div');
        row.className = 'browse-item';
        row.innerHTML = `<span class="browse-icon">📁</span> <span>${escapeHtml(item.name)}</span>`;
        row.dataset.path = item.path;
        row.addEventListener('click', () => loadBrowseList(item.path));
        listEl.appendChild(row);
      });
    } catch (e) {
      const msg = e.message || 'Failed to load folders';
      listEl.innerHTML = `<div class="browse-error">${escapeHtml(msg)}</div>`;
    }
  }

  function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function openBrowse(target) {
    browseTarget = target;
    const wsPath = document.getElementById('path-workspace').value.trim();
    const projPath = document.getElementById('path-project').value.trim();
    const startPath = target === 'workspace' ? wsPath : projPath;
    loadBrowseList(startPath || ''); // empty = server uses HOME
    modal?.classList.remove('hidden');
  }

  function closeBrowse() {
    modal?.classList.add('hidden');
    browseTarget = null;
  }

  async function selectCurrent() {
    if (!browseTarget) return;
    if (browseTarget === 'workspace') {
      setVal('path-workspace', browseCurrentPath);
      if (document.getElementById('path-same-as-workspace')?.checked) {
        setVal('path-project', browseCurrentPath);
      }
    } else {
      setVal('path-project', browseCurrentPath);
    }
    closeBrowse();
    // Auto-save so paths persist across restarts
    await savePaths();
  }

  btnBrowseFolder?.addEventListener('click', () => openBrowse('workspace'));
  btnBrowseProject?.addEventListener('click', () => openBrowse('project'));
  btnClose?.addEventListener('click', closeBrowse);
  backdrop?.addEventListener('click', closeBrowse);
  btnGo?.addEventListener('click', () => loadBrowseList(pathInput.value.trim() || '/'));
  pathInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadBrowseList(pathInput.value.trim() || '/');
  });
  btnSelect?.addEventListener('click', selectCurrent);

  // Load roots on first open (for path input default)
  fetch('/api/browse/roots')
    .then(r => r.headers.get('content-type')?.includes('json') ? r.json() : Promise.reject(new Error('Not JSON')))
    .then(data => {
      if (data?.roots?.length && pathInput) {
        pathInput.placeholder = data.roots[0]?.path || '/Users/you';
      }
    })
    .catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
