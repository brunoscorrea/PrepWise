/* =========================================================
   PrepWise — app.js
   Application shell, certification store, study plan engine and the
   certification-scoped views (Home, Study Plan, Analytics, Settings).
   Vanilla JS, no dependencies. All data lives on this device (localStorage).

   Store layout (localStorage) — one namespace per local profile, see js/profiles.js:
     prepwise:profiles                 list of local profiles and which one is active
     <profile>store                    the profile's store (settings, certifications, progress)
     <profile>bank:<certId>            question bank of a user-created/imported certification
     <profile>snapshots                last few automatic snapshots taken before destructive changes
   The profile that used PrepWise before profiles existed keeps its original keys
   (prepwise:v2, prepwise:bank:*, prepwise:snapshots, prepwise:backup:v1 and the
   untouched v1 data in m365-study-tracker:v1).
   ========================================================= */
'use strict';

(() => {
  const S = window.PrepWiseSchema;
  const P = window.PrepWiseProfiles;
  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  // Storage keys of the active profile (set in boot() before anything is read).
  let profile = null;            // { id, name, ns, ... } from the registry
  let registry = null;
  let K = P.keys({ id: 'pboot0000', ns: 'p' });
  let STORE_KEY = K.store;
  let BANK_PREFIX = K.bankPrefix;
  let SNAP_KEY = K.snaps;
  let suspended = false;         // true while switching/deleting profiles: nothing is written
  const APP_VERSION = '2.2.0';
  const APP_NAME = 'PrepWise';
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const FALLBACK_TARGETS = [60, 60, 60, 60, 60, 120, 120];
  const KINDS = {
    study: { label: 'Study', cls: 'blue' },
    practical: { label: 'Practical', cls: 'violet' },
    revision: { label: 'Revision', cls: 'amber' },
    assessment: { label: 'Assessment', cls: 'amber' },
  };
  const STATUS = {
    pending: { label: 'Pending', cls: '' },
    completed: { label: 'Completed', cls: 'teal' },
    partial: { label: 'Partial', cls: 'amber' },
    skipped: { label: 'Skipped', cls: 'red' },
  };
  const LOCALES = { 'en-AU': 'English (Australia)', 'en-GB': 'English (UK)', 'en-US': 'English (US)' };
  const THEMES = { dark: 'Dark', midnight: 'Midnight (true black)' };

  // ---------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  const todayISO = () => toISO(new Date());
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000); // b - a in days
  const isValidISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseISO(s));
  const num = (v, fallback = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const plural = (n, w, p = `${w}s`) => `${n} ${n === 1 ? w : p}`;

  const locale = () => (store && LOCALES[store.settings.locale] ? store.settings.locale : 'en-AU');
  function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
    if (!iso) return '';
    return parseISO(iso).toLocaleDateString(locale(), opts);
  }
  function relDay(iso) {
    const d = daysBetween(todayISO(), iso);
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d === -1) return 'Yesterday';
    return fmtDate(iso);
  }
  function fmtMin(min) {
    min = Math.round(min);
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return `${m}m`;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const fmtHours = (sec) => { const h = sec / 3600; return h >= 10 ? h.toFixed(1).replace(/\.0$/, '') : h.toFixed(1); };
  function fmtClock(ms) {
    const t = Math.floor(ms / 1000);
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  // ---------------------------------------------------------------
  // Icons (inline SVG, 24px grid, 1.8 stroke)
  // ---------------------------------------------------------------
  const ICONS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    home: '<path d="M3.5 10.5L12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
    dashboard: '<rect x="3" y="3" width="7.5" height="9" rx="2"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="2"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2"/><rect x="3" y="15" width="7.5" height="6" rx="2"/>',
    plan: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/>',
    progress: '<path d="M4 20V12M10 20V5M16 20v-6M3 21h18"/><path d="M16 9l4-4"/>',
    analytics: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="6" width="3" height="12" rx="1"/><rect x="16" y="13" width="3" height="5" rx="1"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    cert: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.2L7 21l5-2.6L17 21l-1.5-7.8"/><path d="M10 9l1.5 1.5L14.5 7.5"/>',
    library: '<rect x="3.5" y="4" width="4" height="16" rx="1"/><rect x="9.5" y="4" width="4" height="16" rx="1"/><path d="M16 5.2l3.6-1 3 15.5-3.6 1z"/>',
    resources: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
    note: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14.5 3v4.5H19M8.5 12h7M8.5 16h5"/>',
    bookmark: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.2L5.5 21V4.5a1 1 0 0 1 1-1z"/>',
    revision: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.2L5.5 21V4.5a1 1 0 0 1 1-1z"/><path d="M9 9.5h6"/>',
    more: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    archive: '<rect x="3" y="4" width="18" height="4.5" rx="1.2"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4"/>',
    switch: '<path d="M7 7h12l-3.5-3.5M17 17H5l3.5 3.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    play: '<path d="M7.5 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9 3.94a1 1 0 0 0-1.5.86z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
    stop: '<rect x="5.5" y="5.5" width="13" height="13" rx="2.5" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    flame: '<path d="M12 3c1 3.6 5.2 5.6 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.3 1.2-3.8 2.5-4.8.3 1.7 1.1 2.7 2.2 2.7 0-2.9-.5-5.3.5-8.1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    hourglass: '<path d="M7 3h10M7 21h10M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9"/>',
    book: '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 0 2 2h12v-4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5v4h-5z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    install: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7.5v7M9.2 11.8L12 14.6l2.8-2.8"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 13l4-4.5"/><circle cx="12" cy="13.5" r="1.4" fill="currentColor"/>',
    wifiOff: '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-2.4-1.7M2 9.5a15 15 0 0 1 4.2-2.6M22 9.5A15 15 0 0 0 11 6"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // Numeric input with a separate unit label (fixes the overlapping "min" bug):
  // [   60   ][min] — the unit is its own flex item, never positioned over the text.
  function numField({ value = '', bind = '', min = 0, max = '', step = 1, unit = '', id = '', placeholder = '', label = '', name = '', cls = '' }) {
    return `<div class="num-field ${cls}">
      <input class="num-input num" type="number" inputmode="numeric" ${min !== '' ? `min="${min}"` : ''} ${max !== '' ? `max="${max}"` : ''} step="${step}"
        value="${esc(value)}" ${bind ? `data-bind="${esc(bind)}"` : ''} ${id ? `id="${esc(id)}"` : ''} ${name ? `name="${esc(name)}"` : ''}
        ${placeholder ? `placeholder="${esc(placeholder)}"` : ''} ${label ? `aria-label="${esc(label)}"` : ''}>
      ${unit ? `<span class="num-unit" aria-hidden="true">${esc(unit)}</span>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------------
  // Built-in certification profiles (certifications/*/profile.js)
  // ---------------------------------------------------------------
  const BUILTINS = new Map();
  (window.PrepWiseBuiltins || []).forEach((b) => {
    try {
      const c = S.normaliseCertification(b.certification);
      BUILTINS.set(c.id, { cert: c, questions: b.questions });
    } catch (e) { console.error('Invalid built-in profile', e); }
  });

  // ---------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------
  let store;      // whole application store
  let state;      // progress of the active certification (personal data)
  let cert;       // content of the active certification (shareable data)
  let storageOk = true;
  const bankCache = new Map();

  function defaultStartDate() {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun, 1=Mon
    const offset = dow === 1 ? 0 : (8 - dow) % 7;
    return toISO(addDays(now, offset));
  }

  function defaultAppSettings() {
    return {
      name: '', theme: 'dark', landing: 'home', locale: 'en-AU',
      defaultCert: null, selector: 'last', installDismissed: false, sidebarCollapsed: false,
    };
  }

  function freshStore() {
    return {
      schema: S.STORE_VERSION, appVersion: APP_VERSION, createdAt: new Date().toISOString(),
      settings: defaultAppSettings(), activeCert: null, certs: {}, progress: {}, deletedBuiltins: [], migratedFrom: null,
    };
  }

  // Certification record stored on the device = shareable content + bookkeeping.
  function certRecord(content, extra = {}) {
    const now = new Date().toISOString();
    return { ...S.normaliseCertification(content), builtin: null, examSource: 'local', bankSource: 'local', archived: false, createdAt: now, updatedAt: now, ...extra };
  }

  function installBuiltin(id) {
    const b = BUILTINS.get(id);
    if (!b) return null;
    store.certs[id] = certRecord(b.cert, { builtin: id, examSource: 'builtin', bankSource: 'builtin' });
    store.deletedBuiltins = store.deletedBuiltins.filter((x) => x !== id);
    return store.certs[id];
  }

  function ensureBuiltins() {
    BUILTINS.forEach((b, id) => {
      const rec = store.certs[id];
      if (!rec) { if (!store.deletedBuiltins.includes(id)) installBuiltin(id); return; }
      // Keep built-in exam content in step with app updates unless the user replaced it.
      if (rec.builtin === id && rec.examSource === 'builtin') rec.exam = clone(b.cert.exam);
    });
  }

  // ----- Progress (personal) -----
  function newSession(p = {}) {
    return {
      id: uid(), week: 1, day: 0, order: 0, topic: 'New study task', kind: 'study',
      plannedMin: 60, customPlanned: false, actualSec: 0, status: 'pending',
      lectureRef: '', notes: '', concepts: '', exercises: '', lectures: [], completedOn: null,
      ...p,
    };
  }

  function planTargets(c) { return c.plan.dailyTargets || [...FALLBACK_TARGETS]; }
  function planStudyDays(c) { return c.plan.studyDays || [true, true, true, true, true, true, true]; }

  // Instantiate sessions and weekly objectives from a certification's plan template.
  function buildFromPlan(c, targets, studyDays, weeksIfEmpty = 4) {
    const tmpl = c.plan.weeks.length ? c.plan.weeks : Array.from({ length: weeksIfEmpty }, (_, i) => ({ title: `Week ${i + 1}`, objectives: [], sessions: null }));
    // A plan with no sessions at all gets one study session per study day.
    const generate = tmpl.every((w) => !w.sessions || !w.sessions.length);
    const sessions = [];
    const weeks = tmpl.map((w, wi) => {
      if (w.sessions && w.sessions.length) {
        const perDay = {};
        w.sessions.forEach((s, si) => {
          const order = perDay[s.day] = (perDay[s.day] ?? -1) + 1;
          const custom = s.plannedMin !== targets[s.day];
          const extra = (s.links || s.exercise || s.objs) ? { tpl: `${wi}:${si}` } : {};
          sessions.push(newSession({ week: wi + 1, day: s.day, order, topic: s.topic, kind: s.kind, plannedMin: s.plannedMin, customPlanned: custom, ...extra }));
        });
      } else if (generate) {
        // No template sessions: one study session per study day.
        studyDays.forEach((on, di) => { if (on) sessions.push(newSession({ week: wi + 1, day: di, topic: 'Study session', plannedMin: targets[di] })); });
      }
      return { week: wi + 1, title: w.title, objectives: (w.objectives || []).map((text) => ({ id: uid(), text, done: false })), revision: 'not-started', assessmentScore: null };
    });
    return { weeks, sessions };
  }

  function defaultProgress(c) {
    const targets = planTargets(c);
    const studyDays = planStudyDays(c);
    const { weeks, sessions } = buildFromPlan(c, targets, studyDays);
    const course = c.resources.find((r) => r.type === 'course' && r.url);
    return {
      version: 2,
      createdAt: new Date().toISOString(),
      settings: {
        programmeTitle: c.name, startDate: defaultStartDate(), targetDate: null,
        courseUrl: course ? course.url : '', dailyTargets: [...targets], studyDays: [...studyDays],
        masteryTarget: c.exam.masteryTarget || 85,
      },
      weeks, sessions,
      quizzes: [],
      course: { lectureTitle: '', section: '', progress: 0, resumeUrl: '', updatedAt: null },
      activity: {}, timer: null, achievements: {},
      quiz: null, notes: [], bookmarks: { topics: [], resources: [], notes: [] },
      ui: { planWeek: null, revisionTab: 'bookmarks' },
      lastStudied: null,
    };
  }

  // Merge loaded/imported progress onto defaults so missing keys never break the app.
  function normaliseProgress(raw, c) {
    const d = defaultProgress(c);
    if (!raw || typeof raw !== 'object') return d;
    const s = { ...d, ...raw };
    s.settings = { ...d.settings, ...(raw.settings || {}) };
    delete s.settings.name; // app-level since v2
    if (!Array.isArray(s.settings.dailyTargets) || s.settings.dailyTargets.length !== 7) s.settings.dailyTargets = [...d.settings.dailyTargets];
    s.settings.dailyTargets = s.settings.dailyTargets.map((v, i) => clamp(num(v, d.settings.dailyTargets[i]), 0, 720));
    if (!Array.isArray(s.settings.studyDays) || s.settings.studyDays.length !== 7) s.settings.studyDays = s.settings.dailyTargets.map((v) => v > 0);
    s.settings.studyDays = s.settings.studyDays.map(Boolean);
    if (!isValidISO(s.settings.startDate)) s.settings.startDate = d.settings.startDate;
    if (s.settings.targetDate && (!isValidISO(s.settings.targetDate) || s.settings.targetDate < s.settings.startDate)) s.settings.targetDate = null;
    s.settings.masteryTarget = clamp(num(s.settings.masteryTarget, 85), 1, 100);
    s.settings.programmeTitle = String(s.settings.programmeTitle || c.name).slice(0, 80);
    s.settings.courseUrl = typeof s.settings.courseUrl === 'string' ? s.settings.courseUrl : '';
    const W = Array.isArray(raw.weeks) && raw.weeks.length ? clamp(raw.weeks.length, 1, S.MAX_WEEKS) : d.weeks.length;
    s.weeks = Array.isArray(raw.weeks) && raw.weeks.length
      ? raw.weeks.slice(0, W).map((w, i) => ({
        week: i + 1, title: String((w && w.title) || `Week ${i + 1}`).slice(0, 80),
        objectives: Array.isArray(w && w.objectives) ? w.objectives.map((o) => ({ id: o.id || uid(), text: String(o.text || ''), done: !!o.done })) : [],
        revision: ['not-started', 'in-progress', 'done'].includes(w && w.revision) ? w.revision : 'not-started',
        assessmentScore: w && w.assessmentScore != null && w.assessmentScore !== '' ? clamp(num(w.assessmentScore), 0, 100) : null,
      }))
      : d.weeks;
    s.sessions = Array.isArray(raw.sessions)
      ? raw.sessions.filter((x) => x && typeof x === 'object').map((x) => {
        const n = newSession({ ...x });
        n.id = String(n.id || uid());
        n.week = clamp(Math.round(num(n.week, 1)), 1, W);
        n.day = clamp(Math.round(num(n.day, 0)), 0, 6);
        n.order = Math.max(0, Math.round(num(n.order, 0)));
        n.plannedMin = clamp(num(n.plannedMin, 60), 0, 1440);
        n.actualSec = Math.max(0, Math.round(num(n.actualSec, 0)));
        if (!STATUS[n.status]) n.status = 'pending';
        if (!KINDS[n.kind]) n.kind = 'study';
        n.topic = String(n.topic || 'Untitled task').slice(0, 140);
        n.lectures = Array.isArray(n.lectures) ? n.lectures.map((l) => ({ id: l.id || uid(), title: String(l.title || ''), done: !!l.done })) : [];
        return n;
      })
      : d.sessions;
    s.quizzes = Array.isArray(raw.quizzes) ? raw.quizzes.filter((q) => q && q.id) : [];
    const course = raw.course || raw.udemy || {};
    s.course = { ...d.course, ...course };
    delete s.udemy;
    s.activity = raw.activity && typeof raw.activity === 'object' ? raw.activity : {};
    s.achievements = raw.achievements && typeof raw.achievements === 'object' ? raw.achievements : {};
    s.notes = Array.isArray(raw.notes) ? raw.notes.filter((n) => n && n.id) : [];
    s.bookmarks = { ...d.bookmarks, ...(raw.bookmarks && typeof raw.bookmarks === 'object' ? raw.bookmarks : {}) };
    ['topics', 'resources', 'notes'].forEach((k) => { if (!Array.isArray(s.bookmarks[k])) s.bookmarks[k] = []; });
    s.ui = { ...d.ui, ...(raw.ui || {}) };
    delete s.ui.installDismissed;
    if (s.timer && !s.sessions.some((x) => x.id === s.timer.sessionId)) s.timer = null;
    s.version = 2;
    return s;
  }

  // ----- Migration from v1 (single AB-650 study tracker) -----
  function migrateLegacy(v1) {
    const st = freshStore();
    store = st;
    ensureBuiltins();
    if (!store.certs['ab-650']) installBuiltin('ab-650');
    const c = resolveCert('ab-650');
    store.progress['ab-650'] = normaliseProgress(v1, c);
    st.settings.name = (v1.settings && v1.settings.name) || '';
    st.settings.installDismissed = !!(v1.ui && v1.ui.installDismissed);
    st.settings.defaultCert = 'ab-650';
    st.activeCert = 'ab-650';
    st.migratedFrom = { key: P.LEGACY.v1, at: new Date().toISOString(), backupKey: P.LEGACY.v1Backup };
    return st;
  }

  function normaliseStore(raw) {
    const st = { ...freshStore(), ...raw };
    st.settings = { ...defaultAppSettings(), ...(raw.settings || {}) };
    if (!THEMES[st.settings.theme]) st.settings.theme = 'dark';
    if (!LOCALES[st.settings.locale]) st.settings.locale = 'en-AU';
    st.certs = raw.certs && typeof raw.certs === 'object' ? raw.certs : {};
    st.progress = raw.progress && typeof raw.progress === 'object' ? raw.progress : {};
    st.deletedBuiltins = Array.isArray(raw.deletedBuiltins) ? raw.deletedBuiltins : [];
    Object.keys(st.certs).forEach((id) => {
      if (!S.isValidCertId(id)) { delete st.certs[id]; return; }
      const r = st.certs[id];
      st.certs[id] = { ...certRecord(r), builtin: r.builtin || null, examSource: r.examSource || 'local', bankSource: r.bankSource || 'local', archived: !!r.archived, createdAt: r.createdAt || new Date().toISOString(), updatedAt: r.updatedAt || new Date().toISOString(), id };
    });
    st.schema = S.STORE_VERSION;
    return st;
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { storageOk = false; }
    if (raw) {
      try {
        store = normaliseStore(JSON.parse(raw));
      } catch (e) {
        console.warn('Saved data could not be read; keeping a copy and starting fresh', e);
        try { localStorage.setItem(`${K.corruptPrefix}${Date.now()}`, raw); } catch (_) { /* ignore */ }
        store = freshStore();
        setTimeout(() => toast('Saved data could not be read. A copy was kept, and the app started fresh.', { icon: 'x', ms: 6000 }), 600);
      }
    } else {
      // Only the profile that adopted the pre-profile data may migrate the v1 tracker:
      // a new profile must never inherit someone else's progress.
      let legacy = null;
      if (K.v1) { try { legacy = localStorage.getItem(K.v1); } catch (e) { /* ignore */ } }
      if (legacy) {
        try {
          // Back up the original data before anything else (never overwritten once made).
          if (!localStorage.getItem(K.v1Backup)) localStorage.setItem(K.v1Backup, legacy);
          store = migrateLegacy(JSON.parse(legacy));
          migratedNow = true;
        } catch (e) {
          console.warn('Could not migrate v1 data', e);
          store = freshStore();
        }
      } else store = freshStore();
    }
    ensureBuiltins();
    // The registry holds the profile's display name; the store mirrors it for the greeting.
    if (profile) {
      if (profile.name) store.settings.name = profile.name;
      else if (store.settings.name) { profile.name = P.cleanName(store.settings.name); try { P.rename(localStorage, registry, profile.id, profile.name); } catch (e) { /* ignore */ } }
    }
    // Make sure every certification has progress, and pick the starting certification.
    Object.keys(store.certs).forEach((id) => { store.progress[id] = normaliseProgress(store.progress[id], resolveCert(id)); });
    Object.keys(store.progress).forEach((id) => { if (!store.certs[id]) delete store.progress[id]; });
    let start = store.settings.selector === 'default' && store.settings.defaultCert ? store.settings.defaultCert : store.activeCert;
    if (!store.certs[start] || store.certs[start].archived) start = firstCertId();
    activate(start);
  }
  let migratedNow = false;

  const listCerts = ({ archived = false } = {}) => Object.values(store.certs)
    .filter((c) => archived || !c.archived)
    .sort((a, b) => (b.id === store.activeCert) - (a.id === store.activeCert) || a.code.localeCompare(b.code));
  const firstCertId = () => {
    const live = Object.values(store.certs).filter((c) => !c.archived).sort((a, b) => a.code.localeCompare(b.code));
    return live.length ? live[0].id : null;
  };

  function resolveCert(id) { return store.certs[id] || null; }

  function activate(id) {
    store.activeCert = id && store.certs[id] ? id : null;
    cert = store.activeCert ? store.certs[store.activeCert] : null;
    state = cert ? (store.progress[cert.id] = store.progress[cert.id] || defaultProgress(cert)) : null;
    if (store.activeCert && !store.settings.defaultCert) store.settings.defaultCert = store.activeCert;
  }

  let saveTimer = null;
  function save(immediate = false) {
    clearTimeout(saveTimer);
    if (suspended || !store) return;
    const write = () => {
      if (suspended) return;
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(store));
        storageOk = true;
      } catch (e) {
        storageOk = false;
        toast('Could not save — storage is full or blocked.', { icon: 'x' });
      }
    };
    if (immediate) write(); else saveTimer = setTimeout(write, 120);
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ----- Question banks -----
  function getQuestions(id = store.activeCert) {
    const rec = store.certs[id];
    if (!rec) return [];
    if (bankCache.has(id)) return bankCache.get(id);
    let list = [];
    if (rec.bankSource === 'builtin' && BUILTINS.has(rec.builtin)) {
      try { list = (BUILTINS.get(rec.builtin).questions() || []).map((q) => S.normaliseQuestion(q, rec.exam)); } catch (e) { console.error(e); }
    } else {
      try { const raw = localStorage.getItem(BANK_PREFIX + id); list = raw ? JSON.parse(raw).map((q) => S.normaliseQuestion(q, rec.exam)) : []; } catch (e) { console.error('Bank unreadable', e); list = []; }
    }
    bankCache.set(id, list);
    return list;
  }
  function setQuestions(id, list) {
    const rec = store.certs[id];
    if (!rec) return false;
    try {
      localStorage.setItem(BANK_PREFIX + id, JSON.stringify(list.map(S.stripQuestion)));
    } catch (e) { toast('Could not save the question bank — storage is full.', { icon: 'x' }); return false; }
    rec.bankSource = 'local';
    rec.updatedAt = new Date().toISOString();
    bankCache.delete(id);
    save(true);
    hooks.bankChange.forEach((fn) => fn(id));
    return true;
  }
  function removeBank(id) { try { localStorage.removeItem(BANK_PREFIX + id); } catch (e) { /* ignore */ } bankCache.delete(id); }

  // ----- Snapshots (automatic safety net before destructive changes) -----
  function snapshot(reason) {
    try {
      const list = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
      list.unshift({ at: new Date().toISOString(), reason, store: JSON.parse(JSON.stringify(store)) });
      const write = (l) => localStorage.setItem(SNAP_KEY, JSON.stringify(l));
      let keep = list.slice(0, 3);
      try { write(keep); } catch (e) { keep = list.slice(0, 1); try { write(keep); } catch (_) { /* no space */ } }
    } catch (e) { console.warn('Snapshot failed', e); }
  }
  function listSnapshots() { try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); } catch (e) { return []; } }

  // ---------------------------------------------------------------
  // Derived data (active certification)
  // ---------------------------------------------------------------
  const weekCount = () => (state ? state.weeks.length : 0);
  const weekNums = () => Array.from({ length: weekCount() }, (_, i) => i + 1);
  const getSession = (id) => state.sessions.find((s) => s.id === id);
  const sessionDate = (s) => toISO(addDays(parseISO(state.settings.startDate), (s.week - 1) * 7 + s.day));
  const sessionFraction = (s) => (s.status === 'completed' ? 1 : s.status === 'partial' ? 0.5 : 0);
  const sortSessions = (list) => [...list].sort((a, b) => a.week - b.week || a.day - b.day || a.order - b.order);
  const planEndISO = () => toISO(addDays(parseISO(state.settings.startDate), weekCount() * 7 - 1));
  const deadlineISO = () => (state.settings.targetDate && state.settings.targetDate >= state.settings.startDate ? state.settings.targetDate : planEndISO());

  function weekStats(w) {
    const ss = state.sessions.filter((s) => s.week === w);
    const wk = state.weeks[w - 1];
    const plannedMin = ss.reduce((a, s) => a + num(s.plannedMin), 0);
    const actualSec = ss.reduce((a, s) => a + num(s.actualSec), 0);
    const completed = ss.filter((s) => s.status === 'completed').length;
    const partial = ss.filter((s) => s.status === 'partial').length;
    const skipped = ss.filter((s) => s.status === 'skipped').length;
    const objDone = wk.objectives.filter((o) => o.done).length;
    const items = ss.length + wk.objectives.length;
    const score = ss.reduce((a, s) => a + sessionFraction(s), 0) + objDone;
    return {
      week: w, sessions: ss, plannedMin, actualSec, completed, partial, skipped,
      objDone, objTotal: wk.objectives.length, items, score,
      pct: items ? (score / items) * 100 : 0,
      allSessionsDone: ss.length > 0 && completed === ss.length,
    };
  }

  function activityDays() {
    return Object.keys(state.activity).filter((k) => {
      const a = state.activity[k];
      return a && (num(a.min) > 0 || num(a.done) > 0);
    }).sort();
  }
  function currentStreak() {
    const has = new Set(activityDays());
    let d = new Date();
    if (!has.has(toISO(d))) { d = addDays(d, -1); if (!has.has(toISO(d))) return 0; }
    let n = 0;
    while (has.has(toISO(d))) { n++; d = addDays(d, -1); }
    return n;
  }
  function longestStreak() {
    let best = 0, run = 0, prev = null;
    activityDays().forEach((k) => { run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; });
    return best;
  }

  function overall() {
    if (!state) return null;
    const ss = state.sessions;
    const today = todayISO();
    const start = state.settings.startDate;
    const deadline = deadlineISO();
    const totalDays = Math.max(1, daysBetween(start, deadline) + 1);
    const W = weekCount();
    const dayNo = daysBetween(start, today) + 1;
    const phase = dayNo < 1 ? 'before' : dayNo > totalDays ? 'after' : 'during';
    const weeks = weekNums().map(weekStats);
    const items = weeks.reduce((a, w) => a + w.items, 0);
    const score = weeks.reduce((a, w) => a + w.score, 0);
    const pending = sortSessions(ss.filter((s) => s.status === 'pending'));
    const plannedMin = ss.reduce((a, s) => a + num(s.plannedMin), 0);
    const actualSec = ss.reduce((a, s) => a + num(s.actualSec), 0);
    return {
      today, start, dayNo, phase, weeks, deadline, totalDays, W,
      currentWeek: phase === 'before' ? 1 : phase === 'after' ? W : clamp(Math.ceil(dayNo / 7), 1, W),
      pct: items ? (score / items) * 100 : 0,
      expected: phase === 'before' ? 0 : phase === 'after' ? 100 : ((dayNo - 1) / totalDays) * 100,
      plannedMin, actualSec,
      remainingSec: Math.max(0, plannedMin * 60 - actualSec),
      completed: ss.filter((s) => s.status === 'completed').length,
      partial: ss.filter((s) => s.status === 'partial').length,
      skipped: ss.filter((s) => s.status === 'skipped').length,
      total: ss.length,
      daysRemaining: phase === 'before' ? totalDays : phase === 'after' ? 0 : daysBetween(today, deadline) + 1,
      startsIn: phase === 'before' ? 1 - dayNo : 0,
      streak: currentStreak(),
      next: pending[0] || null,
    };
  }

  function motivation(o) {
    if (o.phase === 'before') return `Your programme starts ${o.startsIn === 1 ? 'tomorrow' : `in ${o.startsIn} days`}. Skim Week 1 and get your study environment ready.`;
    if (o.total === 0) return 'Your study plan is empty. Add sessions in the Study Plan to start tracking.';
    if (o.pct >= 99.5) return 'Programme complete. Review your knowledge gaps and book the exam while it is fresh.';
    if (o.phase === 'after') return 'The target date has passed. Finish the remaining sessions at a steady pace — consistency beats speed.';
    if (o.pct === 0) return 'Day one. One focused session is all today asks of you.';
    if (o.expected - o.pct > 15) return 'You are a little behind plan. A solid weekend session will close the gap.';
    if (o.pct < 25) return 'Good start. Strong foundations make the later topics much easier.';
    if (o.pct < 50) return 'Building momentum. Keep your daily study time protected.';
    if (o.pct < 75) return 'Past halfway. Keep connecting concepts through hands-on practice.';
    if (o.pct < 90) return 'Final stretch. Prioritise the weak areas from your quiz results.';
    return 'Almost there. Run a mock exam and close the last gaps.';
  }

  // ---------------------------------------------------------------
  // Activity, status & timer
  // ---------------------------------------------------------------
  function logActivity({ min = 0, done = 0 } = {}) {
    if (!state) return;
    const k = todayISO();
    const a = state.activity[k] || { min: 0, done: 0 };
    a.min = Math.round((num(a.min) + min) * 10) / 10;
    a.done = num(a.done) + done;
    state.activity[k] = a;
    state.lastStudied = new Date().toISOString();
  }

  function setStatus(s, status) {
    if (!STATUS[status] || s.status === status) return;
    const wasDone = s.status === 'completed' || s.status === 'partial';
    s.status = status;
    if (status === 'completed' || status === 'partial') {
      s.completedOn = todayISO();
      if (!wasDone) logActivity({ done: 1 });
    } else s.completedOn = null;
    save();
    afterChange();
  }

  const timerElapsed = () => {
    const t = state && state.timer;
    if (!t) return 0;
    return t.accMs + (t.running ? Math.max(0, Date.now() - t.startedAt) : 0);
  };
  function timerStart(id) {
    if (state.timer && state.timer.sessionId !== id) timerStop();
    if (!state.timer) state.timer = { sessionId: id, running: true, startedAt: Date.now(), accMs: 0 };
    else if (!state.timer.running) { state.timer.running = true; state.timer.startedAt = Date.now(); }
    save(true); ensureTick(); updateTimerUI();
  }
  function timerPause() {
    const t = state && state.timer;
    if (!t || !t.running) return;
    t.accMs += Math.max(0, Date.now() - t.startedAt);
    t.running = false; t.startedAt = null;
    save(true); updateTimerUI();
  }
  function timerStop() {
    const t = state && state.timer;
    if (!t) return 0;
    const ms = timerElapsed();
    state.timer = null;
    const s = getSession(t.sessionId);
    let sec = 0;
    if (s && ms >= 1000) {
      sec = Math.round(ms / 1000);
      s.actualSec += sec;
      logActivity({ min: sec / 60 });
      toast(`Logged ${fmtClock(sec * 1000)} to “${s.topic}”`, { icon: 'clock' });
    }
    save(true); updateTimerUI(); afterChange();
    return sec;
  }
  let tickHandle = null;
  function ensureTick() {
    if (tickHandle) return;
    tickHandle = setInterval(() => {
      if (!state || !state.timer || !state.timer.running) { clearInterval(tickHandle); tickHandle = null; }
      updateTimerUI(true);
    }, 1000);
  }

  function updateTimerUI(tickOnly = false) {
    const t = state && state.timer;
    const elapsed = timerElapsed();
    $$('[data-timer-for]').forEach((box) => {
      const id = box.dataset.timerFor;
      const mine = t && t.sessionId === id;
      const disp = $('.timer-display', box);
      const status = $('.timer-status', box);
      if (disp) disp.textContent = fmtClock(mine ? elapsed : 0);
      box.classList.toggle('running', !!(mine && t.running));
      if (tickOnly) return;
      const other = t && !mine ? getSession(t.sessionId) : null;
      if (status) status.textContent = mine ? (t.running ? 'Timer running' : 'Paused') : other ? `Timer active on “${other.topic}” — starting here will log that time first` : 'Ready';
      const bStart = $('[data-action="timer-start"]', box);
      const bPause = $('[data-action="timer-pause"]', box);
      const bStop = $('[data-action="timer-stop"]', box);
      if (bStart) { bStart.disabled = !!(mine && t.running); bStart.innerHTML = `${icon('play')}${mine && !t.running ? 'Resume' : 'Start'}`; }
      if (bPause) bPause.disabled = !(mine && t.running);
      if (bStop) bStop.disabled = !mine;
    });
    const mini = $('#mini-timer');
    const sheetShowsIt = t && $(`[data-timer-for="${t.sessionId}"]`);
    if (!t || sheetShowsIt) mini.hidden = true;
    else {
      const s = getSession(t.sessionId);
      if (mini.hidden || !tickOnly || mini.dataset.running !== String(t.running)) {
        mini.dataset.running = String(t.running);
        mini.innerHTML = `
          <div class="mt-body" data-action="open-session" data-id="${t.sessionId}">
            <div class="mt-time num">${fmtClock(elapsed)}</div>
            <div class="mt-topic">${t.running ? 'Studying' : 'Paused'} · ${esc(s ? s.topic : '')}</div>
          </div>
          ${t.running
            ? `<button class="icon-btn" data-action="timer-pause" aria-label="Pause">${icon('pause')}</button>`
            : `<button class="icon-btn" data-action="timer-start" data-id="${t.sessionId}" aria-label="Resume">${icon('play')}</button>`}
          <button class="icon-btn" data-action="timer-stop" aria-label="Stop and log">${icon('stop')}</button>`;
      } else { const tm = $('.mt-time', mini); if (tm) tm.textContent = fmtClock(elapsed); }
      mini.classList.toggle('running', t.running);
      mini.hidden = false;
    }
    document.title = t && t.running ? `${fmtClock(elapsed)} · Studying` : cert ? `${cert.code} · ${APP_NAME}` : APP_NAME;
  }

  // ---------------------------------------------------------------
  // Achievements & celebrations (per certification)
  // ---------------------------------------------------------------
  const BASE_ACHIEVEMENTS = [
    { id: 'first-session', t: 'First session', d: 'Complete your first session', icon: 'check', test: (o) => o.completed + o.partial >= 1 },
    { id: 'streak-3', t: '3-day streak', d: 'Study three days in a row', icon: 'flame', test: () => longestStreak() >= 3 },
    { id: 'streak-7', t: '7-day streak', d: 'A full week without a gap', icon: 'flame', test: () => longestStreak() >= 7 },
    { id: 'hours-10', t: '10 hours logged', d: 'Ten hours of focused study', icon: 'clock', test: (o) => o.actualSec >= 36000 },
    { id: 'hours-half', t: 'Halfway in hours', d: 'Half your planned hours', icon: 'clock', test: (o) => o.plannedMin > 0 && o.actualSec >= (o.plannedMin * 60) / 2 },
    { id: 'hours-all', t: 'Hours target met', d: 'All planned hours logged', icon: 'clock', test: (o) => o.plannedMin > 0 && o.actualSec >= o.plannedMin * 60 },
    { id: 'mastery', t: 'Mastery score', d: 'A recorded quiz at or above target', icon: 'target', test: () => state.quizzes.some((q) => quizPct(q) >= state.settings.masteryTarget) },
    { id: 'udemy-50', t: 'Course halfway', d: 'Course progress at 50%', icon: 'book', test: () => num(state.course.progress) >= 50 },
    { id: 'udemy-100', t: 'Course finished', d: 'Course progress at 100%', icon: 'book', test: () => num(state.course.progress) >= 100 },
    { id: 'programme', t: 'Programme complete', d: 'Every session completed', icon: 'star', test: (o) => o.total > 0 && o.completed === o.total },
  ];
  const PLUGIN_ACHIEVEMENTS = [];
  function achievementList() {
    const weeks = weekNums().slice(0, 12).map((n) => ({
      id: `week-${n}`, t: `Week ${n} complete`, d: state.weeks[n - 1].title, icon: 'trophy', test: (o) => !!(o.weeks[n - 1] && o.weeks[n - 1].allSessionsDone),
    }));
    return [...BASE_ACHIEVEMENTS.slice(0, 3), ...weeks, ...BASE_ACHIEVEMENTS.slice(3), ...PLUGIN_ACHIEVEMENTS];
  }

  function checkAchievements(silent = false) {
    if (!state) return;
    const o = overall();
    const fresh = [];
    achievementList().forEach((a) => {
      let ok = false;
      try { ok = a.test(o); } catch (e) { ok = false; }
      if (!state.achievements[a.id] && ok) { state.achievements[a.id] = todayISO(); fresh.push(a); }
    });
    if (!fresh.length) return;
    save();
    if (silent) return;
    const big = fresh.find((a) => a.id === 'programme') || fresh.find((a) => a.id.startsWith('week-'));
    if (big) {
      const w = big.id.startsWith('week-') ? o.weeks[Number(big.id.slice(5)) - 1] : null;
      celebrate(big.t, big.id === 'programme'
        ? `All ${o.total} sessions done and ${fmtHours(o.actualSec)}h logged. Outstanding consistency.`
        : `${fmtHours(w.actualSec)}h logged this week. ${w.week === o.W ? 'Time for final review.' : 'On to the next one.'}`);
    }
    fresh.filter((a) => a !== big).forEach((a, i) => setTimeout(() => toast(`Achievement unlocked · ${a.t}`, { icon: 'trophy', cls: 'ach' }), i * 400));
  }

  function afterChange() {
    checkAchievements();
    if (!sheetOpen) renderCurrent();
    else dirtyBehindSheet = true;
  }

  // ---------------------------------------------------------------
  // Shared UI components
  // ---------------------------------------------------------------
  function ring(pct, size = 112, stroke = 10, id = 'g') {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - clamp(pct, 0, 100) / 100);
    return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>
    </svg>`;
  }
  const bar = (pct, cls = '') => `<div class="bar ${cls}" role="presentation"><span style="width:${clamp(pct, 0, 100).toFixed(1)}%"></span></div>`;
  function statusDot(s) {
    const inner = s.status === 'completed' ? icon('check') : s.status === 'skipped' ? icon('x') : '';
    return `<span class="status-dot ${s.status}" aria-label="${STATUS[s.status].label}">${inner}</span>`;
  }
  function kpi({ icon: ic, label, value, sub = '', tone = '', foot = '', barPct = null, barCls = '' }) {
    return `<div class="kpi ${tone}">
      <div class="kpi-top">${icon(ic)}<span>${esc(label)}</span></div>
      <div class="kpi-value num">${value}${sub ? `<small>${sub}</small>` : ''}</div>
      ${barPct != null ? bar(barPct, barCls) : ''}
      ${foot ? `<div class="kpi-foot">${foot}</div>` : ''}
    </div>`;
  }
  const emptyState = (ic, title, body = '', actions = '') => `<div class="empty-state">${icon(ic)}<div class="es-title">${esc(title)}</div>${body ? `<p>${body}</p>` : ''}${actions ? `<div class="btn-row center">${actions}</div>` : ''}</div>`;

  function toast(msg, { icon: ic = 'check', action, onAction, cls = '', ms = 3200 } = {}) {
    const root = $('#toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast ${cls}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `${icon(ic)}<span class="t-msg">${esc(msg)}</span>${action ? `<button class="t-act">${esc(action)}</button>` : ''}`;
    root.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    if (action) $('.t-act', el).addEventListener('click', () => { onAction && onAction(); kill(); });
    setTimeout(kill, action ? ms + 3000 : ms);
    while (root.children.length > 3) root.firstChild.remove();
  }

  // Generic confirmation. `html` allows a rich preview body (already escaped by the caller).
  function confirmDialog({ title, body = '', html = '', ok = 'Confirm', danger = false, cancel = 'Cancel', requireText = '' }) {
    return new Promise((resolve) => {
      const root = $('#dialog-root');
      root.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">
        <h3 id="dlg-t">${esc(title)}</h3>${body ? `<p>${esc(body)}</p>` : ''}${html}
        ${requireText ? `<label class="field"><span class="label">Type <strong>${esc(requireText)}</strong> to confirm</span><input class="input" id="dlg-req" autocomplete="off" autocapitalize="off" spellcheck="false"></label>` : ''}
        <div class="btn-row">
          <button class="btn btn-ghost" data-d="0">${esc(cancel)}</button>
          ${ok ? `<button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-d="1" ${requireText ? 'disabled' : ''}>${esc(ok)}</button>` : ''}
        </div></div>`;
      root.hidden = false;
      const done = (v) => { root.hidden = true; root.innerHTML = ''; root.onclick = null; root.onkeydown = null; resolve(v); };
      root.onclick = (e) => {
        const b = e.target.closest('[data-d]');
        if (b && !b.disabled) done(b.dataset.d === '1');
        else if (e.target === root) done(false);
      };
      root.onkeydown = (e) => { if (e.key === 'Escape') done(false); };
      const req = $('#dlg-req', root);
      if (req) { req.addEventListener('input', () => { $('[data-d="1"]', root).disabled = req.value.trim() !== requireText; }); setTimeout(() => req.focus(), 30); }
      else ($('[data-d="1"]', root) || $('[data-d="0"]', root)).focus();
    });
  }

  function celebrate(title, sub) {
    const root = $('#celebrate-root');
    root.innerHTML = `<div class="celebrate">
      <svg class="burst" viewBox="0 0 86 86" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="43" cy="43" r="37" stroke="var(--teal)" stroke-width="5"/>
        <path d="M27 44l11 11 22-24" stroke="var(--teal)" stroke-width="6"/>
      </svg>
      <h3>${esc(title)}</h3><p>${esc(sub)}</p>
      <button class="btn btn-primary btn-block" data-close>Continue</button></div>`;
    root.hidden = false;
    root.classList.remove('out');
    const close = () => { root.classList.add('out'); setTimeout(() => { root.hidden = true; root.innerHTML = ''; }, 280); };
    root.onclick = (e) => { if (e.target === root || e.target.closest('[data-close]')) close(); };
    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
  }

  function download(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  // Pick a JSON file and return its text (or null if cancelled).
  function pickFile() {
    return new Promise((resolve) => {
      const input = $('#import-file');
      input.value = '';
      const onChange = async () => {
        input.removeEventListener('change', onChange);
        const f = input.files && input.files[0];
        if (!f) return resolve(null);
        if (f.size > 8 * 1024 * 1024) { toast('That file is larger than 8 MB.', { icon: 'x' }); return resolve(null); }
        try { resolve({ name: f.name, text: await f.text() }); } catch (e) { toast('Could not read that file.', { icon: 'x' }); resolve(null); }
      };
      input.addEventListener('change', onChange);
      input.click();
    });
  }

  // ---------------------------------------------------------------
  // Sheet (bottom sheet on mobile, centred panel on desktop) with back-button support
  // ---------------------------------------------------------------
  let sheetOpen = false;
  let sheetHasHistory = false;
  let dirtyBehindSheet = false;
  let sheetOnClose = null;
  let lastFocus = null;

  function openSheet(html, { onClose, wide = false } = {}) {
    const root = $('#sheet-root');
    if (!sheetOpen) lastFocus = document.activeElement;
    $('#sheet-body').innerHTML = html;
    $('#sheet-body').scrollTop = 0;
    $('.sheet', root).classList.toggle('wide', wide);
    root.classList.remove('closing');
    root.hidden = false;
    document.body.classList.add('sheet-open');
    sheetOnClose = onClose || null;
    if (!sheetOpen && !sheetHasHistory) { history.pushState({ sheet: true }, ''); sheetHasHistory = true; }
    sheetOpen = true;
    updateTimerUI();
    setTimeout(() => { const f = $('#sheet-body .sheet-title .icon-btn') || $('#sheet-body'); if (f && f.focus) f.focus({ preventScroll: true }); }, 40);
  }

  function closeSheet(fromPop = false) {
    if (!sheetOpen) return;
    sheetOpen = false;
    const root = $('#sheet-root');
    root.classList.add('closing');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setTimeout(() => {
      if (sheetOpen) return;
      root.hidden = true;
      root.classList.remove('closing');
      $('#sheet-body').innerHTML = '';
      if ($('#quiz-player').hidden) document.body.classList.remove('sheet-open');
      updateTimerUI();
      if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 210);
    if (sheetHasHistory && !fromPop) { sheetHasHistory = false; ignoreNextPop = true; history.back(); } else sheetHasHistory = false;
    const cb = sheetOnClose; sheetOnClose = null;
    if (cb) cb();
    dirtyBehindSheet = false;
    renderCurrent();
  }

  let ignoreNextPop = false; // the pop caused by closeSheet() itself must not dismiss a dialog opened right after
  window.addEventListener('popstate', () => {
    if (ignoreNextPop) { ignoreNextPop = false; return; }
    if (!$('#dialog-root').hidden) { $('#dialog-root [data-d="0"]')?.click(); }
    if (sheetOpen) closeSheet(true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheetOpen && $('#dialog-root').hidden) closeSheet();
  });

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  // scope: 'cert' views operate on the active certification; 'app' views are global.
  const VIEWS = {
    home: { label: 'Home', icon: 'home', scope: 'cert', render: renderHome, order: 10 },
    certs: { label: 'My Certifications', short: 'Certifications', icon: 'cert', scope: 'app', order: 5 },
    plan: { label: 'Study Plan', short: 'Plan', icon: 'plan', scope: 'cert', render: renderPlan, order: 20 },
    analytics: { label: 'Progress & Analytics', short: 'Analytics', icon: 'analytics', scope: 'cert', render: renderAnalytics, order: 60 },
    settings: { label: 'Settings', icon: 'settings', scope: 'app', render: renderSettings, order: 90 },
  };
  const VIEW_ALIASES = { dashboard: 'home', progress: 'analytics' }; // v1 links and shortcuts
  const hooks = { home: [], reset: [], load: [], ready: [], certChange: [], bankChange: [], planWeek: [], analytics: [], settingsData: [] };
  const ext = {}; // feature modules publish helpers here (quiz, revision, certs)
  let currentView = 'home';

  const BOTTOM_NAV = ['home', 'plan', 'quiz', 'analytics', 'more'];

  function buildNav() {
    const views = Object.entries(VIEWS).filter(([, v]) => v.render).sort((a, b) => a[1].order - b[1].order);
    const certViews = views.filter(([, v]) => v.scope === 'cert');
    const appViews = views.filter(([, v]) => v.scope === 'app');
    const item = ([id, v]) => `<button class="sb-item" data-nav="${id}" title="${esc(v.label)}">${icon(v.icon)}<span>${esc(v.short && v.short.length < v.label.length && v.label.length > 18 ? v.short : v.label)}</span></button>`;
    $('#sb-nav').innerHTML = `
      <div class="sb-group"><div class="sb-label">Certification</div>${certViews.map(item).join('')}</div>
      <div class="sb-group"><div class="sb-label">Workspace</div>${appViews.map(item).join('')}</div>`;
    $('#bottom-nav').innerHTML = BOTTOM_NAV.map((id) => {
      if (id === 'more') return `<button class="nav-btn" data-action="more-menu" aria-label="More"><span class="nav-ic">${icon('more')}</span><span>More</span></button>`;
      const v = VIEWS[id];
      if (!v || !v.render) return '';
      return `<button class="nav-btn" data-nav="${id}" aria-label="${esc(v.label)}"><span class="nav-ic">${icon(v.icon)}</span><span>${esc(v.short || v.label)}</span></button>`;
    }).join('');
  }

  function navigate(view, { scroll = true } = {}) {
    view = VIEW_ALIASES[view] || view;
    if (!VIEWS[view] || !VIEWS[view].render) view = 'home';
    if (!cert && VIEWS[view].scope === 'cert') view = 'certs';
    currentView = view;
    if (!$(`#view-${view}`)) {
      const sec = document.createElement('section');
      sec.className = 'view'; sec.id = `view-${view}`; sec.hidden = true; sec.setAttribute('aria-label', VIEWS[view].label);
      $('#main').appendChild(sec);
    }
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${view}`; });
    $$('[data-nav]').forEach((b) => { const on = b.dataset.nav === view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const more = $('[data-action="more-menu"]');
    if (more) more.classList.toggle('active', !BOTTOM_NAV.includes(view));
    history.replaceState(history.state, '', `#${view}`);
    renderCurrent();
    if (scroll) window.scrollTo({ top: 0 });
  }

  function renderShell() {
    if (!store) return; // still on the welcome screen
    // Active certification is shown in the sidebar and the top bar on every page.
    const chip = cert
      ? `<span class="cert-badge">${esc(cert.code)}</span><span class="cert-chip-text"><span class="cc-name">${esc(cert.name)}</span><span class="cc-prov">${esc(cert.provider)}</span></span>${icon('chevronDown', 'cc-chev')}`
      : `<span class="cert-badge muted">—</span><span class="cert-chip-text"><span class="cc-name">No certification selected</span><span class="cc-prov">Choose or create one</span></span>${icon('chevronDown', 'cc-chev')}`;
    $('#sb-cert').innerHTML = chip;
    $('#tb-cert').innerHTML = chip;
    const pn = (profile && profile.name) || 'Profile';
    const sbp = $('#sb-profile');
    if (sbp) { sbp.innerHTML = `${avatar(pn)}<span class="sbp-text"><span class="sbp-name">${esc(pn)}</span><span class="sbp-sub">${registry && registry.profiles.length > 1 ? 'Switch profile' : 'Local profile'}</span></span>`; sbp.setAttribute('aria-label', `Profile: ${pn}`); }
    const tbp = $('#tb-profile');
    if (tbp) { tbp.innerHTML = avatar(pn, 'sm'); tbp.setAttribute('aria-label', `Profile: ${pn}`); }
    $('#sb-status').innerHTML = `${navigator.onLine ? '' : `<span class="chip amber">${icon('wifiOff')}Offline</span>`}<span>v${APP_VERSION}</span>`;
    document.documentElement.dataset.theme = store.settings.theme;
    document.body.classList.toggle('sb-collapsed', !!store.settings.sidebarCollapsed);
  }

  function renderCurrent() {
    if (!store) return;
    renderShell();
    const o = overall();
    const v = VIEWS[currentView];
    const tb = $('#topbar-title'), eb = $('#topbar-eyebrow');
    tb.textContent = currentView === 'home' ? greeting() : v.label;
    tb.classList.toggle('greet', currentView === 'home');
    eb.textContent = v.eyebrow ? v.eyebrow(o) : (o && v.scope === 'cert')
      ? (o.phase === 'during' ? `Week ${o.currentWeek} of ${o.W} · Day ${o.dayNo} of ${o.totalDays}` : o.phase === 'before' ? `Starts ${fmtDate(o.start)}` : 'Target period ended')
      : APP_NAME;
    try { v.render(o); } catch (e) { console.error(e); $(`#view-${currentView}`).innerHTML = `<div class="card">${emptyState('x', 'Something went wrong showing this page.', esc(e.message))}</div>`; }
    updateTimerUI();
  }

  function greeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const n = (store.settings.name || '').trim();
    return n ? `${g}, ${n}` : g;
  }

  // Switch the whole interface to another certification.
  function switchCert(id, { toast: say = true, view } = {}) {
    if (!store.certs[id]) return;
    if (id !== store.activeCert && state && state.timer) { timerStop(); }
    activate(id);
    hooks.certChange.forEach((fn) => { try { fn(cert, state); } catch (e) { console.error(e); } });
    checkAchievements(true);
    save(true);
    if (sheetOpen) closeSheet();
    navigate(view || currentView);
    if (say) toast(`Switched to ${cert.code}`, { icon: 'switch', ms: 1800 });
  }

  function certSwitcherSheet() {
    const list = listCerts();
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">Active certification</div><h2>Switch certification</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <div class="cert-pick-list">
        ${list.length ? list.map((c) => {
          const o = progressSummary(c.id);
          return `<button class="cert-pick ${c.id === store.activeCert ? 'active' : ''}" data-action="switch-cert" data-id="${esc(c.id)}">
            <span class="cert-badge">${esc(c.code)}</span>
            <span class="cp-body"><span class="cp-name">${esc(c.name)}</span><span class="cp-meta">${esc(c.provider)} · ${Math.round(o.pct)}% complete${o.last ? ` · studied ${esc(relDay(o.last.slice(0, 10)))}` : ''}</span></span>
            ${c.id === store.activeCert ? `<span class="chip teal">${icon('check')}Active</span>` : icon('chevron', 'muted')}
          </button>`;
        }).join('') : emptyState('cert', 'No certifications yet', 'Create one or import a profile from a friend.')}
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn" data-action="goto" data-view="certs">${icon('library')} Manage certifications</button>
        <button class="btn btn-primary" data-action="new-cert">${icon('plus')} New certification</button>
      </div>`);
  }

  // Lightweight progress summary for any certification (used by lists).
  function progressSummary(id) {
    const p = store.progress[id];
    if (!p) return { pct: 0, last: null, hours: 0 };
    let items = 0, score = 0;
    p.weeks.forEach((w, i) => {
      const ss = p.sessions.filter((s) => s.week === i + 1);
      items += ss.length + w.objectives.length;
      score += ss.reduce((a, s) => a + sessionFraction(s), 0) + w.objectives.filter((o) => o.done).length;
    });
    const days = Object.keys(p.activity || {}).filter((k) => p.activity[k] && (num(p.activity[k].min) > 0 || num(p.activity[k].done) > 0)).sort();
    const lastAttempt = p.quiz && Array.isArray(p.quiz.attempts) && p.quiz.attempts.length ? p.quiz.attempts[p.quiz.attempts.length - 1].date : null;
    const last = [p.lastStudied, days.length ? days[days.length - 1] : null, lastAttempt].filter(Boolean).sort().pop() || null;
    // Quiz performance from this certification's own statistics (never mixed with other certifications)
    const stats = p.quiz && p.quiz.stats && typeof p.quiz.stats === 'object' ? Object.values(p.quiz.stats) : [];
    const qn = stats.reduce((a, s) => a + num(s && s.n), 0), qc = stats.reduce((a, s) => a + num(s && s.c), 0);
    return { pct: items ? (score / items) * 100 : 0, last, hours: p.sessions.reduce((a, s) => a + num(s.actualSec), 0) / 3600, quizAnswered: qn, quizPct: qn ? (qc / qn) * 100 : null };
  }

  // ---------------------------------------------------------------
  // Home — certification dashboard
  // ---------------------------------------------------------------
  function resumeUrl() { return (state.course.resumeUrl || '').trim() || state.settings.courseUrl || ''; }

  function renderHome(o) {
    const el = $('#view-home');
    if (!cert) { el.innerHTML = noCertState(); return; }
    const q = ext.quiz;
    const rd = q ? q.readiness() : null;
    const qst = q ? q.overallStats() : null;
    const R = ext.revision ? ext.revision.readiness(o) : null;
    const hoursPct = o.plannedMin ? (o.actualSec / 60 / o.plannedMin) * 100 : 0;
    const phaseLabel = o.phase === 'during' ? `Week ${o.currentWeek} of ${o.W} · Day ${o.dayNo}` : o.phase === 'before' ? 'Not started yet' : 'Target period complete';
    const daysLabel = o.phase === 'before' ? `Starts in ${plural(o.startsIn, 'day')}` : o.phase === 'after' ? 'Target date passed' : o.daysRemaining === 1 ? 'Final day' : `Target ${fmtDate(o.deadline, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const nextS = o.next;
    const ru = resumeUrl();

    el.innerHTML = `
      ${installBanner()}
      ${migrationBanner()}
      <section class="cert-hero">
        <div class="ch-main">
          <div class="ch-kicker"><span class="cert-badge lg">${esc(cert.code)}</span><span>${esc(cert.provider)}</span><span class="dot"></span><span>${esc(phaseLabel)}</span></div>
          <h2 class="ch-title">${esc(cert.name)}</h2>
          <p class="ch-sub">${esc(motivation(o))}</p>
          <div class="btn-row ch-actions">
            ${nextS ? `<button class="btn btn-primary" data-action="start-session" data-id="${nextS.id}">${icon('play')} ${state.timer && state.timer.sessionId === nextS.id ? 'Open timer' : 'Start next session'}</button>` : ''}
            ${ru ? `<a class="btn" href="${esc(ru)}" target="_blank" rel="noopener">${icon('external')} Continue course</a>` : ''}
            <button class="btn btn-ghost" data-action="cert-switcher">${icon('switch')} Switch</button>
          </div>
        </div>
        <div class="ch-ring">
          <div class="ring-wrap">${ring(R ? R.score : o.pct, 132, 11, 'heroGrad')}
            <div class="ring-label"><span class="ring-value num">${Math.round(R ? R.score : o.pct)}%</span><span class="ring-caption">${R ? 'readiness' : 'complete'}</span></div>
          </div>
          ${R ? `<button class="link-btn" data-action="goto" data-view="analytics" data-anchor="readiness">How is this calculated?</button>` : ''}
        </div>
      </section>

      <div class="kpi-grid">
        ${kpi({ icon: 'check', label: 'Study completion', value: `${Math.round(o.pct)}%`, barPct: o.pct, foot: `${o.completed}/${o.total} sessions${o.partial ? ` · ${o.partial} partial` : ''}`, tone: 'teal' })}
        ${kpi({ icon: 'clock', label: 'Hours completed', value: fmtHours(o.actualSec), sub: `/ ${+(o.plannedMin / 60).toFixed(1)}h`, barPct: hoursPct, tone: 'blue' })}
        ${kpi({ icon: 'hourglass', label: 'Hours remaining', value: fmtHours(o.remainingSec), sub: 'h', foot: o.daysRemaining > 0 && o.remainingSec > 0 ? `≈ ${fmtMin(o.remainingSec / 60 / Math.max(1, o.daysRemaining))} a day` : o.remainingSec === 0 ? 'Planned hours met' : '', tone: 'violet' })}
        ${kpi({ icon: 'calendar', label: 'Days remaining', value: o.daysRemaining, sub: `/ ${o.totalDays}`, foot: daysLabel, tone: 'violet' })}
        ${kpi({ icon: 'layers', label: 'Current week', value: o.phase === 'before' ? '—' : o.currentWeek, sub: `of ${o.W}`, foot: esc(state.weeks[o.currentWeek - 1] ? state.weeks[o.currentWeek - 1].title : ''), tone: 'blue' })}
        ${kpi({ icon: 'gauge', label: 'Exam preparation', value: rd && rd.hasBank ? `${Math.round(rd.score)}%` : '—', barPct: rd && rd.hasBank ? rd.score : null, barCls: 'teal', foot: rd && rd.hasBank ? `${rd.masteredCount}/${rd.ds.length} domains mastered` : 'Add a question bank to measure', tone: 'teal' })}
        ${kpi({ icon: 'target', label: 'Quiz performance', value: qst && qst.quizzes ? `${Math.round(qst.avgScore)}%` : '—', foot: qst && qst.quizzes ? `${plural(qst.quizzes, 'quiz', 'quizzes')} · ${Math.round(qst.accuracy)}% accuracy` : 'No quizzes yet', tone: 'amber' })}
        ${kpi({ icon: 'flame', label: 'Study streak', value: o.streak, sub: o.streak === 1 ? 'day' : 'days', foot: `Best ${plural(longestStreak(), 'day')}`, tone: 'amber' })}
      </div>

      <div class="home-grid">
        <div class="home-col">
          <section class="panel">
            <div class="panel-head"><h3>Next scheduled session</h3><button class="link-btn" data-nav="plan">Study plan ${icon('chevron')}</button></div>
            ${nextSessionCard(o)}
          </section>
          ${hookHTML('home', o, 'main')}
          <section class="panel">
            <div class="panel-head"><h3>Programme calendar</h3><span class="tiny muted">${fmtDate(o.start, { day: 'numeric', month: 'short' })} – ${fmtDate(o.deadline, { day: 'numeric', month: 'short' })}</span></div>
            ${countdownGrid(o)}
          </section>
          <section class="panel">
            <div class="panel-head"><h3>Weekly progress</h3></div>
            <div class="week-bars">
              ${o.weeks.map((w) => `
                <button class="week-bar-row ${o.phase === 'during' && w.week === o.currentWeek ? 'current' : ''}" data-action="plan-week" data-week="${w.week}" data-go="1">
                  <div class="row-top"><span class="label">Week ${w.week} <span class="muted">· ${esc(state.weeks[w.week - 1].title)}</span></span><span class="val num">${Math.round(w.pct)}%</span></div>
                  ${bar(w.pct, w.pct >= 100 ? 'teal' : '')}
                </button>`).join('') || '<div class="muted small">No weeks in this plan.</div>'}
            </div>
          </section>
        </div>
        <div class="home-col">
          ${hookHTML('home', o, 'side')}
          ${courseCard()}
        </div>
      </div>`;
  }

  function hookHTML(name, o, slot) {
    return hooks[name].filter((h) => (h.slot || 'main') === slot).sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((h) => { try { return h.render(o) || ''; } catch (e) { console.error(e); return ''; } }).join('');
  }

  function courseCard() {
    const c = state.course;
    const ru = resumeUrl();
    return `<section class="panel">
      <div class="panel-head"><h3>Course progress</h3><button class="link-btn" data-action="goto" data-view="analytics" data-anchor="course">Update ${icon('chevron')}</button></div>
      <div class="course-row">
        <div class="course-pct num">${Math.round(num(c.progress))}%</div>
        <div style="flex:1;min-width:0">
          ${bar(num(c.progress), 'teal')}
          <div class="course-lecture">${c.lectureTitle ? `${c.section ? `Section ${esc(c.section)} · ` : ''}${esc(c.lectureTitle)}` : '<span class="muted">No lecture recorded yet</span>'}</div>
        </div>
      </div>
      ${ru ? `<a class="btn btn-sm" style="margin-top:12px" href="${esc(ru)}" target="_blank" rel="noopener">${icon('external')} Resume course</a>` : `<div class="tiny muted" style="margin-top:10px">Add a course link in Settings → Certification preferences.</div>`}
    </section>`;
  }

  function noCertState() {
    return `<div class="panel">${emptyState('cert', 'No active certification', 'Create a certification profile, import one a friend shared with you, or restore the built-in AB-650 profile.',
      `<button class="btn btn-primary" data-action="new-cert">${icon('plus')} New certification</button><button class="btn" data-action="goto" data-view="certs">${icon('library')} My Certifications</button>`)}</div>`;
  }

  function migrationBanner() {
    if (!store.migratedFrom || store.migratedFrom.acknowledged) return '';
    return `<div class="banner info">${icon('info')}<div class="txt"><strong>Welcome to ${APP_NAME}</strong>Your AB-650 study data was moved into its own certification profile. Nothing was lost, and a backup of the original data is kept on this device.</div>
      <button class="mini-btn" data-action="ack-migration" aria-label="Dismiss">${icon('x')}</button></div>`;
  }

  function nextSessionCard(o) {
    const s = o.next;
    if (!s) return emptyState('trophy', o.total ? 'Every session is resolved' : 'No sessions planned', o.total ? 'Nice work. Use the Quiz Centre to keep your knowledge fresh.' : 'Add study sessions in the Study Plan.');
    const iso = sessionDate(s);
    const diff = daysBetween(o.today, iso);
    const d = parseISO(iso);
    const running = state.timer && state.timer.sessionId === s.id;
    return `<div class="next-card">
      <div class="next-head">
        <div class="date-chip ${diff < 0 ? 'overdue' : ''}"><span class="dow">${DAY_SHORT[(d.getDay() + 6) % 7]}</span><span class="dom num">${d.getDate()}</span></div>
        <div style="min-width:0">
          <div class="next-topic">${esc(s.topic)}</div>
          <div class="next-meta">${diff < 0 ? `<span class="tone-amber">Overdue · ${fmtDate(iso)}</span>` : relDay(iso)} · Week ${s.week} · ${fmtMin(s.plannedMin)} planned${s.actualSec ? ` · ${fmtMin(s.actualSec / 60)} done` : ''}</div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-teal" data-action="start-session" data-id="${s.id}">${icon(running ? 'clock' : 'play')} ${running ? 'Open timer' : 'Start session'}</button>
        <button class="btn" data-action="open-session" data-id="${s.id}">Details</button>
      </div>
    </div>`;
  }

  function dayAggregate(week, day) {
    const ss = state.sessions.filter((s) => s.week === week && s.day === day);
    if (!ss.length) return 'none';
    if (ss.every((s) => s.status === 'completed')) return 'completed';
    if (ss.some((s) => s.status === 'completed' || s.status === 'partial')) return 'partial';
    if (ss.every((s) => s.status === 'skipped')) return 'skipped';
    return 'pending';
  }

  function countdownGrid(o) {
    const start = parseISO(state.settings.startDate);
    const n = o.W * 7;
    let cells = '';
    for (let i = 0; i < n; i++) {
      const iso = toISO(addDays(start, i));
      const agg = dayAggregate(Math.floor(i / 7) + 1, i % 7);
      const past = iso < o.today;
      let cls = agg === 'completed' || agg === 'partial' || agg === 'skipped' ? agg : past && agg === 'pending' ? 'missed' : agg === 'none' ? 'rest' : '';
      if (iso === o.today) cls += ' today';
      if (iso === o.deadline) cls += ' deadline';
      cells += `<div class="cd-cell ${cls}" title="${fmtDate(iso)} · ${agg === 'none' ? 'no session' : agg}">${parseISO(iso).getDate()}</div>`;
    }
    const heads = Array.from({ length: 7 }, (_, i) => `<div class="cd-head">${DAY_SHORT[(addDays(start, i).getDay() + 6) % 7].slice(0, 2)}</div>`).join('');
    return `<div class="countdown-grid ${o.W > 6 ? 'compact' : ''}">${heads}${cells}</div>
      <div class="cd-legend">
        <span><i class="lg-done"></i>Done</span><span><i class="lg-partial"></i>Partial</span><span><i class="lg-skip"></i>Skipped</span>
        <span><i class="lg-missed"></i>Missed</span><span><i class="lg-today"></i>Today</span>
      </div>`;
  }

  // ---------------------------------------------------------------
  // Study plan
  // ---------------------------------------------------------------
  function renderPlan(o) {
    const el = $('#view-plan');
    if (!cert) { el.innerHTML = noCertState(); return; }
    const W = o.W;
    const w = clamp(state.ui.planWeek || o.currentWeek, 1, W);
    const ws = o.weeks[w - 1];
    const wk = state.weeks[w - 1];
    const list = sortSessions(ws.sessions);
    const startW = toISO(addDays(parseISO(state.settings.startDate), (w - 1) * 7));
    const endW = toISO(addDays(parseISO(state.settings.startDate), (w - 1) * 7 + 6));
    el.innerHTML = `
      <div class="week-tabs ${W > 6 ? 'scroll' : ''}" role="tablist" aria-label="Weeks">
        ${weekNums().map((n) => `<button role="tab" aria-selected="${n === w}" class="${n === w ? 'active' : ''} ${o.weeks[n - 1].pct >= 100 ? 'done' : ''}" data-action="plan-week" data-week="${n}">Week ${n}</button>`).join('')}
      </div>
      <div class="plan-grid">
        <div class="plan-main">
          <div class="week-head">
            <div>
              <div class="eyebrow">Week ${w} of ${W}${o.phase === 'during' && o.currentWeek === w ? ' · this week' : ''}</div>
              <h2>${esc(wk.title)}</h2>
              <div class="meta">
                <span>${fmtDate(startW, { day: 'numeric', month: 'short' })} – ${fmtDate(endW, { day: 'numeric', month: 'short' })}</span>
                <span class="num">${fmtMin(ws.actualSec / 60)} / ${fmtMin(ws.plannedMin)}</span>
                <span class="num">${Math.round(ws.pct)}% complete</span>
              </div>
            </div>
            <div class="wh-ring">${ring(ws.pct, 56, 6, `pw${w}`)}<span class="num">${Math.round(ws.pct)}%</span></div>
          </div>
          <div class="session-list">
            ${list.length ? list.map((s) => sessionItem(s, o)).join('') : `<div class="panel">${emptyState('plan', 'No sessions this week', 'Add a session or lecture block below.')}</div>`}
          </div>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn btn-ghost btn-block" data-action="add-session" data-week="${w}">${icon('plus')} Add session</button>
          </div>
        </div>
        <aside class="plan-side">
          <section class="panel">
            <div class="panel-head"><h3>Week objectives</h3><span class="tiny muted num">${ws.objDone}/${ws.objTotal}</span></div>
            ${objectivesList(w)}
          </section>
          <section class="panel">
            <div class="panel-head"><h3>Revision &amp; assessment</h3></div>
            <div class="mini-seg">
              ${[['not-started', 'Not started', 'none'], ['in-progress', 'In progress', 'mid'], ['done', 'Done', '']].map(([k, l, c]) =>
                `<button class="${wk.revision === k ? `active ${c}` : ''}" data-action="set-revision" data-week="${w}" data-rev="${k}">${l}</button>`).join('')}
            </div>
            <div class="row-split" style="margin-top:12px">
              <span class="small muted">Assessment score</span>
              ${numField({ value: wk.assessmentScore ?? '', bind: `week:${w}:assessmentScore`, min: 0, max: 100, unit: '%', placeholder: '—', label: 'Assessment score', cls: 'w-sm' })}
            </div>
            <div class="small" style="margin-top:8px">${wk.assessmentScore == null || wk.assessmentScore === ''
              ? '<span class="muted">Not assessed yet</span>'
              : num(wk.assessmentScore) >= state.settings.masteryTarget ? `<span class="chip teal">${icon('check')}Mastered</span>` : `<span class="chip amber">Below ${state.settings.masteryTarget}%</span>`}</div>
            ${hookHTML('planWeek', { week: w, o }, 'main')}
          </section>
        </aside>
      </div>`;
  }

  function objectivesList(w) {
    const wk = state.weeks[w - 1];
    return `<ul class="checklist">
        ${wk.objectives.map((ob) => `
          <li class="check-item ${ob.done ? 'done' : ''}">
            <button class="check-hit" data-action="toggle-objective" data-week="${w}" data-obj="${ob.id}" aria-label="${ob.done ? 'Mark objective not done' : 'Mark objective done'}" aria-pressed="${ob.done}"><span class="checkbox ${ob.done ? 'on' : ''}">${icon('check')}</span></button>
            <span class="txt">${esc(ob.text)}</span>
            <button class="mini-btn" data-action="edit-objective" data-week="${w}" data-obj="${ob.id}" aria-label="Edit objective">${icon('edit')}</button>
          </li>`).join('') || '<li class="muted small" style="padding:6px 2px">No objectives yet.</li>'}
      </ul>
      <div class="inline-add">
        <input class="input" type="text" placeholder="Add an objective" id="obj-input-${w}" data-enter="add-objective" data-week="${w}" aria-label="New objective">
        <button class="btn" data-action="add-objective" data-week="${w}" aria-label="Add objective">${icon('plus')}</button>
      </div>`;
  }

  function sessionItem(s, o) {
    const iso = sessionDate(s);
    const d = parseISO(iso);
    const running = state.timer && state.timer.sessionId === s.id;
    const lecDone = s.lectures.filter((l) => l.done).length;
    return `<button class="session-item status-${s.status} ${iso === o.today ? 'is-today' : ''}" data-action="open-session" data-id="${s.id}">
      <div class="date-chip ${s.status === 'completed' ? 'done' : iso < o.today && s.status === 'pending' ? 'overdue' : ''}"><span class="dow">${DAY_SHORT[(d.getDay() + 6) % 7]}</span><span class="dom num">${d.getDate()}</span></div>
      <div class="body">
        <div class="topic">${esc(s.topic)}</div>
        <div class="meta">
          <span class="chip ${KINDS[s.kind].cls}">${KINDS[s.kind].label}</span>
          <span class="chip num">${icon('clock')}${s.actualSec ? `${fmtMin(s.actualSec / 60)} / ` : ''}${fmtMin(s.plannedMin)}</span>
          ${s.status !== 'pending' ? `<span class="chip ${STATUS[s.status].cls}">${STATUS[s.status].label}</span>` : ''}
          ${s.lectures.length ? `<span class="chip">${icon('book')}${lecDone}/${s.lectures.length}</span>` : ''}
          ${running ? `<span class="chip teal">${icon('clock')}Timing</span>` : ''}
        </div>
      </div>
      ${statusDot(s)}
    </button>`;
  }

  // Study guide for a session created from a plan template (objectives, Microsoft Learn links, practical exercise).
  function sessionTemplate(s) {
    if (!s || typeof s.tpl !== 'string') return null;
    const [wi, si] = s.tpl.split(':').map(Number);
    const w = cert.plan.weeks[wi];
    return (w && w.sessions && w.sessions[si]) || null;
  }
  function sessionGuide(s) {
    const t = sessionTemplate(s);
    if (!t || !(t.links || t.exercise || t.objs)) return '';
    const objs = (t.objs || []).map((o) => {
      const text = cert.exam.objectives[o] || cert.exam.sections[o] || '';
      return `<li><span class="chip">${esc(o)}</span> ${esc(text)}</li>`;
    }).join('');
    const links = (t.links || []).map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icon(l.type === 'docs' ? 'book' : 'external')}${esc(l.title)}</a></li>`).join('');
    return `<div class="field session-guide"><span class="label">Study guide</span>
      ${objs ? `<div class="tiny muted" style="margin:4px 0">Exam objectives</div><ul class="guide-list small">${objs}</ul>` : ''}
      ${links ? `<div class="tiny muted" style="margin:8px 0 4px">Microsoft Learn and documentation</div><ul class="guide-list small">${links}</ul>` : ''}
      ${t.exercise ? `<div class="tiny muted" style="margin:8px 0 4px">Practical exercise</div><p class="small" style="margin:0;white-space:pre-line">${esc(t.exercise)}</p>` : ''}
    </div>`;
  }

  function openSessionSheet(id) {
    const s = getSession(id);
    if (!s) return;
    const iso = sessionDate(s);
    openSheet(`
      <div class="sheet-title">
        <div>
          <div class="eyebrow">${esc(cert.code)} · Week ${s.week} · Day ${(s.week - 1) * 7 + s.day + 1} · ${fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
          <h2>${esc(s.topic)}</h2>
        </div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button>
      </div>

      <div class="timer-box" data-timer-for="${s.id}">
        <div class="timer-display num">00:00</div>
        <div class="timer-status"></div>
        <div class="timer-btns">
          <button class="btn btn-teal" data-action="timer-start" data-id="${s.id}">${icon('play')}Start</button>
          <button class="btn" data-action="timer-pause">${icon('pause')}Pause</button>
          <button class="btn" data-action="timer-stop">${icon('stop')}Stop</button>
        </div>
      </div>

      <div class="field"><span class="label">Status</span>
        <div class="status-seg" data-status-for="${s.id}">
          ${Object.keys(STATUS).map((k) => `<button class="${s.status === k ? 'active' : ''}" data-action="set-status" data-id="${s.id}" data-status="${k}">${STATUS[k].label}</button>`).join('')}
        </div>
      </div>

      <div class="grid-2">
        <label class="field"><span class="label">Planned</span>
          ${numField({ value: s.plannedMin, bind: `session:${s.id}:plannedMin`, min: 0, max: 1440, step: 5, unit: 'min', label: 'Planned minutes' })}</label>
        <label class="field"><span class="label">Actual time</span>
          ${numField({ value: Math.round(s.actualSec / 60), bind: `session:${s.id}:actualMin`, min: 0, max: 1440, step: 1, unit: 'min', id: `actual-${s.id}`, label: 'Actual minutes' })}</label>
      </div>

      ${sessionGuide(s)}

      <label class="field"><span class="label">Study topic</span>
        <input class="input" type="text" value="${esc(s.topic)}" data-bind="session:${s.id}:topic" maxlength="140">
      </label>
      <label class="field"><span class="label">Course lecture / section reference</span>
        <input class="input" type="text" value="${esc(s.lectureRef)}" placeholder="e.g. Section 4 · Lecture 37" data-bind="session:${s.id}:lectureRef">
      </label>

      <div class="field"><span class="label">Lectures in this session</span>
        <ul class="checklist" id="lectures-${s.id}">${lectureItems(s)}</ul>
        <div class="inline-add">
          <input class="input" type="text" placeholder="Add a lecture title" id="lec-input-${s.id}" data-enter="add-lecture" data-id="${s.id}" aria-label="New lecture title">
          <button class="btn" data-action="add-lecture" data-id="${s.id}" aria-label="Add lecture">${icon('plus')}</button>
        </div>
      </div>

      <label class="field"><span class="label">Key concepts learned</span>
        <textarea class="textarea" data-bind="session:${s.id}:concepts" placeholder="Short bullet points work well">${esc(s.concepts)}</textarea>
      </label>
      <label class="field"><span class="label">Practical exercises completed</span>
        <textarea class="textarea" data-bind="session:${s.id}:exercises" placeholder="Labs, simulations, configuration practice…">${esc(s.exercises)}</textarea>
      </label>
      <label class="field"><span class="label">Notes</span>
        <textarea class="textarea" data-bind="session:${s.id}:notes">${esc(s.notes)}</textarea>
      </label>

      <div class="group-label">Organise</div>
      <div class="grid-2">
        <label class="field"><span class="label">Week</span>
          <select class="select" data-bind="session:${s.id}:week">${weekNums().map((n) => `<option value="${n}" ${n === s.week ? 'selected' : ''}>Week ${n}</option>`).join('')}</select>
        </label>
        <label class="field"><span class="label">Day</span>
          <select class="select" data-bind="session:${s.id}:day">${DAY_NAMES.map((n, i) => `<option value="${i}" ${i === s.day ? 'selected' : ''}>Day ${i + 1} · ${dayNameFor(s.week, i)}</option>`).join('')}</select>
        </label>
      </div>
      <label class="field"><span class="label">Type</span>
        <select class="select" data-bind="session:${s.id}:kind">${Object.keys(KINDS).map((k) => `<option value="${k}" ${k === s.kind ? 'selected' : ''}>${KINDS[k].label}</option>`).join('')}</select>
      </label>

      <div class="btn-row" style="margin-top:22px">
        <button class="btn btn-danger" data-action="delete-session" data-id="${s.id}">${icon('trash')} Delete session</button>
        <button class="btn btn-primary" data-action="close-sheet">Done</button>
      </div>
    `);
  }

  function dayNameFor(week, day) {
    return DAY_NAMES[(addDays(parseISO(state.settings.startDate), (week - 1) * 7 + day).getDay() + 6) % 7];
  }

  function lectureItems(s) {
    if (!s.lectures.length) return '<li class="muted small" style="padding:4px 2px">No lectures added yet.</li>';
    return s.lectures.map((l) => `
      <li class="check-item ${l.done ? 'done' : ''}">
        <button class="check-hit" data-action="toggle-lecture" data-id="${s.id}" data-lec="${l.id}" aria-label="Toggle lecture" aria-pressed="${l.done}"><span class="checkbox ${l.done ? 'on' : ''}">${icon('check')}</span></button>
        <span class="txt">${esc(l.title)}</span>
        <button class="mini-btn" data-action="remove-lecture" data-id="${s.id}" data-lec="${l.id}" aria-label="Remove lecture">${icon('x')}</button>
      </li>`).join('');
  }

  // ---------------------------------------------------------------
  // Progress & Analytics
  // ---------------------------------------------------------------
  const quizPct = (q) => (num(q.questions) > 0 ? (num(q.correct) / num(q.questions)) * 100 : 0);

  function renderAnalytics(o) {
    const el = $('#view-analytics');
    if (!cert) { el.innerHTML = noCertState(); return; }
    const quizzes = [...state.quizzes].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const target = state.settings.masteryTarget;
    const avg = quizzes.length ? quizzes.reduce((a, q) => a + quizPct(q), 0) / quizzes.length : 0;
    const best = quizzes.length ? Math.max(...quizzes.map(quizPct)) : 0;
    const mastered = quizzes.filter((q) => quizPct(q) >= target).length;
    const achs = achievementList();
    const earned = achs.filter((a) => state.achievements[a.id]).length;

    el.innerHTML = `
      <div class="analytics-grid">
        ${hookHTML('analytics', o, 'main')}
        <section class="panel span-2">
          <div class="panel-head"><h3>Study hours by week</h3><span class="tiny muted">Planned vs logged</span></div>
          <div class="chart-wrap">${hoursChart(o)}</div>
          <div class="chart-legend"><span><i class="lg-planned"></i>Planned</span><span><i class="lg-actual"></i>Logged</span></div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>Weekly completion</h3></div>
          <div class="wk-table">
            ${o.weeks.map((w) => `<div class="wk-row ${o.phase === 'during' && w.week === o.currentWeek ? 'current' : ''}">
              <span class="wk-n">W${w.week}</span>
              <span class="wk-t">${esc(state.weeks[w.week - 1].title)}</span>
              <span class="wk-v num">${w.completed + w.objDone}/${w.sessions.length + w.objTotal}</span>
              <span class="wk-bar">${bar(w.pct, w.pct >= 100 ? 'teal' : '')}</span>
            </div>`).join('')}
          </div>
        </section>
        ${hookHTML('analytics', o, 'side')}

        <section class="panel span-2" id="quizzes">
          <div class="panel-head"><h3>Recorded practice tests</h3><button class="link-btn" data-action="add-quiz">${icon('plus')} Add result</button></div>
          <div class="tiny muted" style="margin:-4px 0 12px">Results from practice tests you take outside the app (for example, a course's own tests).</div>
          <div class="stat-row">
            <div class="mini-stat"><div class="k">Average</div><div class="v num">${quizzes.length ? Math.round(avg) + '%' : '—'}</div></div>
            <div class="mini-stat"><div class="k">Best</div><div class="v num">${quizzes.length ? Math.round(best) + '%' : '—'}</div></div>
            <div class="mini-stat"><div class="k">At ${target}%+</div><div class="v num">${mastered}/${quizzes.length}</div></div>
          </div>
          <div class="chart-wrap">${quizChart(quizzes, target)}</div>
          ${quizzes.length ? `<div class="list-gap">${[...quizzes].reverse().map(quizItem).join('')}</div>` : ''}
        </section>

        <section class="panel" id="course">
          <div class="panel-head"><h3>Course progress</h3></div>
          <label class="field" style="margin-top:0"><span class="label">Last completed lecture title</span>
            <input class="input" type="text" value="${esc(state.course.lectureTitle)}" data-bind="course:lectureTitle" placeholder="Copy the title from your course">
          </label>
          <div class="grid-2">
            <label class="field"><span class="label">Section</span>
              <input class="input num" type="text" inputmode="numeric" value="${esc(state.course.section)}" data-bind="course:section" placeholder="e.g. 5">
            </label>
            <label class="field"><span class="label">Course progress</span>
              ${numField({ value: num(state.course.progress), bind: 'course:progress', min: 0, max: 100, unit: '%', label: 'Course progress percent' })}
            </label>
          </div>
          <label class="field"><span class="label">Resume link (optional)</span>
            <input class="input" type="url" inputmode="url" value="${esc(state.course.resumeUrl)}" data-bind="course:resumeUrl" placeholder="Paste the lecture URL to jump straight back">
            <span class="hint">Leave blank to use the course link from Settings. Progress is entered manually — the app never signs in to course sites.</span>
          </label>
          ${resumeUrl() ? `<a class="btn btn-sm" style="margin-top:12px" href="${esc(resumeUrl())}" target="_blank" rel="noopener">${icon('external')} Resume course</a>` : ''}
          ${state.course.updatedAt ? `<div class="tiny muted" style="margin-top:10px">Last updated ${fmtDate(state.course.updatedAt.slice(0, 10))}</div>` : ''}
        </section>

        <section class="panel span-3">
          <div class="panel-head"><h3>Achievements</h3><span class="tiny muted num">${earned}/${achs.length}</span></div>
          <div class="ach-grid">
            ${achs.map((a) => `<div class="ach ${state.achievements[a.id] ? 'earned' : ''}">
              <div class="ach-ic">${icon(a.icon)}</div>
              <div style="min-width:0"><div class="ach-t">${esc(a.t)}</div><div class="ach-d">${state.achievements[a.id] ? `Earned ${fmtDate(state.achievements[a.id], { day: 'numeric', month: 'short' })}` : esc(a.d)}</div></div>
            </div>`).join('')}
          </div>
        </section>
      </div>`;
  }

  function hoursChart(o) {
    const weeks = o.weeks;
    if (!weeks.length) return '<div class="muted small">No weeks yet.</div>';
    const W = 640, H = 200, L = 34, R = 8, T = 10, B = 26, iw = W - L - R, ih = H - T - B;
    const max = Math.max(1, ...weeks.map((w) => Math.max(w.plannedMin / 60, w.actualSec / 3600)));
    const niceMax = Math.ceil(max / 2) * 2;
    const y = (h) => T + ih * (1 - h / niceMax);
    const bw = iw / weeks.length;
    const barW = Math.min(26, bw * 0.32);
    const grid = [0, niceMax / 2, niceMax].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${+g.toFixed(1)}h</text>`).join('');
    const bars = weeks.map((w, i) => {
      const cx = L + bw * i + bw / 2;
      const p = w.plannedMin / 60, a = w.actualSec / 3600;
      return `<rect x="${(cx - barW - 2).toFixed(1)}" y="${y(p).toFixed(1)}" width="${barW.toFixed(1)}" height="${(y(0) - y(p)).toFixed(1)}" rx="4" class="b-planned"><title>Week ${w.week} planned: ${fmtMin(w.plannedMin)}</title></rect>
        <rect x="${(cx + 2).toFixed(1)}" y="${y(a).toFixed(1)}" width="${barW.toFixed(1)}" height="${(y(0) - y(a)).toFixed(1)}" rx="4" class="b-actual"><title>Week ${w.week} logged: ${fmtMin(w.actualSec / 60)}</title></rect>
        <text class="axis" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">W${w.week}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Planned and logged study hours per week">${grid}${bars}</svg>`;
  }

  function quizItem(q) {
    const p = quizPct(q);
    const pass = p >= state.settings.masteryTarget;
    return `<button class="quiz-item" data-action="edit-quiz" data-id="${q.id}">
      <div class="score ${pass ? 'pass' : 'fail'} num">${Math.round(p)}%</div>
      <div class="body">
        <div class="name">${esc(q.name)}</div>
        <div class="meta">${fmtDate(q.date)} · ${num(q.correct)}/${num(q.questions)} correct${q.week ? ` · Week ${q.week}` : ''}${q.topics ? ` · Improve: ${esc(q.topics)}` : ''}</div>
      </div>
      ${icon('chevron', 'muted')}
    </button>`;
  }

  function quizChart(quizzes, target) {
    const W = 640, H = 180, L = 30, R = 10, T = 12, B = 24;
    const iw = W - L - R, ih = H - T - B;
    const y = (p) => T + ih * (1 - clamp(p, 0, 100) / 100);
    if (!quizzes.length) return emptyState('target', 'No practice test results yet', 'Add a result to see your trend.');
    const n = quizzes.length;
    const x = (i) => (n === 1 ? L + iw / 2 : L + (iw * i) / (n - 1));
    const pts = quizzes.map((q, i) => [x(i), y(quizPct(q))]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[n - 1][0].toFixed(1)},${y(0)} L${pts[0][0].toFixed(1)},${y(0)} Z`;
    const grid = [0, 50, 100].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${g}</text>`).join('');
    const labelIdx = n <= 6 ? quizzes.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
    const xLabels = labelIdx.map((i) => `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${fmtDate(quizzes[i].date, { day: 'numeric', month: 'short' })}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Practice test score history">
      <defs><linearGradient id="qa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(target)}" y2="${y(target)}" class="target-line"/>
      <text class="axis target" x="${W - R}" y="${y(target) - 5}" text-anchor="end">${target}% target</text>
      ${n > 1 ? `<path d="${area}" fill="url(#qa)"/><path d="${line}" class="series"/>` : ''}
      ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" class="${quizPct(quizzes[i]) >= target ? 'pt-pass' : 'pt-fail'}"/>`).join('')}
      ${xLabels}
    </svg>`;
  }

  function openQuizSheet(id) {
    const existing = id ? state.quizzes.find((q) => q.id === id) : null;
    const q = existing || { name: '', date: todayISO(), questions: 20, correct: '', topics: '', notes: '', week: '' };
    openSheet(`
      <div class="sheet-title">
        <div><div class="eyebrow">${esc(cert.code)} · ${existing ? 'Edit result' : 'New result'}</div><h2>Practice test result</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button>
      </div>
      <form id="quiz-form" novalidate>
        <label class="field" style="margin-top:0"><span class="label">Test name</span>
          <input class="input" name="name" required maxlength="100" value="${esc(q.name)}" placeholder="e.g. Week 2 security self-assessment">
        </label>
        <div class="grid-2">
          <label class="field"><span class="label">Date</span><input class="input" type="date" name="date" value="${esc(q.date)}" required></label>
          <label class="field"><span class="label">Counts for</span>
            <select class="select" name="week"><option value="">No week</option>${weekNums().map((n) => `<option value="${n}" ${String(q.week) === String(n) ? 'selected' : ''}>Week ${n} assessment</option>`).join('')}</select>
          </label>
        </div>
        <div class="grid-2">
          <label class="field"><span class="label">Questions</span>${numField({ name: 'questions', value: q.questions, min: 1, max: 1000, label: 'Number of questions' })}</label>
          <label class="field"><span class="label">Correct</span>${numField({ name: 'correct', value: q.correct, min: 0, max: 1000, label: 'Correct answers' })}</label>
        </div>
        <div class="score-preview"><div><div class="small muted">Score</div><div class="big num" id="quiz-pct">—</div></div><div id="quiz-verdict"></div></div>
        <label class="field"><span class="label">Topics that need improvement</span>
          <input class="input" name="topics" value="${esc(q.topics)}" placeholder="e.g. Conditional Access session controls">
        </label>
        <label class="field"><span class="label">Notes</span><textarea class="textarea" name="notes">${esc(q.notes)}</textarea></label>
        <div class="btn-row" style="margin-top:20px">
          ${existing ? `<button type="button" class="btn btn-danger" data-action="delete-quiz" data-id="${existing.id}">${icon('trash')} Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Save result'}</button>
        </div>
      </form>`);
    const form = $('#quiz-form');
    const upd = () => {
      const qs = num(form.questions.value), c = num(form.correct.value, NaN);
      const pctEl = $('#quiz-pct'), v = $('#quiz-verdict');
      if (qs > 0 && Number.isFinite(c) && c >= 0 && c <= qs) {
        const p = (c / qs) * 100;
        pctEl.textContent = `${Math.round(p)}%`;
        v.innerHTML = p >= state.settings.masteryTarget ? `<span class="chip teal">${icon('check')}Mastered</span>` : `<span class="chip amber">${Math.round(state.settings.masteryTarget - p)} pts to target</span>`;
      } else { pctEl.textContent = '—'; v.innerHTML = c > qs ? '<span class="chip red">Correct exceeds questions</span>' : ''; }
    };
    form.addEventListener('input', upd);
    upd();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: form.name.value.trim(), date: form.date.value, questions: Math.round(num(form.questions.value)),
        correct: Math.round(num(form.correct.value, -1)), topics: form.topics.value.trim(), notes: form.notes.value.trim(),
        week: form.week.value ? Number(form.week.value) : '',
      };
      if (!data.name) return toast('Give the test a name.', { icon: 'x' });
      if (!isValidISO(data.date)) return toast('Pick a valid date.', { icon: 'x' });
      if (data.questions < 1) return toast('Number of questions must be at least 1.', { icon: 'x' });
      if (data.correct < 0 || data.correct > data.questions) return toast('Correct answers must be between 0 and the number of questions.', { icon: 'x' });
      if (existing) Object.assign(existing, data); else state.quizzes.push({ id: uid(), ...data });
      if (data.week && state.weeks[data.week - 1]) state.weeks[data.week - 1].assessmentScore = Math.round((data.correct / data.questions) * 100);
      logActivity({});
      save();
      closeSheet();
      toast(existing ? 'Result updated' : 'Result saved');
      checkAchievements();
    });
  }

  // ---------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------
  let deferredInstall = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function installBanner() {
    if (isStandalone() || store.settings.installDismissed || !deferredInstall) return '';
    return `<div class="banner">${icon('install')}
      <div class="txt"><strong>Install ${APP_NAME}</strong>Works offline from your home screen or desktop.</div>
      <button class="btn btn-sm btn-primary" data-action="install">Install</button>
      <button class="mini-btn" data-action="dismiss-install" aria-label="Dismiss">${icon('x')}</button>
    </div>`;
  }

  function settingsSection(id, title, ic, desc, body) {
    return `<section class="settings-section" id="set-${id}">
      <div class="ss-head">${icon(ic)}<div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div></div>
      <div class="panel">${body}</div>
    </section>`;
  }

  function renderSettings() {
    const el = $('#view-settings');
    const ap = store.settings;
    const st = state ? state.settings : null;
    const certs = listCerts();
    const general = `
      <div class="form-grid">
        <label class="field"><span class="label">Theme</span><select class="select" data-bind="app:theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${ap.theme === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span class="label">Default landing page</span><select class="select" data-bind="app:landing">${[['home', 'Home'], ['plan', 'Study Plan'], ['quiz', 'Quiz Centre'], ['analytics', 'Progress & Analytics'], ['certs', 'My Certifications']].filter(([k]) => VIEWS[k] && VIEWS[k].render).map(([k, v]) => `<option value="${k}" ${ap.landing === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span class="label">Language &amp; date format</span><select class="select" data-bind="app:locale">${Object.entries(LOCALES).map(([k, v]) => `<option value="${k}" ${ap.locale === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <span class="hint">The interface is in English. This changes how dates are shown.</span></label>
      </div>
      <div class="row-split" style="margin-top:16px">
        ${isStandalone()
          ? `<span class="small">${icon('check')} Installed — running as an app.</span>`
          : deferredInstall
            ? `<button class="btn btn-primary" data-action="install">${icon('install')} Install app</button>`
            : `<span class="small muted">To install: open this site in Chrome or Edge and choose <strong>Install app</strong> from the browser menu. On iPhone, use Share → <strong>Add to Home Screen</strong>.</span>`}
      </div>`;

    const schedule = !state ? emptyState('calendar', 'No active certification') : `
      <div class="ss-cert">${icon('cert')} Applies to <strong>${esc(cert.code)} · ${esc(cert.name)}</strong> only.</div>
      <div class="form-grid">
        <label class="field"><span class="label">Programme start date</span><input class="input" type="date" value="${esc(st.startDate)}" data-bind="settings:startDate"></label>
        <label class="field"><span class="label">Target completion date</span><input class="input" type="date" value="${esc(st.targetDate || '')}" min="${esc(st.startDate)}" data-bind="settings:targetDate">
          <span class="hint">Leave blank to use the end of the plan (${fmtDate(planEndISO(), { day: 'numeric', month: 'short', year: 'numeric' })}).</span></label>
        <label class="field"><span class="label">Programme length</span>${numField({ value: weekCount(), bind: 'settings:weeks', min: 1, max: S.MAX_WEEKS, unit: 'weeks', label: 'Programme length in weeks' })}
          <span class="hint">Adding weeks creates empty weeks. Removing weeks asks before deleting their sessions.</span></label>
        <label class="field"><span class="label">Programme title</span><input class="input" value="${esc(st.programmeTitle)}" data-bind="settings:programmeTitle" maxlength="80"></label>
      </div>
      <div id="start-callout">${startCallout()}</div>
      <div class="group-label">Daily study durations &amp; study days</div>
      <div class="small muted" style="margin:4px 0 8px">Minutes for each day slot of a programme week. Changing a duration updates every session in that slot unless you set its planned time manually.</div>
      <div class="target-list">
        ${DAY_NAMES.map((d, i) => `<div class="target-row ${st.studyDays[i] ? '' : 'off'}">
          <label class="switch" title="Study day"><input type="checkbox" ${st.studyDays[i] ? 'checked' : ''} data-bind="studyday:${i}" aria-label="Study on day ${i + 1}"><span></span></label>
          <span class="tr-label"><strong>Day ${i + 1}</strong><span class="muted">${dayNameFor(1, i)}</span></span>
          ${numField({ value: st.dailyTargets[i], bind: `target:${i}`, min: 0, max: 720, step: 5, unit: 'min', label: `Day ${i + 1} minutes` })}
        </div>`).join('')}
      </div>
      <div class="target-total"><span>Weekly study target</span><span class="num" id="weekly-target-out">${fmtMin(weeklyTargetMin())}</span></div>
      <div class="target-total sub"><span class="muted">Programme total (all sessions)</span><span class="num muted" id="total-target-out">${fmtMin(state.sessions.reduce((a, s) => a + num(s.plannedMin), 0))}</span></div>
      <div class="group-label">Week themes</div>
      <div class="form-grid">${state.weeks.map((w) => `<label class="field"><span class="label">Week ${w.week}</span><input class="input" value="${esc(w.title)}" data-bind="week:${w.week}:title" maxlength="80"></label>`).join('')}</div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn" data-action="goto" data-view="plan">${icon('plan')} Open study plan</button>
        <button class="btn btn-ghost" data-action="fill-sessions">${icon('plus')} Add sessions to empty study days</button>
      </div>`;

    const prefs = `
      <div class="form-grid">
        <label class="field"><span class="label">Default certification</span><select class="select" data-bind="app:defaultCert">${certs.map((c) => `<option value="${esc(c.id)}" ${ap.defaultCert === c.id ? 'selected' : ''}>${esc(c.code)} · ${esc(c.name)}</option>`).join('') || '<option value="">None</option>'}</select></label>
        <label class="field"><span class="label">When the app opens</span><select class="select" data-bind="app:selector">
          <option value="last" ${ap.selector === 'last' ? 'selected' : ''}>Open the last certification I used</option>
          <option value="default" ${ap.selector === 'default' ? 'selected' : ''}>Always open the default certification</option></select></label>
      </div>
      ${state ? `<div class="group-label">${esc(cert.code)} preferences</div>
      <div class="form-grid">
        <label class="field"><span class="label">Exam preparation target score</span>${numField({ value: st.masteryTarget, bind: 'settings:masteryTarget', min: 1, max: 100, unit: '%', label: 'Target score' })}
          <span class="hint">Domains, quizzes and assessments count as mastered at this score.</span></label>
        <label class="field"><span class="label">Main course URL</span><input class="input" type="url" inputmode="url" value="${esc(st.courseUrl)}" data-bind="settings:courseUrl" placeholder="https://">
          <span class="hint">Used by “Continue course”.</span></label>
      </div>` : ''}`;

    const data = `
      <div class="data-grid">
        <div class="data-card">
          <h4>${icon('shield')} Profile backup</h4>
          <p>Everything in ${esc(profileLabel())}'s profile: certifications, question banks, progress, notes and settings. Other profiles aren't included.</p>
          <div class="btn-row"><button class="btn" data-action="export-all">${icon('download')} Export backup</button><button class="btn" data-action="import-any">${icon('upload')} Import file</button></div>
        </div>
        <div class="data-card">
          <h4>${icon('cert')} ${state ? esc(cert.code) : 'Certification'} profile</h4>
          <p>Share the study content and questions. Personal results are never included.</p>
          <div class="btn-row">${state ? `<button class="btn" data-action="export-cert" data-id="${esc(cert.id)}">${icon('download')} Export profile</button><button class="btn" data-action="export-progress" data-id="${esc(cert.id)}">${icon('download')} Export my progress</button>` : ''}<button class="btn" data-action="import-any">${icon('upload')} Import profile</button></div>
        </div>
        ${hookHTML('settingsData', null, 'main')}
      </div>
      <div class="group-label">Reset</div>
      <div class="btn-row">
        ${state ? `<button class="btn btn-danger" data-action="reset-progress">${icon('refresh')} Reset ${esc(cert.code)} progress</button>` : ''}
      </div>
      <div class="tiny muted" style="margin-top:10px">Resetting a certification clears only that certification's progress. Its study plan, questions and every other certification stay as they are. To clear everything in your profile, use <a href="#set-profile" data-action="scroll-to" data-target="set-profile">Profile → Reset my profile</a>.</div>
      ${restoreRow()}
      <div class="tiny muted" style="margin-top:14px">${storageOk ? 'Data saves automatically in this browser only.' : 'Storage is unavailable — changes may not be saved.'} Export a backup now and then: clearing site data in your browser erases it.</div>`;

    el.innerHTML = `
      <nav class="settings-nav" aria-label="Settings sections">
        ${[['profile', 'Profile'], ['general', 'General'], ['schedule', 'Study Schedule'], ['prefs', 'Certification Preferences'], ['data', 'Data Management']].map(([k, l]) => `<a href="#set-${k}" data-action="scroll-to" data-target="set-${k}">${l}</a>`).join('')}
      </nav>
      ${settingsSection('profile', 'Profile', 'user', 'Your name, local profiles and privacy.', profileSettings())}
      ${settingsSection('general', 'General', 'settings', 'Appearance and how the app starts.', general)}
      ${settingsSection('schedule', 'Study Schedule', 'calendar', state ? `Dates and daily study time for ${esc(cert.code)}.` : '', schedule)}
      ${settingsSection('prefs', 'Certification Preferences', 'cert', 'Which certification opens and how preparation is scored.', prefs)}
      ${settingsSection('data', 'Data Management', 'shield', 'Backups, sharing and resets.', data)}
      <div class="tiny muted about">${APP_NAME} v${APP_VERSION} · ${navigator.onLine ? 'Online' : 'Offline'} · Data schema v${S.STORE_VERSION}</div>`;
  }

  // ---------------------------------------------------------------
  // Local profiles (UI). Storage lives in js/profiles.js.
  // ---------------------------------------------------------------
  const profileLabel = () => (profile && profile.name) || 'This';
  const avatar = (name, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(P.initials(name))}</span>`;
  const PRIVACY_TEXT = 'Your study progress and personal notes are stored locally in this browser. They are not automatically shared with other PrepWise users. Use Export Backup to transfer your progress to another device.';

  function profileSettings() {
    const others = registry ? registry.profiles.filter((p) => p.id !== profile.id).sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)) : [];
    const since = profile && profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `
      <div class="profile-current">
        ${avatar(profile && profile.name, 'lg')}
        <div class="pc-text"><strong id="profile-name-out">${esc((profile && profile.name) || 'Unnamed profile')}</strong>
          <span class="tiny muted">Local profile${since ? ` · created ${esc(since)}` : ''}${registry && registry.profiles.length > 1 ? ` · ${plural(registry.profiles.length, 'profile')} in this browser` : ''}</span></div>
      </div>
      <div class="form-grid">
        <label class="field"><span class="label">Display name</span><input class="input" id="profile-name" value="${esc(profile ? profile.name : '')}" data-bind="app:name" maxlength="${P.NAME_MAX}" autocomplete="given-name" placeholder="Your name">
          <span class="hint">Shown in the greeting. It stays in this browser.</span></label>
      </div>
      ${others.length ? `<div class="group-label">Other profiles in this browser</div>
      <div class="profile-list">${others.map((p) => `<div class="row-card profile-row">${avatar(p.name)}<div class="pr-text"><strong>${esc(p.name || 'Unnamed profile')}</strong><span class="tiny muted">Last used ${esc(new Date(p.lastUsedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }))}</span></div>
        <button class="btn btn-sm" data-action="profile-switch" data-id="${esc(p.id)}">${icon('switch')} Switch</button></div>`).join('')}</div>` : ''}
      <div class="btn-row" style="margin-top:14px">
        <button class="btn" data-action="profile-new">${icon('plus')} New profile</button>
        <button class="btn" data-action="export-all">${icon('download')} Export profile</button>
        <button class="btn" data-action="import-any">${icon('upload')} Import profile</button>
      </div>
      <div class="privacy-note">${icon('shield')}<div>
        <p><strong>${esc(PRIVACY_TEXT)}</strong></p>
        <p>Each browser and device keeps its own separate data, so friends who open PrepWise on their own devices never see yours. Profiles in the same browser are a convenience, not a lock: anyone using this browser profile can open every PrepWise profile in it. On iPhone and iPad, the Home Screen app keeps data separately from Safari.</p>
        <p>PrepWise has no accounts, analytics or tracking, and never sends your study data anywhere.</p>
      </div></div>
      <div class="group-label">Profile reset and removal</div>
      <div class="btn-row">
        <button class="btn btn-danger" data-action="reset-all">${icon('refresh')} Reset my profile</button>
        <button class="btn btn-ghost btn-danger-text" data-action="profile-delete">${icon('trash')} Delete this profile</button>
      </div>`;
  }

  // Name prompt for a new profile. Resolves to the cleaned name or null.
  function namePrompt({ title, intro, ok }) {
    const p = confirmDialog({ title, ok, html: `${intro ? `<p class="small muted">${esc(intro)}</p>` : ''}<label class="field"><span class="label">Name</span><input class="input" id="dlg-name" maxlength="${P.NAME_MAX}" autocomplete="off" placeholder="e.g. Alex"></label>` });
    // The dialog is in the DOM as soon as confirmDialog returns.
    const inp = document.getElementById('dlg-name');
    const btn = document.querySelector('#dialog-root [data-d="1"]');
    btn.disabled = true;
    inp.addEventListener('input', () => { btn.disabled = !P.cleanName(inp.value); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !btn.disabled) btn.click(); });
    setTimeout(() => inp.focus(), 30);
    return p.then((yes) => (yes && P.cleanName(inp.value) ? P.cleanName(inp.value) : null));
  }

  // Leave this page without writing anything else, then load the active profile.
  function reloadIntoProfile() {
    suspended = true;
    clearTimeout(saveTimer);
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  }

  function switchProfile(id) {
    if (!registry || !P.find(registry, id) || (profile && id === profile.id)) return;
    if (state && state.timer && state.timer.running) timerPause();
    save(true);
    P.setActive(localStorage, registry, id);
    reloadIntoProfile();
  }

  // Create a profile with the given data (backup import) or empty, and open it.
  function createProfile(name, data = null) {
    if (state && state.timer && state.timer.running) timerPause();
    save(true);
    const p = P.create(localStorage, registry, name, { activate: false });
    if (data) {
      try { P.writeData(localStorage, p, data.store, data.banks); } catch (e) {
        P.remove(localStorage, registry, p.id);
        toast('Not enough storage space to create the profile.', { icon: 'x' });
        return null;
      }
    }
    P.setActive(localStorage, registry, p.id);
    reloadIntoProfile();
    return p;
  }

  function restoreRow() {
    const missing = [...BUILTINS.keys()].filter((id) => !store.certs[id]);
    const snaps = listSnapshots();
    const hasV1 = (() => { try { return !!(K.v1Backup && localStorage.getItem(K.v1Backup)); } catch (e) { return false; } })();
    if (!missing.length && !snaps.length && !hasV1) return '';
    return `<div class="group-label">Restore</div><div class="btn-row">
      ${missing.map((id) => `<button class="btn" data-action="restore-builtin" data-id="${id}">${icon('refresh')} Restore built-in ${esc(BUILTINS.get(id).cert.code)}</button>`).join('')}
      ${snaps.length ? `<button class="btn" data-action="snapshots">${icon('clock')} Automatic snapshots (${snaps.length})</button>` : ''}
      ${hasV1 ? `<button class="btn btn-ghost" data-action="export-v1">${icon('download')} Download original v1 data</button>` : ''}
    </div>`;
  }

  const weeklyTargetMin = () => state.settings.dailyTargets.reduce((a, b, i) => a + (state.settings.studyDays[i] ? b : 0), 0);
  function startCallout() {
    const dow = (parseISO(state.settings.startDate).getDay() + 6) % 7;
    return dow !== 0 && state.settings.dailyTargets[5] > state.settings.dailyTargets[0] ? `<div class="callout">Your start date is a ${DAY_NAMES[dow]}. Day 6 and Day 7 have your longest sessions, so pick a Monday if you want them on the weekend.</div>` : '';
  }

  function updateSettingsDerived() {
    if (!state) return;
    const w = $('#weekly-target-out'); if (w) w.textContent = fmtMin(weeklyTargetMin());
    const t = $('#total-target-out'); if (t) t.textContent = fmtMin(state.sessions.reduce((a, s) => a + num(s.plannedMin), 0));
    const c = $('#start-callout'); if (c) c.innerHTML = startCallout();
    const eb = $('#topbar-eyebrow');
    if (eb && VIEWS[currentView].scope === 'cert') { const o = overall(); eb.textContent = o.phase === 'during' ? `Week ${o.currentWeek} of ${o.W} · Day ${o.dayNo} of ${o.totalDays}` : o.phase === 'before' ? `Starts ${fmtDate(o.start)}` : 'Target period ended'; }
  }

  async function setWeekCount(n) {
    n = clamp(Math.round(n), 1, S.MAX_WEEKS);
    const cur = weekCount();
    if (n === cur) return true;
    if (n > cur) {
      for (let i = cur + 1; i <= n; i++) state.weeks.push({ week: i, title: `Week ${i}`, objectives: [], revision: 'not-started', assessmentScore: null });
    } else {
      const lost = state.sessions.filter((s) => s.week > n);
      const logged = lost.some((s) => s.actualSec > 0 || s.status !== 'pending');
      if (lost.length) {
        const ok = await confirmDialog({ title: `Remove week${cur - n > 1 ? 's' : ''} ${n + 1}${cur - n > 1 ? `–${cur}` : ''}?`, body: `${plural(lost.length, 'session')}${logged ? ', including logged time and statuses,' : ''} in those weeks will be deleted.`, ok: 'Remove', danger: true });
        if (!ok) return false;
        snapshot(`Removed weeks ${n + 1}–${cur} from ${cert.code}`);
      }
      if (state.timer && lost.some((s) => s.id === state.timer.sessionId)) state.timer = null;
      state.sessions = state.sessions.filter((s) => s.week <= n);
      state.weeks = state.weeks.slice(0, n);
    }
    state.ui.planWeek = null;
    save(true);
    return true;
  }

  // ---------------------------------------------------------------
  // Data binding for inputs
  // ---------------------------------------------------------------
  async function applyBinding(el, committed) {
    const [scope, a, b] = el.dataset.bind.split(':');
    const v = el.type === 'checkbox' ? el.checked : el.value;
    if (scope === 'app') {
      const ap = store.settings;
      if (a === 'name') {
        const n = P.cleanName(v);
        if (!n) { if (committed) { el.value = ap.name; toast('Your profile needs a name.', { icon: 'info' }); } return; }
        ap.name = n;
        if (profile && registry) { profile.name = n; try { P.rename(localStorage, registry, profile.id, n); } catch (e) { /* ignore */ } }
        const out = $('#profile-name-out'); if (out) out.textContent = n;
        const av = $('#set-profile .avatar.lg'); if (av) av.textContent = P.initials(n);
        renderShell();
        save();
        if (committed) toast('Name saved', { ms: 1200 });
        return;
      }
      if (!committed) return;
      if (a === 'theme' && THEMES[v]) ap.theme = v;
      else if (a === 'landing') ap.landing = v;
      else if (a === 'locale' && LOCALES[v]) ap.locale = v;
      else if (a === 'defaultCert' && store.certs[v]) ap.defaultCert = v;
      else if (a === 'selector') ap.selector = v === 'default' ? 'default' : 'last';
      save();
      renderShell();
      if (a === 'locale') renderCurrent();
      toast('Setting saved', { ms: 1200 });
      return;
    }
    if (!state) return;
    if (scope === 'session') {
      const s = getSession(a);
      if (!s) return;
      if (b === 'topic' || b === 'lectureRef' || b === 'notes' || b === 'concepts' || b === 'exercises') {
        s[b] = b === 'topic' ? (v.trim() || (committed ? 'Untitled task' : v)) : v;
        if (b === 'topic') { const h = $('.sheet-title h2'); if (h) h.textContent = s[b]; }
      } else if (!committed) return;
      else if (b === 'plannedMin') {
        s.plannedMin = clamp(Math.round(num(v, s.plannedMin)), 0, 1440);
        s.customPlanned = true;
        el.value = s.plannedMin;
      } else if (b === 'actualMin') {
        const newSec = clamp(Math.round(num(v, s.actualSec / 60)), 0, 1440) * 60;
        const delta = newSec - s.actualSec;
        if (Math.abs(delta) >= 60 || newSec === 0) { s.actualSec = newSec; if (delta > 0) logActivity({ min: delta / 60 }); }
        el.value = Math.round(s.actualSec / 60);
      } else if (b === 'week' || b === 'day') {
        s[b] = Number(v);
        s.order = Math.max(0, ...state.sessions.filter((x) => x !== s && x.week === s.week && x.day === s.day).map((x) => x.order + 1));
        if (b === 'week') state.ui.planWeek = s.week;
        const ey = $('.sheet-title .eyebrow');
        if (ey) ey.textContent = `${cert.code} · Week ${s.week} · Day ${(s.week - 1) * 7 + s.day + 1} · ${fmtDate(sessionDate(s), { weekday: 'long', day: 'numeric', month: 'short' })}`;
      } else if (b === 'kind') s.kind = KINDS[v] ? v : 'study';
      save();
      if (committed) afterChange();
      return;
    }
    if (scope === 'settings') {
      const st = state.settings;
      if (a === 'programmeTitle') { st[a] = String(v).slice(0, 80); save(); return; }
      if (!committed) return;
      if (a === 'startDate') {
        if (isValidISO(v)) { st.startDate = v; if (st.targetDate && st.targetDate < v) st.targetDate = null; } else { el.value = st.startDate; return toast('Pick a valid date.', { icon: 'x' }); }
      } else if (a === 'targetDate') {
        if (!v) st.targetDate = null;
        else if (!isValidISO(v) || v < st.startDate) { el.value = st.targetDate || ''; return toast('The target date must be on or after the start date.', { icon: 'x' }); }
        else st.targetDate = v;
      } else if (a === 'weeks') {
        const ok = await setWeekCount(num(v, weekCount()));
        el.value = weekCount();
        if (ok) { renderCurrent(); toast(`Programme is now ${plural(weekCount(), 'week')}`, { ms: 1600 }); }
        return;
      } else if (a === 'courseUrl') {
        const u = v.trim();
        if (u && !/^https?:\/\//i.test(u)) { el.value = st.courseUrl; return toast('The course URL must start with https://', { icon: 'x' }); }
        st.courseUrl = u;
      } else if (a === 'masteryTarget') {
        st.masteryTarget = clamp(Math.round(num(v, 85)), 1, 100);
        el.value = st.masteryTarget;
      }
      save();
      updateSettingsDerived();
      checkAchievements();
      toast('Setting saved', { ms: 1200 });
      return;
    }
    if (scope === 'target') {
      if (!committed) return;
      const i = Number(a);
      state.settings.dailyTargets[i] = clamp(Math.round(num(v, state.settings.dailyTargets[i])), 0, 720);
      el.value = state.settings.dailyTargets[i];
      state.sessions.forEach((s) => { if (s.day === i && !s.customPlanned) s.plannedMin = state.settings.dailyTargets[i]; });
      save();
      updateSettingsDerived();
      return;
    }
    if (scope === 'studyday') {
      const i = Number(a);
      state.settings.studyDays[i] = !!v;
      el.closest('.target-row')?.classList.toggle('off', !v);
      save();
      updateSettingsDerived();
      return;
    }
    if (scope === 'week') {
      const wk = state.weeks[Number(a) - 1];
      if (!wk) return;
      if (b === 'title') { wk.title = String(v).slice(0, 80); save(); return; }
      if (b === 'assessmentScore') {
        if (!committed) return;
        wk.assessmentScore = v === '' ? null : clamp(Math.round(num(v)), 0, 100);
        el.value = wk.assessmentScore ?? '';
        save();
        afterChange();
      }
      return;
    }
    if (scope === 'course') {
      const u = state.course;
      if (a === 'lectureTitle' || a === 'section') u[a] = v;
      else if (!committed) return;
      else if (a === 'progress') { u.progress = clamp(Math.round(num(v, u.progress)), 0, 100); el.value = u.progress; }
      else if (a === 'resumeUrl') {
        const val = v.trim();
        if (val && !/^https?:\/\//i.test(val)) { el.value = u.resumeUrl; return toast('Links must start with https://', { icon: 'x' }); }
        u.resumeUrl = val;
      }
      u.updatedAt = new Date().toISOString();
      save();
      if (committed && a === 'progress') checkAchievements();
    }
  }

  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-bind]');
    if (el && el.type !== 'checkbox') applyBinding(el, false);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-bind]');
    if (el) applyBinding(el, true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target.closest('[data-enter]');
    if (el) { e.preventDefault(); actions[el.dataset.enter]?.(el); }
  });

  // ---------------------------------------------------------------
  // Actions (event delegation)
  // ---------------------------------------------------------------
  const refreshSheetSession = (id) => {
    const s = getSession(id);
    const seg = $(`[data-status-for="${id}"]`);
    if (seg && s) $$('button', seg).forEach((b) => b.classList.toggle('active', b.dataset.status === s.status));
    const act = $(`#actual-${id}`);
    if (act && s && document.activeElement !== act) act.value = Math.round(s.actualSec / 60);
  };

  function moreMenu() {
    const items = Object.entries(VIEWS).filter(([id, v]) => v.render && !BOTTOM_NAV.includes(id)).sort((a, b) => a[1].order - b[1].order);
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${APP_NAME}</div><h2>More</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <div class="menu-list">
        <button class="menu-item menu-profile" data-action="profile-menu">${avatar(profile && profile.name)}<span class="mp-text"><span>${esc((profile && profile.name) || 'Profile')}</span><span>${registry && registry.profiles.length > 1 ? 'Switch or manage profiles' : 'Your local profile'}</span></span>${icon('chevron', 'muted')}</button>
        ${items.map(([id, v]) => `<button class="menu-item ${currentView === id ? 'active' : ''}" data-nav="${id}">${icon(v.icon)}<span>${esc(v.label)}</span>${icon('chevron', 'muted')}</button>`).join('')}
      </div>`);
  }

  const actions = {
    'close-sheet': () => closeSheet(),
    'more-menu': () => moreMenu(),
    'cert-switcher': () => certSwitcherSheet(),
    'switch-cert': (el) => switchCert(el.dataset.id),
    'toggle-sidebar': () => { store.settings.sidebarCollapsed = !store.settings.sidebarCollapsed; save(); renderShell(); },
    'ack-migration': () => { store.migratedFrom.acknowledged = true; save(); renderCurrent(); },
    'scroll-to': (el) => document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    goto: (el) => {
      if (sheetOpen) closeSheet();
      navigate(el.dataset.view);
      if (el.dataset.anchor) setTimeout(() => document.getElementById(el.dataset.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    },
    'plan-week': (el) => { state.ui.planWeek = Number(el.dataset.week); save(); if (el.dataset.go) navigate('plan'); else renderCurrent(); },
    'open-session': (el) => openSessionSheet(el.dataset.id),
    'start-session': (el) => { openSessionSheet(el.dataset.id); if (!(state.timer && state.timer.sessionId === el.dataset.id)) timerStart(el.dataset.id); },
    'timer-start': (el) => {
      const id = el.dataset.id || (state.timer && state.timer.sessionId);
      if (!id) return;
      timerStart(id);
      refreshSheetSession(id);
      if (!sheetOpen) renderCurrent();
    },
    'timer-pause': () => { timerPause(); if (!sheetOpen) renderCurrent(); },
    'timer-stop': () => {
      const t = state.timer;
      if (!t) return;
      const id = t.sessionId;
      timerStop();
      refreshSheetSession(id);
      const s = getSession(id);
      if (s && s.status === 'pending' && s.actualSec >= s.plannedMin * 60 * 0.9 && s.plannedMin > 0) {
        toast('Planned time reached. Mark this session as completed?', { icon: 'check', action: 'Complete', onAction: () => { setStatus(s, 'completed'); refreshSheetSession(id); toast('Session completed'); } });
      }
    },
    'set-status': (el) => {
      const s = getSession(el.dataset.id);
      if (!s) return;
      setStatus(s, el.dataset.status);
      refreshSheetSession(s.id);
      if (el.dataset.status === 'completed') { if (navigator.vibrate) navigator.vibrate(12); toast('Session completed — nice work'); }
    },
    'add-lecture': (el) => {
      const s = getSession(el.dataset.id);
      const input = $(`#lec-input-${el.dataset.id}`);
      const title = input.value.trim();
      if (!s || !title) return input.focus();
      s.lectures.push({ id: uid(), title, done: false });
      input.value = '';
      $(`#lectures-${s.id}`).innerHTML = lectureItems(s);
      save(); input.focus();
    },
    'toggle-lecture': (el) => {
      const s = getSession(el.dataset.id);
      const l = s && s.lectures.find((x) => x.id === el.dataset.lec);
      if (!l) return;
      l.done = !l.done;
      $(`#lectures-${s.id}`).innerHTML = lectureItems(s);
      save();
    },
    'remove-lecture': (el) => {
      const s = getSession(el.dataset.id);
      if (!s) return;
      s.lectures = s.lectures.filter((x) => x.id !== el.dataset.lec);
      $(`#lectures-${s.id}`).innerHTML = lectureItems(s);
      save();
    },
    'add-session': (el) => {
      const week = Number(el.dataset.week);
      const s = newSession({ week, day: 0, topic: 'New study session', plannedMin: 30, customPlanned: true });
      s.order = Math.max(0, ...state.sessions.filter((x) => x.week === week && x.day === 0).map((x) => x.order + 1));
      state.sessions.push(s);
      save(); renderCurrent(); openSessionSheet(s.id);
      setTimeout(() => { const i = $(`[data-bind="session:${s.id}:topic"]`); if (i) { i.focus(); i.select(); } }, 350);
    },
    'fill-sessions': () => {
      let n = 0;
      state.weeks.forEach((w) => state.settings.studyDays.forEach((on, di) => {
        if (on && !state.sessions.some((s) => s.week === w.week && s.day === di)) { state.sessions.push(newSession({ week: w.week, day: di, topic: 'Study session', plannedMin: state.settings.dailyTargets[di] })); n++; }
      }));
      save(); renderCurrent();
      toast(n ? `Added ${plural(n, 'session')}` : 'Every study day already has a session', { icon: n ? 'plus' : 'check' });
    },
    'delete-session': async (el) => {
      const s = getSession(el.dataset.id);
      if (!s) return;
      const ok = await confirmDialog({ title: 'Delete this session?', body: `“${s.topic}” and its notes and logged time will be removed.`, ok: 'Delete', danger: true });
      if (!ok) return;
      if (state.timer && state.timer.sessionId === s.id) state.timer = null;
      state.sessions = state.sessions.filter((x) => x.id !== s.id);
      save(); closeSheet();
      toast('Session deleted', { icon: 'trash' });
    },
    'toggle-objective': (el) => {
      const wk = state.weeks[Number(el.dataset.week) - 1];
      const ob = wk && wk.objectives.find((x) => x.id === el.dataset.obj);
      if (!ob) return;
      ob.done = !ob.done;
      if (ob.done) logActivity({});
      save(); afterChange();
    },
    'add-objective': (el) => {
      const w = Number(el.dataset.week);
      const input = $(`#obj-input-${w}`);
      const text = input.value.trim();
      if (!text) return input.focus();
      state.weeks[w - 1].objectives.push({ id: uid(), text, done: false });
      save(); renderCurrent();
      setTimeout(() => $(`#obj-input-${w}`)?.focus(), 30);
    },
    'edit-objective': (el) => {
      const w = Number(el.dataset.week);
      const ob = state.weeks[w - 1].objectives.find((x) => x.id === el.dataset.obj);
      if (!ob) return;
      openSheet(`
        <div class="sheet-title"><div><div class="eyebrow">Week ${w}</div><h2>Edit objective</h2></div>
          <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
        <label class="field" style="margin-top:0"><span class="label">Objective</span><textarea class="textarea" id="obj-edit">${esc(ob.text)}</textarea></label>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn btn-danger" data-action="delete-objective" data-week="${w}" data-obj="${ob.id}">${icon('trash')} Delete</button>
          <button class="btn btn-primary" data-action="save-objective" data-week="${w}" data-obj="${ob.id}">Save</button>
        </div>`);
    },
    'save-objective': (el) => {
      const ob = state.weeks[Number(el.dataset.week) - 1].objectives.find((x) => x.id === el.dataset.obj);
      const text = $('#obj-edit').value.trim();
      if (ob && text) { ob.text = text; save(); }
      closeSheet();
    },
    'delete-objective': (el) => {
      const wk = state.weeks[Number(el.dataset.week) - 1];
      wk.objectives = wk.objectives.filter((x) => x.id !== el.dataset.obj);
      save(); closeSheet();
      toast('Objective removed', { icon: 'trash' });
    },
    'set-revision': (el) => { state.weeks[Number(el.dataset.week) - 1].revision = el.dataset.rev; save(); renderCurrent(); },
    'add-quiz': () => openQuizSheet(null),
    'edit-quiz': (el) => openQuizSheet(el.dataset.id),
    'delete-quiz': async (el) => {
      const ok = await confirmDialog({ title: 'Delete this result?', body: 'It will be removed from your history and chart.', ok: 'Delete', danger: true });
      if (!ok) return;
      state.quizzes = state.quizzes.filter((q) => q.id !== el.dataset.id);
      save(); closeSheet();
      toast('Result deleted', { icon: 'trash' });
    },
    install: async () => {
      if (!deferredInstall) return toast('Use your browser menu → Install app or Add to Home screen.', { icon: 'install' });
      deferredInstall.prompt();
      const choice = await deferredInstall.userChoice.catch(() => null);
      deferredInstall = null;
      if (choice && choice.outcome === 'accepted') toast('Installing…', { icon: 'install' });
      renderCurrent();
    },
    'dismiss-install': () => { store.settings.installDismissed = true; save(); renderCurrent(); },
    'reset-progress': async () => {
      const c = cert;
      const ok = await confirmDialog({ title: `Reset ${c.code} progress?`, body: `Logged time, statuses, notes, practice test results, Quiz Centre history, bookmarks, streaks and achievements for ${c.code} will be cleared. Its plan and questions stay, and other certifications aren't affected. A snapshot is kept on this device.`, ok: 'Reset progress', danger: true, requireText: c.code });
      if (!ok || store.activeCert !== c.id) return;
      snapshot(`Reset ${c.code} progress`);
      state.sessions.forEach((s) => Object.assign(s, { actualSec: 0, status: 'pending', notes: '', concepts: '', exercises: '', lectureRef: '', completedOn: null, lectures: s.lectures.map((l) => ({ ...l, done: false })) }));
      state.weeks.forEach((w) => { w.objectives.forEach((o) => { o.done = false; }); w.revision = 'not-started'; w.assessmentScore = null; });
      Object.assign(state, { quizzes: [], activity: {}, timer: null, achievements: {}, notes: [], bookmarks: { topics: [], resources: [], notes: [] }, lastStudied: null });
      state.course = { lectureTitle: '', section: '', progress: 0, resumeUrl: '', updatedAt: null };
      hooks.reset.forEach((fn) => fn(state, 'progress'));
      save(true); renderCurrent();
      toast(`${c.code} progress reset`, { icon: 'refresh' });
    },
    'profile-switch': (el) => switchProfile(el.dataset.id),
    'profile-new': async () => {
      if (!registry) return toast('Profiles need browser storage, which is unavailable here.', { icon: 'x' });
      const name = await namePrompt({ title: 'Create a new profile', intro: 'A new profile starts with no progress, notes or quiz history. Your current profile stays exactly as it is, and you can switch back at any time.', ok: 'Create profile' });
      if (name) createProfile(name);
    },
    'profile-delete': async () => {
      if (!registry) return;
      const others = registry.profiles.filter((p) => p.id !== profile.id);
      const ok = await confirmDialog({
        title: `Delete ${profile.name || 'this'} profile?`, ok: 'Delete profile', danger: true, requireText: 'DELETE',
        body: `All progress, notes, bookmarks, quiz history and settings in this profile are permanently removed from this browser. This can't be undone, so export a backup first if you might need it. ${others.length ? 'Other profiles are not affected.' : 'You can then create a new profile.'}`,
      });
      if (!ok) return;
      if (state && state.timer && state.timer.running) timerPause();
      suspended = true;
      clearTimeout(saveTimer);
      P.remove(localStorage, registry, profile.id);
      reloadIntoProfile();
    },
    'profile-menu': () => profileSheet(),
    'reset-all': async () => {
      const ok = await confirmDialog({ title: `Reset ${profile && profile.name ? `${profile.name}'s` : 'this'} profile?`, body: 'Every certification, question bank, note and all progress in this profile will be deleted, and the built-in certifications restored. Your name stays, and other profiles are not affected. A snapshot is kept, but export a backup first if unsure.', ok: 'Reset profile', danger: true, requireText: 'RESET' });
      if (!ok) return;
      snapshot('Reset profile');
      Object.keys(store.certs).forEach(removeBank);
      const keep = { name: store.settings.name, installDismissed: store.settings.installDismissed };
      store = freshStore();
      Object.assign(store.settings, keep);
      ensureBuiltins();
      Object.keys(store.certs).forEach((id) => { store.progress[id] = defaultProgress(store.certs[id]); });
      activate(firstCertId());
      hooks.reset.forEach((fn) => state && fn(state, 'all'));
      hooks.certChange.forEach((fn) => fn(cert, state));
      save(true);
      navigate('home');
      toast('Profile reset', { icon: 'refresh' });
    },
    'restore-builtin': (el) => {
      const id = el.dataset.id;
      if (store.certs[id]) return;
      installBuiltin(id);
      store.progress[id] = defaultProgress(store.certs[id]);
      save(true);
      toast(`${store.certs[id].code} restored`, { icon: 'refresh' });
      switchCert(id, { toast: false, view: 'home' });
    },
    'export-v1': () => {
      try { const raw = K.v1Backup && localStorage.getItem(K.v1Backup); if (raw) download(`study-tracker-v1-original-${todayISO()}.json`, { app: 'm365-study-tracker', exportedAt: new Date().toISOString(), data: JSON.parse(raw) }); } catch (e) { toast('Could not read the v1 backup.', { icon: 'x' }); }
    },
    snapshots: () => {
      const list = listSnapshots();
      openSheet(`<div class="sheet-title"><div><div class="eyebrow">Data management</div><h2>Automatic snapshots</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
        <p class="small muted" style="margin-top:0">A snapshot is taken before a reset, delete or overwrite. Restoring replaces the current data (a snapshot of it is taken first). Imported question banks aren't part of snapshots.</p>
        <div class="list-gap">${list.map((s, i) => `<div class="row-card"><div style="min-width:0"><strong>${esc(s.reason)}</strong><div class="tiny muted">${new Date(s.at).toLocaleString(locale())}</div></div><button class="btn btn-sm" data-action="restore-snapshot" data-i="${i}">Restore</button></div>`).join('')}</div>`);
    },
    'restore-snapshot': async (el) => {
      const s = listSnapshots()[Number(el.dataset.i)];
      if (!s) return;
      const ok = await confirmDialog({ title: 'Restore this snapshot?', body: `“${s.reason}” from ${new Date(s.at).toLocaleString(locale())}. Current data on this device will be replaced.`, ok: 'Restore', danger: true });
      if (!ok) return;
      const target = s.store;
      snapshot('Before restoring a snapshot');
      replaceStore(target);
      toast('Snapshot restored', { icon: 'refresh' });
    },
  };

  // Replace the whole store (backup import, snapshot restore).
  function replaceStore(raw, banks = null) {
    if (state && state.timer) timerPause();
    if (banks) {
      Object.keys(store.certs).forEach(removeBank);
      Object.entries(banks).forEach(([id, list]) => { try { localStorage.setItem(BANK_PREFIX + id, JSON.stringify(list)); } catch (e) { toast(`Could not store the ${id} question bank.`, { icon: 'x' }); } });
    }
    bankCache.clear();
    const keepName = store && store.settings ? store.settings.name : '';
    store = normaliseStore(raw);
    // Restoring data into this profile never renames it.
    if (profile && profile.name) store.settings.name = profile.name; else if (keepName) store.settings.name = keepName;
    ensureBuiltins();
    Object.keys(store.certs).forEach((id) => { store.progress[id] = normaliseProgress(store.progress[id], store.certs[id]); });
    activate(store.certs[store.activeCert] ? store.activeCert : firstCertId());
    hooks.load.forEach((fn) => fn(state));
    hooks.certChange.forEach((fn) => fn(cert, state));
    checkAchievements(true);
    save(true);
    if (sheetOpen) closeSheet();
    navigate('home');
    if (state && state.timer && state.timer.running) ensureTick();
  }

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav && !nav.closest('#quiz-player')) { if (sheetOpen) closeSheet(); navigate(nav.dataset.nav); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(true);
    else if (!sheetOpen) { renderCurrent(); if (state && state.timer && state.timer.running) ensureTick(); }
  });
  window.addEventListener('pagehide', () => save(true));
  window.addEventListener('hashchange', () => {
    let v = (location.hash || '').replace('#', '');
    v = VIEW_ALIASES[v] || v;
    if (VIEWS[v] && VIEWS[v].render && v !== currentView) { if (sheetOpen) closeSheet(); navigate(v); }
  });
  window.addEventListener('online', () => renderShell());
  window.addEventListener('offline', () => renderShell());
  // Data changed in another tab
  window.addEventListener('storage', (e) => {
    if (suspended || !profile) return;
    if (e.key === P.REG_KEY) {
      // Another tab switched, renamed or deleted profiles.
      const next = P.readRegistry(localStorage);
      if (!next || !P.find(next, profile.id)) { suspended = true; location.reload(); return; } // deleted: write nothing
      if (next.active !== profile.id) { save(true); suspended = true; location.reload(); return; }
      registry = next; profile = P.find(next, profile.id);
      if (profile.name && store.settings.name !== profile.name) { store.settings.name = profile.name; if (!sheetOpen) renderCurrent(); }
      return;
    }
    if (e.key === STORE_KEY && e.newValue) {
      try {
        store = normaliseStore(JSON.parse(e.newValue)); bankCache.clear(); ensureBuiltins();
        activate(store.certs[store.activeCert] ? store.activeCert : firstCertId());
        hooks.load.forEach((fn) => fn(state)); hooks.certChange.forEach((fn) => fn(cert, state));
        if (!sheetOpen) renderCurrent();
      } catch (err) { console.warn(err); }
    }
  });
  let lastDay = todayISO();
  setInterval(() => { if (todayISO() !== lastDay) { lastDay = todayISO(); if (!sheetOpen) renderCurrent(); } }, 60000);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (!sheetOpen && (currentView === 'home' || currentView === 'settings')) renderCurrent();
  });
  window.addEventListener('appinstalled', () => { deferredInstall = null; toast('Installed — find it on your home screen', { icon: 'install' }); renderCurrent(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then((reg) => {
        const prompt = (w) => toast('A new version is available.', { icon: 'refresh', action: 'Update', ms: 8000, onAction: () => w.postMessage('SKIP_WAITING') });
        if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w); });
        });
      }).catch((err) => console.warn('SW registration failed', err));
      // Reload only when an update replaces a previous worker. On a first visit the new
      // worker just takes control: reloading then would wipe the welcome screen mid-typing.
      const hadController = !!navigator.serviceWorker.controller;
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloading && !suspended) { reloading = true; save(true); location.reload(); } });
    });
  }

  // ---------------------------------------------------------------
  // Plugin API — feature modules (certs.js, quiz-centre.js, revision.js)
  // add views, home panels and behaviour without editing this file.
  // ---------------------------------------------------------------
  const API = {
    get state() { return state; },
    get store() { return store; },
    get cert() { return cert; },
    get currentView() { return currentView; },
    get STORE_KEY() { return STORE_KEY; },
    get BANK_PREFIX() { return BANK_PREFIX; },
    get profile() { return profile ? { ...profile } : null; },
    get profiles() { return registry ? registry.profiles.map((p) => ({ ...p })) : []; },
    createProfile, switchProfile,
    APP_NAME, APP_VERSION, BUILTINS, DAY_NAMES, KINDS,
    save, overall, renderCurrent, renderShell, navigate, toast, confirmDialog, celebrate, openSheet, closeSheet, download, pickFile,
    icon, esc, bar, ring, kpi, numField, emptyState, plural, fmtDate, fmtMin, fmtClock, fmtHours, relDay, todayISO, toISO, parseISO, addDays, daysBetween, clamp, num, uid, clone,
    logActivity, afterChange, checkAchievements, snapshot, replaceStore,
    getQuestions, setQuestions, removeBank, switchCert, listCerts, progressSummary, certRecord, defaultProgress, normaliseProgress, installBuiltin, migrateLegacy, freshStore, activate, firstCertId,
    weekNums, weekCount,
    isSheetOpen: () => sheetOpen,
    registerView(id, def) { VIEWS[id] = { scope: 'cert', order: 50, ...(VIEWS[id] || {}), ...def }; },
    registerAction(name, fn) { actions[name] = fn; },
    addAchievement(a) { if (!PLUGIN_ACHIEVEMENTS.some((x) => x.id === a.id)) PLUGIN_ACHIEVEMENTS.push(a); },
    hooks, ext, ICONS,
  };
  window.PrepWise = API;
  window.StudyApp = API; // v1 name, kept for compatibility

  // ---------------------------------------------------------------
  // Profile selection and first-run onboarding
  // ---------------------------------------------------------------
  function useProfile(p) {
    profile = p;
    K = P.keys(p);
    STORE_KEY = K.store; BANK_PREFIX = K.bankPrefix; SNAP_KEY = K.snaps;
  }

  // Full-screen welcome. Asks for the name only; everything else has sensible defaults.
  function onboarding({ welcomeBack = false } = {}) {
    return new Promise((resolve) => {
      const root = document.createElement('div');
      root.className = 'onboard-root';
      root.id = 'onboard-root';
      root.innerHTML = `<form class="onboard" novalidate aria-labelledby="ob-title">
        <span class="logo ob-logo" aria-hidden="true">${$('.sb-brand .logo') ? $('.sb-brand .logo').innerHTML.replace(/id="lg"/g, 'id="ob-lg"').replace(/url\(#lg\)/g, 'url(#ob-lg)') : ''}</span>
        <h1 id="ob-title">${welcomeBack ? 'Welcome back to PrepWise' : 'Welcome to PrepWise'}</h1>
        <p class="ob-sub">${welcomeBack ? 'PrepWise now supports separate profiles, so friends can share a device without sharing progress. Your study data is safe and unchanged.' : 'Plan your study, practise with exam-style questions and track your readiness for Microsoft certifications.'}</p>
        <label class="field"><span class="label">What should we call you?</span>
          <input class="input" id="ob-name" name="name" maxlength="${P.NAME_MAX}" autocomplete="given-name" placeholder="Your first name" required></label>
        <button class="btn btn-primary btn-block" id="ob-go" type="submit" disabled>${welcomeBack ? 'Continue' : 'Start studying'}</button>
        <p class="ob-privacy">${icon('shield')}<span>${esc(PRIVACY_TEXT)}</span></p>
      </form>`;
      document.body.appendChild(root);
      document.body.classList.add('onboarding');
      const inp = $('#ob-name', root), go = $('#ob-go', root);
      inp.addEventListener('input', () => { go.disabled = !P.cleanName(inp.value); });
      $('form', root).addEventListener('submit', (e) => {
        e.preventDefault();
        const n = P.cleanName(inp.value);
        if (!n) return;
        root.remove();
        document.body.classList.remove('onboarding');
        resolve(n);
      });
      setTimeout(() => inp.focus(), 50);
    });
  }

  async function selectProfile() {
    let res;
    try { res = P.init(localStorage); } catch (e) {
      // Storage blocked (some private modes): run with a temporary profile that isn't saved.
      storageOk = false;
      useProfile({ id: 'ptemporary0', name: '', ns: 'p', createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() });
      profile.name = await onboarding();
      return { fresh: true };
    }
    registry = res.reg;
    let p = P.active(registry);
    if (!p) {
      const name = await onboarding();
      p = P.create(localStorage, registry, name);
      useProfile(p);
      return { fresh: true };
    }
    P.setActive(localStorage, registry, p.id);
    useProfile(p);
    if (!p.name) {
      // Upgraded data without a name (or a rebuilt registry): ask once, keep everything.
      let stored = '';
      try { const s = JSON.parse(localStorage.getItem(K.store) || 'null'); stored = s && s.settings ? P.cleanName(s.settings.name) : ''; } catch (e) { /* ignore */ }
      const name = stored || await onboarding({ welcomeBack: p.ns === 'legacy' });
      P.rename(localStorage, registry, p.id, name);
    }
    return { fresh: false, migrated: res.migrated };
  }

  function profileSheet() {
    const others = registry ? registry.profiles.filter((p) => p.id !== profile.id).sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)) : [];
    openSheet(`<div class="sheet-title"><div><div class="eyebrow">Local profile</div><h2>${esc(profile.name || 'Profile')}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <div class="menu-list">
        ${others.map((p) => `<button class="menu-item" data-action="profile-switch" data-id="${esc(p.id)}">${avatar(p.name)}<span>Switch to ${esc(p.name || 'Unnamed profile')}</span>${icon('chevron', 'muted')}</button>`).join('')}
        <button class="menu-item" data-action="profile-new">${icon('plus')}<span>New profile</span>${icon('chevron', 'muted')}</button>
        <button class="menu-item" data-action="goto" data-view="settings" data-anchor="set-profile">${icon('settings')}<span>Manage profile</span>${icon('chevron', 'muted')}</button>
      </div>
      <p class="tiny muted" style="margin:14px 2px 0">${esc(PRIVACY_TEXT)}</p>`);
  }

  async function boot() {
    const sel = await selectProfile();
    if (sel.migrated) setTimeout(() => toast(`Your existing progress is now ${profile.name ? `${profile.name}'s` : 'your'} profile. Nothing was changed.`, { icon: 'shield', ms: 6000 }), 700);
    load();
    buildNav();
    hooks.load.forEach((fn) => fn(state));
    hooks.certChange.forEach((fn) => { try { fn(cert, state); } catch (e) { console.error(e); } });
    checkAchievements(true);
    save(true);
    let initial = (location.hash || '').replace('#', '');
    initial = VIEW_ALIASES[initial] || initial;
    navigate(VIEWS[initial] && VIEWS[initial].render ? initial : (store.settings.landing || 'home'), { scroll: false });
    if (state && state.timer && state.timer.running) ensureTick();
    hooks.ready.forEach((fn) => fn(state));
    document.documentElement.dataset.ready = '1'; // app booted (used by tests)
    if (migratedNow) setTimeout(() => toast('Your AB-650 data was upgraded to PrepWise. A backup of the original is kept on this device.', { icon: 'shield', ms: 6000 }), 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  window.__studyTracker = { get state() { return state; }, get store() { return store; }, overall, save, render: renderCurrent };
})();
