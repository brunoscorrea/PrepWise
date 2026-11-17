/* =========================================================
   M365 Study Tracker — app.js
   Vanilla JS, no dependencies. All data lives in localStorage.
   ========================================================= */
'use strict';

(() => {
  // ---------------------------------------------------------------
  // Constants & default programme
  // ---------------------------------------------------------------
  const STORAGE_KEY = 'm365-study-tracker:v1';
  const APP_VERSION = '1.1.0';
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DEFAULT_TARGETS = [60, 60, 60, 60, 60, 180, 150]; // minutes, Mon..Sun
  const DEFAULT_COURSE_URL = 'https://www.udemy.com/course/ms100course/learn/lecture/57913107#content';
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

  // Study topics (not verified Udemy lecture titles — all editable).
  const PLAN = [
    {
      title: 'Microsoft 365 foundations and identity',
      topics: [
        'Microsoft 365 fundamentals and cloud architecture',
        'Tenant management and configuration',
        'Users, groups and licensing',
        'Microsoft Entra ID and administrative roles',
        'Identity synchronisation',
        'Complete relevant lectures and practical simulations',
        'Hands-on exercises and revision quiz',
      ],
      sundayKind: 'revision',
      objectives: [
        'Explain the Microsoft 365 service model and cloud architecture',
        'Configure core tenant settings and custom domains',
        'Manage users, groups and licence assignment',
        'Describe Entra ID admin roles and apply least privilege',
        'Compare identity synchronisation options',
      ],
    },
    {
      title: 'Security and authentication',
      topics: [
        'Authentication methods and MFA',
        'Conditional Access',
        'Enterprise applications and application access',
        'External identities and guest access',
        'Microsoft 365 security administration',
        'Complete security lectures and practical simulations',
        'Practical scenarios and a 20-question assessment',
      ],
      sundayKind: 'assessment',
      objectives: [
        'Configure authentication methods and MFA',
        'Design and test Conditional Access policies',
        'Manage enterprise applications and app access',
        'Configure external identities and guest access',
        'Navigate Microsoft 365 security administration',
        'Score 85%+ on the 20-question self-assessment',
      ],
    },
    {
      title: 'Workloads, governance and compliance',
      topics: [
        'Exchange Online',
        'SharePoint and OneDrive',
        'Microsoft 365 workloads',
        'Microsoft Purview and compliance',
        'Data Loss Prevention and information protection',
        'Complete relevant lectures and practical simulations',
        'Revision and practical assessment',
      ],
      sundayKind: 'assessment',
      objectives: [
        'Administer core Exchange Online settings',
        'Manage SharePoint and OneDrive sharing and storage',
        'Understand how the wider Microsoft 365 workloads fit together',
        'Navigate Microsoft Purview compliance solutions',
        'Configure DLP and sensitivity labels',
      ],
    },
    {
      title: 'Copilot, AI agents and final revision',
      topics: [
        'Microsoft 365 Copilot architecture',
        'Copilot security and governance',
        'Microsoft Entra Agent ID',
        'Agent 365 and agent governance',
        'AI services administration',
        'Complete remaining lectures and practical simulations',
        'Final mock exam and identify knowledge gaps',
      ],
      sundayKind: 'assessment',
      objectives: [
        'Explain Microsoft 365 Copilot architecture and data flow',
        'Apply Copilot security and governance controls',
        'Describe Microsoft Entra Agent ID',
        'Understand Agent 365 and agent governance',
        'Administer AI services settings',
        'Complete a final mock exam and list knowledge gaps',
      ],
    },
  ];

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

  function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
    return parseISO(iso).toLocaleDateString('en-AU', opts);
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
  // Icons (inline SVG)
  // ---------------------------------------------------------------
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7.5" height="9" rx="2"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="2"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2"/><rect x="3" y="15" width="7.5" height="6" rx="2"/>',
    plan: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/>',
    progress: '<path d="M4 20V12M10 20V5M16 20v-6M3 21h18"/><path d="M16 9l4-4"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    play: '<path d="M7.5 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9 3.94a1 1 0 0 0-1.5.86z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
    stop: '<rect x="5.5" y="5.5" width="13" height="13" rx="2.5" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    flame: '<path d="M12 3c1 3.6 5.2 5.6 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.3 1.2-3.8 2.5-4.8.3 1.7 1.1 2.7 2.2 2.7 0-2.9-.5-5.3.5-8.1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    book: '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 0 2 2h12v-4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5v4h-5z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    install: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7.5v7M9.2 11.8L12 14.6l2.8-2.8"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  function defaultStartDate() {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun, 1=Mon
    const offset = dow === 1 ? 0 : (8 - dow) % 7;
    return toISO(addDays(now, offset));
  }

  function newSession(p = {}) {
    return {
      id: uid(), week: 1, day: 0, order: 0, topic: 'New study task', kind: 'study',
      plannedMin: 60, customPlanned: false, actualSec: 0, status: 'pending',
      lectureRef: '', notes: '', concepts: '', exercises: '', lectures: [], completedOn: null,
      ...p,
    };
  }

  function buildSessions(targets) {
    const out = [];
    PLAN.forEach((w, wi) => w.topics.forEach((topic, di) => {
      out.push(newSession({
        week: wi + 1, day: di, topic, plannedMin: targets[di],
        kind: di < 5 ? 'study' : di === 5 ? 'practical' : w.sundayKind,
      }));
    }));
    return out;
  }

  function buildWeeks() {
    return PLAN.map((w, i) => ({
      week: i + 1, title: w.title,
      objectives: w.objectives.map((text) => ({ id: uid(), text, done: false })),
      revision: 'not-started', assessmentScore: null,
    }));
  }

  function defaultState() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      settings: {
        name: 'Bruno',
        programmeTitle: 'Microsoft 365 & AI Services',
        startDate: defaultStartDate(),
        courseUrl: DEFAULT_COURSE_URL,
        dailyTargets: [...DEFAULT_TARGETS],
        masteryTarget: 85,
      },
      weeks: buildWeeks(),
      sessions: buildSessions(DEFAULT_TARGETS),
      quizzes: [],
      udemy: { lectureTitle: '', section: '', progress: 0, resumeUrl: '', updatedAt: null },
      activity: {}, // { 'YYYY-MM-DD': { min: number, done: number } }
      timer: null, // { sessionId, running, startedAt, accMs }
      achievements: {}, // { id: 'YYYY-MM-DD' }
      ui: { installDismissed: false, planWeek: null },
    };
  }

  // Merge a loaded/imported object onto defaults so missing keys never break the app.
  function normalise(raw) {
    const d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    const s = { ...d, ...raw };
    s.settings = { ...d.settings, ...(raw.settings || {}) };
    if (!Array.isArray(s.settings.dailyTargets) || s.settings.dailyTargets.length !== 7) s.settings.dailyTargets = [...DEFAULT_TARGETS];
    s.settings.dailyTargets = s.settings.dailyTargets.map((v, i) => clamp(num(v, DEFAULT_TARGETS[i]), 0, 720));
    if (!isValidISO(s.settings.startDate)) s.settings.startDate = d.settings.startDate;
    s.settings.masteryTarget = clamp(num(s.settings.masteryTarget, 85), 1, 100);
    s.weeks = Array.isArray(raw.weeks) && raw.weeks.length === 4
      ? raw.weeks.map((w, i) => ({ ...d.weeks[i], ...w, week: i + 1, objectives: Array.isArray(w.objectives) ? w.objectives.map((o) => ({ id: o.id || uid(), text: String(o.text || ''), done: !!o.done })) : d.weeks[i].objectives }))
      : d.weeks;
    s.sessions = Array.isArray(raw.sessions)
      ? raw.sessions.map((x) => {
        const n = newSession({ ...x });
        n.week = clamp(Math.round(num(n.week, 1)), 1, 4);
        n.day = clamp(Math.round(num(n.day, 0)), 0, 6);
        n.plannedMin = clamp(num(n.plannedMin, 60), 0, 1440);
        n.actualSec = Math.max(0, Math.round(num(n.actualSec, 0)));
        if (!STATUS[n.status]) n.status = 'pending';
        if (!KINDS[n.kind]) n.kind = 'study';
        n.lectures = Array.isArray(n.lectures) ? n.lectures.map((l) => ({ id: l.id || uid(), title: String(l.title || ''), done: !!l.done })) : [];
        return n;
      })
      : d.sessions;
    s.quizzes = Array.isArray(raw.quizzes) ? raw.quizzes.filter((q) => q && q.id) : [];
    s.udemy = { ...d.udemy, ...(raw.udemy || {}) };
    s.activity = raw.activity && typeof raw.activity === 'object' ? raw.activity : {};
    s.achievements = raw.achievements && typeof raw.achievements === 'object' ? raw.achievements : {};
    s.ui = { ...d.ui, ...(raw.ui || {}) };
    if (s.timer && !s.sessions.some((x) => x.id === s.timer.sessionId)) s.timer = null;
    return s;
  }

  let state;
  let storageOk = true;
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? normalise(JSON.parse(raw)) : defaultState();
    } catch (e) {
      console.warn('Could not load saved data', e);
      state = defaultState();
    }
  }

  let saveTimer = null;
  function save(immediate = false) {
    clearTimeout(saveTimer);
    const write = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        storageOk = true;
      } catch (e) {
        storageOk = false;
        toast('Could not save — storage is full or blocked.', { icon: 'x' });
      }
    };
    if (immediate) write(); else saveTimer = setTimeout(write, 120);
  }
  // Ask the browser not to evict our storage (supported on Android Chrome).
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------
  const getSession = (id) => state.sessions.find((s) => s.id === id);
  const sessionDate = (s) => toISO(addDays(parseISO(state.settings.startDate), (s.week - 1) * 7 + s.day));
  const sessionFraction = (s) => (s.status === 'completed' ? 1 : s.status === 'partial' ? 0.5 : 0);
  const sortSessions = (list) => [...list].sort((a, b) => a.week - b.week || a.day - b.day || a.order - b.order);
  const deadlineISO = () => toISO(addDays(parseISO(state.settings.startDate), 27));

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
    if (!has.has(toISO(d))) {
      d = addDays(d, -1);
      if (!has.has(toISO(d))) return 0;
    }
    let n = 0;
    while (has.has(toISO(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  function longestStreak() {
    const days = activityDays();
    let best = 0, run = 0, prev = null;
    days.forEach((k) => {
      run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    });
    return best;
  }

  function overall() {
    const ss = state.sessions;
    const today = todayISO();
    const start = state.settings.startDate;
    const dayNo = daysBetween(start, today) + 1;
    const phase = dayNo < 1 ? 'before' : dayNo > 28 ? 'after' : 'during';
    const weeks = [1, 2, 3, 4].map(weekStats);
    const items = weeks.reduce((a, w) => a + w.items, 0);
    const score = weeks.reduce((a, w) => a + w.score, 0);
    const pending = sortSessions(ss.filter((s) => s.status === 'pending'));
    return {
      today, start, dayNo, phase, weeks,
      deadline: deadlineISO(),
      currentWeek: phase === 'before' ? 1 : phase === 'after' ? 4 : Math.ceil(dayNo / 7),
      pct: items ? (score / items) * 100 : 0,
      expected: phase === 'before' ? 0 : phase === 'after' ? 100 : ((dayNo - 1) / 28) * 100,
      plannedMin: ss.reduce((a, s) => a + num(s.plannedMin), 0),
      actualSec: ss.reduce((a, s) => a + num(s.actualSec), 0),
      completed: ss.filter((s) => s.status === 'completed').length,
      partial: ss.filter((s) => s.status === 'partial').length,
      skipped: ss.filter((s) => s.status === 'skipped').length,
      total: ss.length,
      daysRemaining: phase === 'before' ? 28 : phase === 'after' ? 0 : daysBetween(today, deadlineISO()) + 1,
      startsIn: phase === 'before' ? 1 - dayNo : 0,
      streak: currentStreak(),
      next: pending[0] || null,
    };
  }

  function motivation(o) {
    if (o.phase === 'before') return `Your programme starts ${o.startsIn === 1 ? 'tomorrow' : `in ${o.startsIn} days`}. Skim Week 1 and get your lab tenant ready.`;
    if (o.pct >= 99.5) return 'Programme complete. Review your knowledge gaps and book the exam while it is fresh.';
    if (o.phase === 'after') return 'The 28-day target has passed. Finish the remaining sessions at a steady pace — consistency beats speed.';
    if (o.pct === 0) return 'Day one. One focused hour is all today asks of you.';
    if (o.expected - o.pct > 15) return 'You are a little behind plan. A solid weekend session will close the gap.';
    if (o.pct < 25) return 'Good start. Strong identity foundations make Conditional Access and Purview much easier later.';
    if (o.pct < 50) return 'Building momentum. Keep the daily hour protected.';
    if (o.pct < 75) return 'Past halfway. Keep connecting concepts through hands-on labs.';
    if (o.pct < 90) return 'Final stretch. Prioritise the weak areas from your quiz results.';
    return 'Almost there. Run the mock exam and close the last gaps.';
  }

  // ---------------------------------------------------------------
  // Activity, status & timer
  // ---------------------------------------------------------------
  function logActivity({ min = 0, done = 0 } = {}) {
    const k = todayISO();
    const a = state.activity[k] || { min: 0, done: 0 };
    a.min = Math.round((num(a.min) + min) * 10) / 10;
    a.done = num(a.done) + done;
    state.activity[k] = a;
  }

  function setStatus(s, status) {
    if (!STATUS[status] || s.status === status) return;
    const wasDone = s.status === 'completed' || s.status === 'partial';
    s.status = status;
    if (status === 'completed' || status === 'partial') {
      s.completedOn = todayISO();
      if (!wasDone) logActivity({ done: 1 });
    } else {
      s.completedOn = null;
    }
    save();
    afterChange();
  }

  const timerElapsed = () => {
    const t = state.timer;
    if (!t) return 0;
    return t.accMs + (t.running ? Math.max(0, Date.now() - t.startedAt) : 0);
  };

  function timerStart(id) {
    if (state.timer && state.timer.sessionId !== id) timerStop();
    if (!state.timer) state.timer = { sessionId: id, running: true, startedAt: Date.now(), accMs: 0 };
    else if (!state.timer.running) { state.timer.running = true; state.timer.startedAt = Date.now(); }
    save(true);
    ensureTick();
    updateTimerUI();
  }

  function timerPause() {
    const t = state.timer;
    if (!t || !t.running) return;
    t.accMs += Math.max(0, Date.now() - t.startedAt);
    t.running = false;
    t.startedAt = null;
    save(true);
    updateTimerUI();
  }

  function timerStop() {
    const t = state.timer;
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
    save(true);
    updateTimerUI();
    afterChange();
    return sec;
  }

  let tickHandle = null;
  function ensureTick() {
    if (tickHandle) return;
    tickHandle = setInterval(() => {
      if (!state.timer || !state.timer.running) { clearInterval(tickHandle); tickHandle = null; }
      updateTimerUI(true);
    }, 1000);
  }

  function updateTimerUI(tickOnly = false) {
    const t = state.timer;
    const elapsed = timerElapsed();
    // Displays inside an open session sheet
    $$('[data-timer-for]').forEach((box) => {
      const id = box.dataset.timerFor;
      const mine = t && t.sessionId === id;
      const disp = $('.timer-display', box);
      const status = $('.timer-status', box);
      if (disp) disp.textContent = fmtClock(mine ? elapsed : 0);
      box.classList.toggle('running', !!(mine && t.running));
      if (tickOnly) return;
      const other = t && !mine ? getSession(t.sessionId) : null;
      if (status) {
        status.textContent = mine
          ? (t.running ? 'Timer running' : 'Paused')
          : other ? `Timer active on “${other.topic}” — starting here will log that time first` : 'Ready';
      }
      const bStart = $('[data-action="timer-start"]', box);
      const bPause = $('[data-action="timer-pause"]', box);
      const bStop = $('[data-action="timer-stop"]', box);
      if (bStart) { bStart.disabled = !!(mine && t.running); bStart.innerHTML = `${icon('play')}${mine && !t.running ? 'Resume' : 'Start'}`; }
      if (bPause) bPause.disabled = !(mine && t.running);
      if (bStop) bStop.disabled = !mine;
    });
    // Mini timer bar
    const mini = $('#mini-timer');
    const sheetShowsIt = t && $(`[data-timer-for="${t.sessionId}"]`);
    if (!t || sheetShowsIt) {
      mini.hidden = true;
    } else {
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
      } else {
        const tm = $('.mt-time', mini);
        if (tm) tm.textContent = fmtClock(elapsed);
      }
      mini.classList.toggle('running', t.running);
      mini.hidden = false;
    }
    document.title = t && t.running ? `${fmtClock(elapsed)} · Studying` : 'Study Tracker · Microsoft 365';
  }

  // ---------------------------------------------------------------
  // Achievements & celebrations
  // ---------------------------------------------------------------
  const ACHIEVEMENTS = [
    { id: 'first-session', t: 'First session', d: 'Complete your first session', icon: 'check', test: (o) => o.completed + o.partial >= 1 },
    { id: 'streak-3', t: '3-day streak', d: 'Study three days in a row', icon: 'flame', test: () => longestStreak() >= 3 },
    { id: 'streak-7', t: '7-day streak', d: 'A full week without a gap', icon: 'flame', test: () => longestStreak() >= 7 },
    { id: 'week-1', t: 'Week 1 complete', d: 'Foundations and identity', icon: 'trophy', test: (o) => o.weeks[0].allSessionsDone },
    { id: 'week-2', t: 'Week 2 complete', d: 'Security and authentication', icon: 'trophy', test: (o) => o.weeks[1].allSessionsDone },
    { id: 'week-3', t: 'Week 3 complete', d: 'Workloads and compliance', icon: 'trophy', test: (o) => o.weeks[2].allSessionsDone },
    { id: 'week-4', t: 'Week 4 complete', d: 'Copilot and AI agents', icon: 'trophy', test: (o) => o.weeks[3].allSessionsDone },
    { id: 'hours-10', t: '10 hours logged', d: 'Roughly one week of effort', icon: 'clock', test: (o) => o.actualSec >= 36000 },
    { id: 'hours-half', t: 'Halfway in hours', d: 'Half your planned hours', icon: 'clock', test: (o) => o.plannedMin > 0 && o.actualSec >= (o.plannedMin * 60) / 2 },
    { id: 'hours-all', t: 'Hours target met', d: 'All planned hours logged', icon: 'clock', test: (o) => o.plannedMin > 0 && o.actualSec >= o.plannedMin * 60 },
    { id: 'mastery', t: 'Mastery score', d: 'A quiz at or above target', icon: 'target', test: () => state.quizzes.some((q) => quizPct(q) >= state.settings.masteryTarget) },
    { id: 'udemy-50', t: 'Course halfway', d: 'Udemy progress at 50%', icon: 'book', test: () => num(state.udemy.progress) >= 50 },
    { id: 'udemy-100', t: 'Course finished', d: 'Udemy progress at 100%', icon: 'book', test: () => num(state.udemy.progress) >= 100 },
    { id: 'programme', t: 'Programme complete', d: 'Every session completed', icon: 'star', test: (o) => o.total > 0 && o.completed === o.total },
  ];

  function checkAchievements(silent = false) {
    const o = overall();
    const fresh = [];
    ACHIEVEMENTS.forEach((a) => {
      if (!state.achievements[a.id] && a.test(o)) {
        state.achievements[a.id] = todayISO();
        fresh.push(a);
      }
    });
    if (!fresh.length) return;
    save();
    if (silent) return;
    const big = fresh.find((a) => a.id === 'programme') || fresh.find((a) => a.id.startsWith('week-'));
    if (big) {
      const w = big.id.startsWith('week-') ? o.weeks[Number(big.id.slice(5)) - 1] : null;
      celebrate(big.t, big.id === 'programme'
        ? `All ${o.total} sessions done and ${fmtHours(o.actualSec)}h logged. Outstanding consistency.`
        : `${fmtHours(w.actualSec)}h logged this week. ${big.id === 'week-4' ? 'Time for final review.' : 'On to the next one.'}`);
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
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b9bff"/><stop offset="1" stop-color="#7c6cff"/></linearGradient></defs>
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>
    </svg>`;
  }
  const bar = (pct, cls = '') => `<div class="bar ${cls}"><span style="width:${clamp(pct, 0, 100).toFixed(1)}%"></span></div>`;

  function statusDot(s) {
    const inner = s.status === 'completed' ? icon('check') : s.status === 'skipped' ? icon('x') : '';
    return `<span class="status-dot ${s.status}" aria-label="${STATUS[s.status].label}">${inner}</span>`;
  }

  function toast(msg, { icon: ic = 'check', action, onAction, cls = '', ms = 3200 } = {}) {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = `toast ${cls}`;
    el.innerHTML = `${icon(ic)}<span class="t-msg">${esc(msg)}</span>${action ? `<button class="t-act">${esc(action)}</button>` : ''}`;
    root.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    if (action) $('.t-act', el).addEventListener('click', () => { onAction && onAction(); kill(); });
    setTimeout(kill, action ? ms + 3000 : ms);
    while (root.children.length > 3) root.firstChild.remove();
  }

  function confirmDialog({ title, body, ok = 'Confirm', danger = false, cancel = 'Cancel' }) {
    return new Promise((resolve) => {
      const root = $('#dialog-root');
      root.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true">
        <h3>${esc(title)}</h3><p>${esc(body)}</p>
        <div class="btn-row">
          <button class="btn btn-ghost" data-d="0">${esc(cancel)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-d="1">${esc(ok)}</button>
        </div></div>`;
      root.hidden = false;
      const done = (v) => { root.hidden = true; root.innerHTML = ''; root.onclick = null; resolve(v); };
      root.onclick = (e) => {
        const b = e.target.closest('[data-d]');
        if (b) done(b.dataset.d === '1');
        else if (e.target === root) done(false);
      };
      $('[data-d="1"]', root).focus();
    });
  }

  function celebrate(title, sub) {
    const root = $('#celebrate-root');
    root.innerHTML = `<div class="celebrate">
      <svg class="burst" viewBox="0 0 86 86" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="43" cy="43" r="37" stroke="#2fd1b5" stroke-width="5"/>
        <path d="M27 44l11 11 22-24" stroke="#2fd1b5" stroke-width="6"/>
      </svg>
      <h3>${esc(title)}</h3><p>${esc(sub)}</p>
      <button class="btn btn-primary btn-block" data-close>Continue</button></div>`;
    root.hidden = false;
    root.classList.remove('out');
    const close = () => { root.classList.add('out'); setTimeout(() => { root.hidden = true; root.innerHTML = ''; }, 280); };
    root.onclick = (e) => { if (e.target === root || e.target.closest('[data-close]')) close(); };
    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
  }

  // ---------------------------------------------------------------
  // Sheet (bottom modal) with Android back-button support
  // ---------------------------------------------------------------
  let sheetOpen = false;
  let sheetHasHistory = false;
  let dirtyBehindSheet = false;
  let sheetOnClose = null;

  function openSheet(html, { onClose } = {}) {
    const root = $('#sheet-root');
    $('#sheet-body').innerHTML = html;
    $('#sheet-body').scrollTop = 0;
    root.classList.remove('closing');
    root.hidden = false;
    document.body.classList.add('sheet-open');
    sheetOnClose = onClose || null;
    if (!sheetOpen && !sheetHasHistory) {
      history.pushState({ sheet: true }, '');
      sheetHasHistory = true;
    }
    sheetOpen = true;
    updateTimerUI();
  }

  function closeSheet(fromPop = false) {
    if (!sheetOpen) return;
    sheetOpen = false;
    const root = $('#sheet-root');
    root.classList.add('closing');
    // Commit any focused field before closing
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setTimeout(() => {
      if (sheetOpen) return;
      root.hidden = true;
      root.classList.remove('closing');
      $('#sheet-body').innerHTML = '';
      document.body.classList.remove('sheet-open');
      updateTimerUI();
    }, 210);
    if (sheetHasHistory && !fromPop) { sheetHasHistory = false; history.back(); } else sheetHasHistory = false;
    const cb = sheetOnClose; sheetOnClose = null;
    if (cb) cb();
    dirtyBehindSheet = false;
    renderCurrent();
  }

  window.addEventListener('popstate', () => {
    if (!$('#dialog-root').hidden) { $('#dialog-root [data-d="0"]')?.click(); }
    if (sheetOpen) closeSheet(true);
  });

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  const VIEWS = {
    dashboard: { label: 'Dashboard', icon: 'dashboard', render: renderDashboard },
    plan: { label: 'Study Plan', icon: 'plan', render: renderPlan },
    progress: { label: 'Progress', icon: 'progress', render: renderProgress },
    settings: { label: 'Settings', icon: 'settings', render: renderSettings },
  };
  // Extension points used by plugins (see StudyApp at the bottom of this file)
  const hooks = { dashboard: [], reset: [], load: [], ready: [] };
  let currentView = 'dashboard';

  function navigate(view, { scroll = true } = {}) {
    if (!VIEWS[view]) view = 'dashboard';
    currentView = view;
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${view}`; });
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
    history.replaceState(history.state, '', `#${view}`);
    renderCurrent();
    if (scroll) window.scrollTo({ top: 0 });
  }

  function renderCurrent() {
    const o = overall();
    const tb = $('#topbar-title'), eb = $('#topbar-eyebrow');
    tb.textContent = currentView === 'dashboard' ? greeting() : VIEWS[currentView].label;
    eb.textContent = currentView === 'dashboard'
      ? state.settings.programmeTitle
      : VIEWS[currentView].eyebrow ? VIEWS[currentView].eyebrow(o)
      : o.phase === 'during' ? `Week ${o.currentWeek} · Day ${o.dayNo} of 28` : o.phase === 'before' ? `Starts ${fmtDate(o.start)}` : 'Programme period ended';
    VIEWS[currentView].render(o);
    updateTimerUI();
  }

  function greeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const n = (state.settings.name || '').trim();
    return n ? `${g}, ${n}` : g;
  }

  // ---------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------
  function resumeUrl() {
    return (state.udemy.resumeUrl || '').trim() || state.settings.courseUrl || DEFAULT_COURSE_URL;
  }

  function renderDashboard(o) {
    const el = $('#view-dashboard');
    const plannedH = o.plannedMin / 60;
    const hoursPct = o.plannedMin ? (o.actualSec / 60 / o.plannedMin) * 100 : 0;
    const phaseLabel = o.phase === 'during' ? `Week ${o.currentWeek} of 4 · Day ${o.dayNo}` : o.phase === 'before' ? 'Not started yet' : 'Target period complete';
    const daysLabel = o.phase === 'before' ? `Starts in ${o.startsIn} day${o.startsIn === 1 ? '' : 's'}` : o.phase === 'after' ? 'Target date passed' : o.daysRemaining === 1 ? 'Final day' : `Target ${fmtDate(o.deadline)}`;

    el.innerHTML = `
      ${installBanner()}
      <div class="card hero">
        <div class="ring-wrap">${ring(o.pct, 112, 10, 'heroGrad')}
          <div class="ring-label"><span class="ring-value num">${Math.round(o.pct)}%</span><span class="ring-caption">complete</span></div>
        </div>
        <div class="hero-text">
          <div class="phase">${phaseLabel}</div>
          <p class="motivation">${esc(motivation(o))}</p>
        </div>
      </div>

      <a class="btn btn-primary btn-xl" href="${esc(resumeUrl())}" target="_blank" rel="noopener">${icon('play')} Continue studying</a>

      <div class="stat-grid">
        <div class="card stat hours">
          <div class="stat-top">${icon('clock')} Study hours</div>
          <div class="stat-value num">${fmtHours(o.actualSec)}<small>/ ${+plannedH.toFixed(1)}h</small></div>
          ${bar(hoursPct)}
        </div>
        <div class="card stat sessions">
          <div class="stat-top">${icon('check')} Sessions</div>
          <div class="stat-value num">${o.completed}<small>/ ${o.total}</small></div>
          <div class="stat-foot">${o.partial ? `${o.partial} partial` : 'completed'}${o.skipped ? ` · ${o.skipped} skipped` : ''}</div>
        </div>
        <div class="card stat flame">
          <div class="stat-top">${icon('flame')} Streak</div>
          <div class="stat-value num">${o.streak}<small>day${o.streak === 1 ? '' : 's'}</small></div>
          <div class="stat-foot">Best ${longestStreak()} day${longestStreak() === 1 ? '' : 's'}</div>
        </div>
        <div class="card stat days">
          <div class="stat-top">${icon('calendar')} Days left</div>
          <div class="stat-value num">${o.daysRemaining}<small>/ 28</small></div>
          <div class="stat-foot">${daysLabel}</div>
        </div>
      </div>

      <div class="section-title">Next session</div>
      ${nextSessionCard(o)}

      ${hooks.dashboard.map((fn) => { try { return fn(o); } catch (e) { console.error(e); return ''; } }).join('')}

      <div class="section-title">28-day countdown <span class="tiny" style="text-transform:none;letter-spacing:0">Week ${o.currentWeek}</span></div>
      <div class="card">${countdownGrid(o)}</div>

      <div class="section-title">Weekly progress</div>
      <div class="card week-bars">
        ${o.weeks.map((w) => `
          <div class="week-bar-row ${o.phase === 'during' && w.week === o.currentWeek ? 'current' : ''}">
            <div class="row-top">
              <span class="label">Week ${w.week} <span class="muted">· ${esc(state.weeks[w.week - 1].title)}</span></span>
              <span class="val num">${Math.round(w.pct)}%</span>
            </div>
            ${bar(w.pct, w.pct >= 100 ? 'teal' : '')}
          </div>`).join('')}
      </div>

      <div class="section-title">Udemy course</div>
      <div class="card udemy-card">
        <div class="udemy-row">
          <div class="udemy-pct num">${Math.round(num(state.udemy.progress))}%</div>
          <div style="flex:1;min-width:0">
            ${bar(num(state.udemy.progress), 'teal')}
            <div class="udemy-lecture" style="margin-top:8px">${state.udemy.lectureTitle
              ? `${state.udemy.section ? `Section ${esc(state.udemy.section)} · ` : ''}${esc(state.udemy.lectureTitle)}`
              : '<span class="muted">No lecture recorded yet</span>'}</div>
          </div>
        </div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-sm" data-action="goto" data-view="progress" data-anchor="udemy">${icon('edit')} Update</button>
          <a class="btn btn-sm" href="${esc(resumeUrl())}" target="_blank" rel="noopener">${icon('external')} Resume</a>
        </div>
      </div>`;
  }

  function nextSessionCard(o) {
    const s = o.next;
    if (!s) {
      return `<div class="card empty">${icon('trophy')}<div style="margin-top:8px">No pending sessions — every session is resolved.</div></div>`;
    }
    const iso = sessionDate(s);
    const diff = daysBetween(o.today, iso);
    const d = parseISO(iso);
    const running = state.timer && state.timer.sessionId === s.id;
    return `<div class="card next-card">
      <div class="next-head">
        <div class="date-chip ${diff < 0 ? 'overdue' : ''}"><span class="dow">${DAY_SHORT[(d.getDay() + 6) % 7]}</span><span class="dom num">${d.getDate()}</span></div>
        <div style="min-width:0">
          <div class="next-topic">${esc(s.topic)}</div>
          <div class="next-meta">${diff < 0 ? `<span style="color:var(--amber)">Overdue · ${fmtDate(iso)}</span>` : relDay(iso)} · Week ${s.week} · ${fmtMin(s.plannedMin)} planned${s.actualSec ? ` · ${fmtMin(s.actualSec / 60)} done` : ''}</div>
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
    let cells = '';
    for (let i = 0; i < 28; i++) {
      const iso = toISO(addDays(start, i));
      const agg = dayAggregate(Math.floor(i / 7) + 1, i % 7);
      const past = iso < o.today;
      let cls = agg === 'completed' || agg === 'partial' || agg === 'skipped' ? agg : past && agg === 'pending' ? 'missed' : '';
      if (iso === o.today) cls += ' today';
      cells += `<div class="cd-cell ${cls}" title="${fmtDate(iso)} · ${agg}">${parseISO(iso).getDate()}</div>`;
    }
    const heads = Array.from({ length: 7 }, (_, i) => `<div class="cd-head">${DAY_SHORT[(addDays(start, i).getDay() + 6) % 7].slice(0, 2)}</div>`).join('');
    return `<div class="countdown-grid">${heads}${cells}</div>
      <div class="cd-legend">
        <span><i style="background:var(--teal)"></i>Done</span>
        <span><i style="background:var(--amber)"></i>Partial</span>
        <span><i style="background:var(--red)"></i>Skipped</span>
        <span><i style="border:1px dashed #5a6478"></i>Missed</span>
        <span><i style="border:1.5px solid var(--accent)"></i>Today</span>
      </div>`;
  }

  // ---------------------------------------------------------------
  // Study plan
  // ---------------------------------------------------------------
  function renderPlan(o) {
    const el = $('#view-plan');
    const w = clamp(state.ui.planWeek || o.currentWeek, 1, 4);
    const ws = o.weeks[w - 1];
    const list = sortSessions(ws.sessions);
    el.innerHTML = `
      <div class="seg sticky" role="tablist">
        ${[1, 2, 3, 4].map((n) => `<button role="tab" class="${n === w ? 'active' : ''}" data-action="plan-week" data-week="${n}">Week ${n}</button>`).join('')}
      </div>
      <div class="week-head">
        <h2>${esc(state.weeks[w - 1].title)}</h2>
        <div class="meta">
          <span>${fmtDate(toISO(addDays(parseISO(state.settings.startDate), (w - 1) * 7)), { day: 'numeric', month: 'short' })} – ${fmtDate(toISO(addDays(parseISO(state.settings.startDate), (w - 1) * 7 + 6)), { day: 'numeric', month: 'short' })}</span>
          <span class="num">${fmtMin(ws.actualSec / 60)} / ${fmtMin(ws.plannedMin)}</span>
          <span class="num">${Math.round(ws.pct)}% complete</span>
        </div>
      </div>
      <div class="session-list">
        ${list.length ? list.map((s) => sessionItem(s, o)).join('') : '<div class="card empty">No tasks this week. Add one below.</div>'}
      </div>
      <div class="add-row"><button class="btn btn-block btn-ghost" data-action="add-session" data-week="${w}">${icon('plus')} Add task or lecture block</button></div>`;
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

  function openSessionSheet(id) {
    const s = getSession(id);
    if (!s) return;
    const iso = sessionDate(s);
    openSheet(`
      <div class="sheet-title">
        <div>
          <div class="eyebrow">Week ${s.week} · Day ${(s.week - 1) * 7 + s.day + 1} · ${fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
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
          <div class="input-suffix"><input class="input num" type="number" inputmode="numeric" min="0" step="5" value="${s.plannedMin}" data-bind="session:${s.id}:plannedMin"><span>min</span></div>
        </label>
        <label class="field"><span class="label">Actual time</span>
          <div class="input-suffix"><input class="input num" type="number" inputmode="numeric" min="0" step="1" value="${Math.round(s.actualSec / 60)}" data-bind="session:${s.id}:actualMin" id="actual-${s.id}"><span>min</span></div>
        </label>
      </div>

      <label class="field"><span class="label">Study topic</span>
        <input class="input" type="text" value="${esc(s.topic)}" data-bind="session:${s.id}:topic" maxlength="140">
      </label>

      <label class="field"><span class="label">Udemy lecture / section reference</span>
        <input class="input" type="text" value="${esc(s.lectureRef)}" placeholder="e.g. Section 4 · Lecture 37" data-bind="session:${s.id}:lectureRef">
      </label>

      <div class="field"><span class="label">Lectures in this session</span>
        <ul class="checklist" id="lectures-${s.id}">${lectureItems(s)}</ul>
        <div class="inline-add">
          <input class="input" type="text" placeholder="Add a lecture title" id="lec-input-${s.id}" data-enter="add-lecture" data-id="${s.id}">
          <button class="btn" data-action="add-lecture" data-id="${s.id}" aria-label="Add lecture">${icon('plus')}</button>
        </div>
      </div>

      <label class="field"><span class="label">Key concepts learned</span>
        <textarea class="textarea" data-bind="session:${s.id}:concepts" placeholder="Short bullet points work well">${esc(s.concepts)}</textarea>
      </label>
      <label class="field"><span class="label">Practical exercises completed</span>
        <textarea class="textarea" data-bind="session:${s.id}:exercises" placeholder="Labs, simulations, tenant configuration…">${esc(s.exercises)}</textarea>
      </label>
      <label class="field"><span class="label">Notes</span>
        <textarea class="textarea" data-bind="session:${s.id}:notes">${esc(s.notes)}</textarea>
      </label>

      <div class="group-label">Organise</div>
      <div class="grid-2">
        <label class="field"><span class="label">Week</span>
          <select class="select" data-bind="session:${s.id}:week">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === s.week ? 'selected' : ''}>Week ${n}</option>`).join('')}</select>
        </label>
        <label class="field"><span class="label">Day</span>
          <select class="select" data-bind="session:${s.id}:day">${DAY_NAMES.map((n, i) => `<option value="${i}" ${i === s.day ? 'selected' : ''}>Day ${i + 1} · ${dayNameFor(s.week, i)}</option>`).join('')}</select>
        </label>
      </div>
      <label class="field"><span class="label">Type</span>
        <select class="select" data-bind="session:${s.id}:kind">${Object.keys(KINDS).map((k) => `<option value="${k}" ${k === s.kind ? 'selected' : ''}>${KINDS[k].label}</option>`).join('')}</select>
      </label>

      <div class="btn-row" style="margin-top:22px">
        <button class="btn btn-danger" data-action="delete-session" data-id="${s.id}">${icon('trash')} Delete task</button>
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
        <button class="check-hit" data-action="toggle-lecture" data-id="${s.id}" data-lec="${l.id}" aria-label="Toggle lecture"><span class="checkbox ${l.done ? 'on' : ''}">${icon('check')}</span></button>
        <span class="txt">${esc(l.title)}</span>
        <button class="mini-btn" data-action="remove-lecture" data-id="${s.id}" data-lec="${l.id}" aria-label="Remove lecture">${icon('x')}</button>
      </li>`).join('');
  }

  // ---------------------------------------------------------------
  // Progress view (weekly cards, quizzes, Udemy, achievements)
  // ---------------------------------------------------------------
  const quizPct = (q) => (num(q.questions) > 0 ? (num(q.correct) / num(q.questions)) * 100 : 0);

  function renderProgress(o) {
    const el = $('#view-progress');
    const quizzes = [...state.quizzes].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const target = state.settings.masteryTarget;
    const avg = quizzes.length ? quizzes.reduce((a, q) => a + quizPct(q), 0) / quizzes.length : 0;
    const best = quizzes.length ? Math.max(...quizzes.map(quizPct)) : 0;
    const mastered = quizzes.filter((q) => quizPct(q) >= target).length;
    const earned = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

    el.innerHTML = `
      <div class="section-title">Weekly objectives</div>
      ${o.weeks.map((w) => weekCard(w, o)).join('')}

      <div class="section-title" id="quizzes">Quizzes &amp; knowledge <button class="link-btn" data-action="add-quiz">${icon('plus', '')} Add result</button></div>
      <div class="card">
        <div class="quiz-summary">
          <div class="wc-stat"><div class="k">Average</div><div class="v num">${quizzes.length ? Math.round(avg) + '%' : '—'}</div></div>
          <div class="wc-stat"><div class="k">Best</div><div class="v num">${quizzes.length ? Math.round(best) + '%' : '—'}</div></div>
          <div class="wc-stat"><div class="k">At ${target}%+</div><div class="v num">${mastered}/${quizzes.length}</div></div>
        </div>
        <div class="chart-wrap">${quizChart(quizzes, target)}</div>
        <div class="tiny muted" style="margin-top:8px">Dashed line marks your ${target}% mastery target. Record results from your own or Udemy practice tests — this app contains no official exam questions.</div>
      </div>
      ${quizzes.length ? [...quizzes].reverse().map(quizItem).join('') : ''}

      <div class="section-title" id="udemy">Udemy course progress</div>
      <div class="card">
        <label class="field" style="margin-top:0"><span class="label">Last completed lecture title</span>
          <input class="input" type="text" value="${esc(state.udemy.lectureTitle)}" data-bind="udemy:lectureTitle" placeholder="Copy the title from Udemy">
        </label>
        <div class="grid-2">
          <label class="field"><span class="label">Section number</span>
            <input class="input num" type="text" inputmode="numeric" value="${esc(state.udemy.section)}" data-bind="udemy:section" placeholder="e.g. 5">
          </label>
          <label class="field"><span class="label">Udemy progress</span>
            <div class="input-suffix"><input class="input num" type="number" inputmode="numeric" min="0" max="100" value="${num(state.udemy.progress)}" data-bind="udemy:progress"><span>%</span></div>
          </label>
        </div>
        <label class="field"><span class="label">Resume link (optional)</span>
          <input class="input" type="url" inputmode="url" value="${esc(state.udemy.resumeUrl)}" data-bind="udemy:resumeUrl" placeholder="Paste the lecture URL to jump straight back">
          <span class="hint">Leave blank to use the course link from Settings. Progress is entered manually — the app never signs in to Udemy.</span>
        </label>
        <div class="btn-row" style="margin-top:14px">
          <a class="btn btn-primary" href="${esc(resumeUrl())}" target="_blank" rel="noopener">${icon('external')} Resume course</a>
        </div>
        ${state.udemy.updatedAt ? `<div class="tiny muted" style="margin-top:10px">Last updated ${fmtDate(state.udemy.updatedAt.slice(0, 10))}</div>` : ''}
      </div>

      <div class="section-title">Achievements <span class="tiny" style="text-transform:none;letter-spacing:0">${earned}/${ACHIEVEMENTS.length}</span></div>
      <div class="ach-grid">
        ${ACHIEVEMENTS.map((a) => `<div class="ach ${state.achievements[a.id] ? 'earned' : ''}">
          <div class="ach-ic">${icon(a.icon)}</div>
          <div style="min-width:0"><div class="ach-t">${esc(a.t)}</div><div class="ach-d">${state.achievements[a.id] ? `Earned ${fmtDate(state.achievements[a.id], { day: 'numeric', month: 'short' })}` : esc(a.d)}</div></div>
        </div>`).join('')}
      </div>`;
  }

  function weekCard(w, o) {
    const wk = state.weeks[w.week - 1];
    const rev = wk.revision;
    return `<div class="card week-card" id="week-card-${w.week}">
      <div class="wc-top">
        <div class="wc-ring">${ring(w.pct, 64, 7, `wg${w.week}`)}<span class="num">${Math.round(w.pct)}%</span></div>
        <div style="min-width:0;flex:1">
          <div class="wc-kicker">Week ${w.week}${o.phase === 'during' && o.currentWeek === w.week ? ' · current' : ''}</div>
          <div class="wc-title">${esc(wk.title)}</div>
          ${w.allSessionsDone ? `<div class="badge-done" style="margin-top:4px">${icon('trophy')} Week complete</div>` : ''}
        </div>
      </div>
      <div class="wc-stats">
        <div class="wc-stat"><div class="k">Planned</div><div class="v num">${+(w.plannedMin / 60).toFixed(1)}h</div></div>
        <div class="wc-stat"><div class="k">Actual</div><div class="v num">${fmtHours(w.actualSec)}h</div></div>
        <div class="wc-stat"><div class="k">Tasks done</div><div class="v num">${w.completed + w.objDone}/${w.sessions.length + w.objTotal}</div></div>
      </div>

      <div class="group-label">Objectives</div>
      <ul class="checklist">
        ${wk.objectives.map((ob) => `
          <li class="check-item ${ob.done ? 'done' : ''}">
            <button class="check-hit" data-action="toggle-objective" data-week="${w.week}" data-obj="${ob.id}" aria-label="Toggle objective"><span class="checkbox ${ob.done ? 'on' : ''}">${icon('check')}</span></button>
            <span class="txt">${esc(ob.text)}</span>
            <button class="mini-btn" data-action="edit-objective" data-week="${w.week}" data-obj="${ob.id}" aria-label="Edit objective">${icon('edit')}</button>
          </li>`).join('') || '<li class="muted small">No objectives yet.</li>'}
      </ul>
      <div class="inline-add">
        <input class="input" type="text" placeholder="Add an objective" id="obj-input-${w.week}" data-enter="add-objective" data-week="${w.week}">
        <button class="btn" data-action="add-objective" data-week="${w.week}" aria-label="Add objective">${icon('plus')}</button>
      </div>

      <div class="group-label">Revision status</div>
      <div class="mini-seg" style="margin-top:8px">
        ${[['not-started', 'Not started', 'none'], ['in-progress', 'In progress', 'mid'], ['done', 'Done', '']].map(([k, l, c]) =>
          `<button class="${rev === k ? `active ${c}` : ''}" data-action="set-revision" data-week="${w.week}" data-rev="${k}">${l}</button>`).join('')}
      </div>

      <div class="group-label">Assessment score</div>
      <div class="grid-2" style="align-items:center">
        <div class="input-suffix" style="margin-top:8px"><input class="input num" type="number" inputmode="numeric" min="0" max="100" placeholder="—" value="${wk.assessmentScore ?? ''}" data-bind="week:${w.week}:assessmentScore"><span>%</span></div>
        <div class="small" style="margin-top:8px">${wk.assessmentScore == null || wk.assessmentScore === ''
          ? '<span class="muted">Not assessed yet</span>'
          : num(wk.assessmentScore) >= state.settings.masteryTarget
            ? `<span class="chip teal">${icon('check')}Mastered</span>`
            : `<span class="chip amber">Below ${state.settings.masteryTarget}%</span>`}</div>
      </div>
    </div>`;
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
    const W = 340, H = 170, L = 30, R = 10, T = 12, B = 24;
    const iw = W - L - R, ih = H - T - B;
    const y = (p) => T + ih * (1 - clamp(p, 0, 100) / 100);
    if (!quizzes.length) {
      return `<div class="empty" style="padding:18px 6px">${icon('target')}<div style="margin-top:8px">No quiz results yet. Add your first result to see your trend.</div></div>`;
    }
    const n = quizzes.length;
    const x = (i) => (n === 1 ? L + iw / 2 : L + (iw * i) / (n - 1));
    const pts = quizzes.map((q, i) => [x(i), y(quizPct(q))]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[n - 1][0].toFixed(1)},${y(0)} L${pts[0][0].toFixed(1)},${y(0)} Z`;
    const grid = [0, 50, 100].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke="rgba(255,255,255,0.06)"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${g}</text>`).join('');
    const labelIdx = n <= 6 ? quizzes.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
    const xLabels = labelIdx.map((i) => `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${fmtDate(quizzes[i].date, { day: 'numeric', month: 'short' })}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quiz score history">
      <defs><linearGradient id="qa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b9bff" stop-opacity="0.28"/><stop offset="1" stop-color="#5b9bff" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(target)}" y2="${y(target)}" stroke="#2fd1b5" stroke-dasharray="5 5" stroke-width="1.4"/>
      <text class="axis" x="${W - R}" y="${y(target) - 5}" text-anchor="end" style="fill:#2fd1b5">${target}% target</text>
      ${n > 1 ? `<path d="${area}" fill="url(#qa)"/><path d="${line}" fill="none" stroke="#5b9bff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
      ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="${quizPct(quizzes[i]) >= target ? '#2fd1b5' : '#f3b54a'}" stroke="#131a27" stroke-width="2"/>`).join('')}
      ${xLabels}
    </svg>`;
  }

  function openQuizSheet(id) {
    const existing = id ? state.quizzes.find((q) => q.id === id) : null;
    const q = existing || { name: '', date: todayISO(), questions: 20, correct: '', topics: '', notes: '', week: '' };
    openSheet(`
      <div class="sheet-title">
        <div><div class="eyebrow">${existing ? 'Edit result' : 'New result'}</div><h2>Quiz result</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button>
      </div>
      <form id="quiz-form" novalidate>
        <label class="field" style="margin-top:0"><span class="label">Quiz name</span>
          <input class="input" name="name" required maxlength="100" value="${esc(q.name)}" placeholder="e.g. Week 2 security self-assessment">
        </label>
        <div class="grid-2">
          <label class="field"><span class="label">Date</span><input class="input" type="date" name="date" value="${esc(q.date)}" required></label>
          <label class="field"><span class="label">Counts for</span>
            <select class="select" name="week"><option value="">No week</option>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${String(q.week) === String(n) ? 'selected' : ''}>Week ${n} assessment</option>`).join('')}</select>
          </label>
        </div>
        <div class="grid-2">
          <label class="field"><span class="label">Questions</span><input class="input num" type="number" inputmode="numeric" min="1" name="questions" value="${esc(q.questions)}" required></label>
          <label class="field"><span class="label">Correct</span><input class="input num" type="number" inputmode="numeric" min="0" name="correct" value="${esc(q.correct)}" required></label>
        </div>
        <div class="score-preview"><div><div class="small muted">Score</div><div class="big num" id="quiz-pct">—</div></div><div id="quiz-verdict"></div></div>
        <label class="field"><span class="label">Topics that need improvement</span>
          <input class="input" name="topics" value="${esc(q.topics)}" placeholder="e.g. Conditional Access session controls">
        </label>
        <label class="field"><span class="label">Notes</span><textarea class="textarea" name="notes">${esc(q.notes)}</textarea></label>
        <div class="tiny muted" style="margin-top:10px">Use results from practice tests you take elsewhere. Generic practice questions are not official Microsoft exam content.</div>
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
      if (!data.name) return toast('Give the quiz a name.', { icon: 'x' });
      if (!isValidISO(data.date)) return toast('Pick a valid date.', { icon: 'x' });
      if (data.questions < 1) return toast('Number of questions must be at least 1.', { icon: 'x' });
      if (data.correct < 0 || data.correct > data.questions) return toast('Correct answers must be between 0 and the number of questions.', { icon: 'x' });
      if (existing) Object.assign(existing, data); else state.quizzes.push({ id: uid(), ...data });
      if (data.week) state.weeks[data.week - 1].assessmentScore = Math.round((data.correct / data.questions) * 100);
      logActivity({});
      save();
      closeSheet();
      toast(existing ? 'Quiz result updated' : 'Quiz result saved');
      checkAchievements();
    });
  }

  // ---------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------
  let deferredInstall = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function installBanner() {
    if (isStandalone() || state.ui.installDismissed || !deferredInstall) return '';
    return `<div class="card install-banner">
      ${icon('install')}
      <div class="txt"><strong>Install on your phone</strong>Works offline from your home screen.</div>
      <button class="btn btn-sm btn-primary" data-action="install">Install</button>
      <button class="mini-btn" data-action="dismiss-install" aria-label="Dismiss">${icon('x')}</button>
    </div>`;
  }

  function renderSettings() {
    const el = $('#view-settings');
    const st = state.settings;
    const startDow = (parseISO(st.startDate).getDay() + 6) % 7;
    el.innerHTML = `
      <div class="section-title">App</div>
      <div class="card">
        ${isStandalone()
          ? `<div class="row" style="display:flex;gap:10px;align-items:center">${icon('check')}<span>Installed — running as an app.</span></div>`
          : deferredInstall
            ? `<button class="btn btn-primary btn-block" data-action="install">${icon('install')} Install to home screen</button>`
            : `<div class="small muted">${icon('install')}<br>To install: open this site in Chrome on Android, tap the <strong>⋮</strong> menu, then <strong>Add to Home screen</strong> or <strong>Install app</strong>.</div>`}
        <label class="field"><span class="label">Your name</span><input class="input" value="${esc(st.name)}" data-bind="settings:name" maxlength="40"></label>
        <label class="field"><span class="label">Programme title</span><input class="input" value="${esc(st.programmeTitle)}" data-bind="settings:programmeTitle" maxlength="60"></label>
      </div>

      <div class="section-title">Programme dates</div>
      <div class="card">
        <label class="field" style="margin-top:0"><span class="label">Start date</span>
          <input class="input" type="date" value="${esc(st.startDate)}" data-bind="settings:startDate">
        </label>
        <div class="settings-list" style="margin-top:8px">
          <div class="row"><span class="muted">Completion deadline (day 28)</span><strong id="deadline-out">${fmtDate(deadlineISO(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
        </div>
        <div id="start-callout">${startDow !== 0 ? `<div class="callout">Your start date is a ${DAY_NAMES[startDow]}. Pick a Monday so the longer Saturday and Sunday sessions land on the weekend.</div>` : ''}</div>
      </div>

      <div class="section-title">Daily study targets</div>
      <div class="card">
        <div class="small muted" style="margin-bottom:6px">Minutes per day slot. Changes apply to every session in that slot unless you set its planned time manually.</div>
        ${DAY_NAMES.map((d, i) => `<div class="target-row"><span>Day ${i + 1} · ${d}</span>
          <div class="input-suffix"><input class="input num" type="number" inputmode="numeric" min="0" max="720" step="5" value="${st.dailyTargets[i]}" data-bind="target:${i}"><span>min</span></div></div>`).join('')}
        <div class="target-total"><span>Weekly target</span><span class="num" id="weekly-target-out">${fmtMin(st.dailyTargets.reduce((a, b) => a + b, 0))}</span></div>
        <div class="target-total" style="border-top:0;padding-top:4px;margin-top:4px"><span class="muted">Programme total (all sessions)</span><span class="num muted" id="total-target-out">${fmtMin(state.sessions.reduce((a, s) => a + num(s.plannedMin), 0))}</span></div>
      </div>

      <div class="section-title">Weekly schedule</div>
      <div class="card">
        ${state.weeks.map((w) => `<label class="field" ${w.week === 1 ? 'style="margin-top:0"' : ''}><span class="label">Week ${w.week} theme</span><input class="input" value="${esc(w.title)}" data-bind="week:${w.week}:title" maxlength="80"></label>`).join('')}
        <div class="small muted" style="margin-top:12px">Edit, add, move or delete individual tasks from the Study Plan tab.</div>
        <button class="btn btn-block" style="margin-top:12px" data-action="goto" data-view="plan">${icon('plan')} Open study plan</button>
      </div>

      <div class="section-title">Course</div>
      <div class="card">
        <label class="field" style="margin-top:0"><span class="label">Udemy course URL</span>
          <input class="input" type="url" inputmode="url" value="${esc(st.courseUrl)}" data-bind="settings:courseUrl">
        </label>
        <label class="field"><span class="label">Mastery target</span>
          <div class="input-suffix"><input class="input num" type="number" inputmode="numeric" min="1" max="100" value="${st.masteryTarget}" data-bind="settings:masteryTarget"><span>%</span></div>
          <span class="hint">A topic counts as mastered when a quiz or assessment reaches this score.</span>
        </label>
      </div>

      <div class="section-title">Backup &amp; data</div>
      <div class="card">
        <div class="btn-row">
          <button class="btn" data-action="export">${icon('download')} Export JSON</button>
          <button class="btn" data-action="import">${icon('upload')} Import JSON</button>
        </div>
        <div class="small muted" style="margin-top:12px">Data is stored only on this device and saves automatically. Export a backup now and then — clearing site data in Chrome would erase it.</div>
        <hr class="divider">
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-danger" data-action="reset-progress">${icon('refresh')} Clear progress</button>
          <button class="btn btn-danger" data-action="reset-all">${icon('trash')} Reset everything</button>
        </div>
        <div class="tiny muted" style="margin-top:10px">Clear progress keeps your customised plan. Reset everything restores the original 4-week programme.</div>
      </div>
      <div class="tiny muted" style="text-align:center;margin-top:22px">Study Tracker v${APP_VERSION} · ${storageOk ? 'Saved locally' : 'Storage unavailable'} · ${navigator.onLine ? 'Online' : 'Offline'}</div>`;
  }

  function updateSettingsDerived() {
    const st = state.settings;
    const d = $('#deadline-out');
    if (d) d.textContent = fmtDate(deadlineISO(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const w = $('#weekly-target-out');
    if (w) w.textContent = fmtMin(st.dailyTargets.reduce((a, b) => a + b, 0));
    const t = $('#total-target-out');
    if (t) t.textContent = fmtMin(state.sessions.reduce((a, s) => a + num(s.plannedMin), 0));
    const c = $('#start-callout');
    if (c) {
      const dow = (parseISO(st.startDate).getDay() + 6) % 7;
      c.innerHTML = dow !== 0 ? `<div class="callout">Your start date is a ${DAY_NAMES[dow]}. Pick a Monday so the longer Saturday and Sunday sessions land on the weekend.</div>` : '';
    }
    const eb = $('#topbar-eyebrow');
    const o = overall();
    if (eb && currentView !== 'dashboard') eb.textContent = o.phase === 'during' ? `Week ${o.currentWeek} · Day ${o.dayNo} of 28` : o.phase === 'before' ? `Starts ${fmtDate(o.start)}` : 'Programme period ended';
  }

  // ---------------------------------------------------------------
  // Data binding for inputs
  // ---------------------------------------------------------------
  function applyBinding(el, committed) {
    const [scope, a, b] = el.dataset.bind.split(':');
    const v = el.value;
    if (scope === 'session') {
      const s = getSession(a);
      if (!s) return;
      if (b === 'topic' || b === 'lectureRef' || b === 'notes' || b === 'concepts' || b === 'exercises') {
        s[b] = b === 'topic' ? (v.trim() || (committed ? 'Untitled task' : v)) : v;
        if (b === 'topic') { const h = $('.sheet-title h2'); if (h) h.textContent = s[b]; }
      } else if (!committed) {
        return; // numbers & selects commit on change
      } else if (b === 'plannedMin') {
        s.plannedMin = clamp(Math.round(num(v, s.plannedMin)), 0, 1440);
        s.customPlanned = true;
        el.value = s.plannedMin;
      } else if (b === 'actualMin') {
        const newSec = clamp(Math.round(num(v, s.actualSec / 60)), 0, 1440) * 60;
        const delta = newSec - s.actualSec;
        if (Math.abs(delta) >= 60 || newSec === 0) {
          s.actualSec = newSec;
          if (delta > 0) logActivity({ min: delta / 60 });
        }
        el.value = Math.round(s.actualSec / 60);
      } else if (b === 'week' || b === 'day') {
        s[b] = Number(v);
        s.order = Math.max(0, ...state.sessions.filter((x) => x !== s && x.week === s.week && x.day === s.day).map((x) => x.order + 1));
        if (b === 'week') state.ui.planWeek = s.week;
        const ey = $('.sheet-title .eyebrow');
        if (ey) ey.textContent = `Week ${s.week} · Day ${(s.week - 1) * 7 + s.day + 1} · ${fmtDate(sessionDate(s), { weekday: 'long', day: 'numeric', month: 'short' })}`;
      } else if (b === 'kind') {
        s.kind = KINDS[v] ? v : 'study';
      }
      save();
      if (committed) afterChange();
      return;
    }
    if (scope === 'settings') {
      const st = state.settings;
      if (a === 'name' || a === 'programmeTitle') st[a] = v.slice(0, 80);
      else if (!committed) return;
      else if (a === 'startDate') {
        if (isValidISO(v)) st.startDate = v; else { el.value = st.startDate; return toast('Pick a valid date.', { icon: 'x' }); }
      } else if (a === 'courseUrl') {
        const u = v.trim();
        if (u && !/^https?:\/\//i.test(u)) { el.value = st.courseUrl; return toast('The course URL must start with https://', { icon: 'x' }); }
        st.courseUrl = u || DEFAULT_COURSE_URL;
        el.value = st.courseUrl;
      } else if (a === 'masteryTarget') {
        st.masteryTarget = clamp(Math.round(num(v, 85)), 1, 100);
        el.value = st.masteryTarget;
      }
      save();
      if (committed) { updateSettingsDerived(); checkAchievements(); }
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
    if (scope === 'week') {
      const wk = state.weeks[Number(a) - 1];
      if (b === 'title') { wk.title = v.slice(0, 80); save(); return; }
      if (b === 'assessmentScore') {
        if (!committed) return;
        wk.assessmentScore = v === '' ? null : clamp(Math.round(num(v)), 0, 100);
        el.value = wk.assessmentScore ?? '';
        save();
        afterChange();
      }
      return;
    }
    if (scope === 'udemy') {
      const u = state.udemy;
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
    if (el) applyBinding(el, false);
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

  const actions = {
    'close-sheet': () => closeSheet(),
    goto: (el) => {
      navigate(el.dataset.view);
      if (el.dataset.anchor) setTimeout(() => document.getElementById(el.dataset.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    },
    'plan-week': (el) => { state.ui.planWeek = Number(el.dataset.week); save(); renderCurrent(); },
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
    'timer-stop': async () => {
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
      save();
      input.focus();
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
      const s = newSession({ week, day: 0, topic: 'New study task', plannedMin: 30, customPlanned: true });
      s.order = Math.max(0, ...state.sessions.filter((x) => x.week === week && x.day === 0).map((x) => x.order + 1));
      state.sessions.push(s);
      save();
      renderCurrent();
      openSessionSheet(s.id);
      setTimeout(() => { const i = $(`[data-bind="session:${s.id}:topic"]`); if (i) { i.focus(); i.select(); } }, 350);
    },
    'delete-session': async (el) => {
      const s = getSession(el.dataset.id);
      if (!s) return;
      const ok = await confirmDialog({ title: 'Delete this task?', body: `“${s.topic}” and its notes and logged time will be removed.`, ok: 'Delete', danger: true });
      if (!ok) return;
      if (state.timer && state.timer.sessionId === s.id) state.timer = null;
      state.sessions = state.sessions.filter((x) => x.id !== s.id);
      save();
      closeSheet();
      toast('Task deleted', { icon: 'trash' });
    },
    'toggle-objective': (el) => {
      const wk = state.weeks[Number(el.dataset.week) - 1];
      const ob = wk.objectives.find((x) => x.id === el.dataset.obj);
      if (!ob) return;
      ob.done = !ob.done;
      if (ob.done) logActivity({});
      save();
      afterChange();
    },
    'add-objective': (el) => {
      const w = Number(el.dataset.week);
      const input = $(`#obj-input-${w}`);
      const text = input.value.trim();
      if (!text) return input.focus();
      state.weeks[w - 1].objectives.push({ id: uid(), text, done: false });
      save();
      renderCurrent();
      setTimeout(() => $(`#obj-input-${w}`)?.focus(), 30);
    },
    'edit-objective': (el) => {
      const w = Number(el.dataset.week);
      const wk = state.weeks[w - 1];
      const ob = wk.objectives.find((x) => x.id === el.dataset.obj);
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
      const wk = state.weeks[Number(el.dataset.week) - 1];
      const ob = wk.objectives.find((x) => x.id === el.dataset.obj);
      const text = $('#obj-edit').value.trim();
      if (ob && text) { ob.text = text; save(); }
      closeSheet();
    },
    'delete-objective': (el) => {
      const wk = state.weeks[Number(el.dataset.week) - 1];
      wk.objectives = wk.objectives.filter((x) => x.id !== el.dataset.obj);
      save();
      closeSheet();
      toast('Objective removed', { icon: 'trash' });
    },
    'set-revision': (el) => {
      state.weeks[Number(el.dataset.week) - 1].revision = el.dataset.rev;
      save();
      renderCurrent();
    },
    'add-quiz': () => openQuizSheet(null),
    'edit-quiz': (el) => openQuizSheet(el.dataset.id),
    'delete-quiz': async (el) => {
      const ok = await confirmDialog({ title: 'Delete this quiz result?', body: 'It will be removed from your history and chart.', ok: 'Delete', danger: true });
      if (!ok) return;
      state.quizzes = state.quizzes.filter((q) => q.id !== el.dataset.id);
      save();
      closeSheet();
      toast('Quiz result deleted', { icon: 'trash' });
    },
    install: async () => {
      if (!deferredInstall) return toast('Use Chrome’s ⋮ menu → Add to Home screen.', { icon: 'install' });
      deferredInstall.prompt();
      const choice = await deferredInstall.userChoice.catch(() => null);
      deferredInstall = null;
      if (choice && choice.outcome === 'accepted') toast('Installing…', { icon: 'install' });
      renderCurrent();
    },
    'dismiss-install': () => { state.ui.installDismissed = true; save(); renderCurrent(); },
    export: () => {
      if (state.timer) timerPause();
      const data = JSON.stringify({ app: 'm365-study-tracker', exportedAt: new Date().toISOString(), version: APP_VERSION, data: state }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `study-tracker-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Backup exported', { icon: 'download' });
    },
    import: () => $('#import-file').click(),
    'reset-progress': async () => {
      const ok = await confirmDialog({ title: 'Clear all progress?', body: 'Logged time, statuses, notes, quiz results (including Quiz Centre history), objective ticks, streaks and achievements will be cleared. Your customised plan and settings stay. Export a backup first if unsure.', ok: 'Clear progress', danger: true });
      if (!ok) return;
      state.sessions.forEach((s) => Object.assign(s, { actualSec: 0, status: 'pending', notes: '', concepts: '', exercises: '', lectureRef: '', completedOn: null, lectures: s.lectures.map((l) => ({ ...l, done: false })) }));
      state.weeks.forEach((w) => { w.objectives.forEach((o) => { o.done = false; }); w.revision = 'not-started'; w.assessmentScore = null; });
      Object.assign(state, { quizzes: [], activity: {}, timer: null, achievements: {} });
      state.udemy = { lectureTitle: '', section: '', progress: 0, resumeUrl: '', updatedAt: null };
      hooks.reset.forEach((fn) => fn(state, 'progress'));
      save(true);
      renderCurrent();
      toast('Progress cleared', { icon: 'refresh' });
    },
    'reset-all': async () => {
      const ok = await confirmDialog({ title: 'Reset everything?', body: 'This restores the original 4-week programme and deletes all progress, custom tasks and settings on this device.', ok: 'Reset everything', danger: true });
      if (!ok) return;
      state = defaultState();
      hooks.reset.forEach((fn) => fn(state, 'all'));
      save(true);
      navigate('dashboard');
      toast('Programme reset', { icon: 'refresh' });
    },
  };

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { if (sheetOpen) closeSheet(); navigate(nav.dataset.nav); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const raw = parsed && parsed.data ? parsed.data : parsed;
      if (!raw || !Array.isArray(raw.sessions) || !raw.settings) throw new Error('Not a Study Tracker backup');
      const ok = await confirmDialog({ title: 'Replace current data?', body: `Import “${file.name}”? Everything currently on this device will be replaced by the backup.`, ok: 'Import' });
      if (!ok) return;
      state = normalise(raw);
      hooks.load.forEach((fn) => fn(state));
      checkAchievements(true);
      save(true);
      navigate('dashboard');
      toast('Backup imported', { icon: 'upload' });
      if (state.timer && state.timer.running) ensureTick();
    } catch (err) {
      toast(`Import failed: ${err.message}`, { icon: 'x', ms: 4500 });
    }
  });

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(true);
    else { renderCurrent(); if (state.timer && state.timer.running) ensureTick(); }
  });
  window.addEventListener('pagehide', () => save(true));
  window.addEventListener('hashchange', () => {
    const v = (location.hash || '').replace('#', '');
    if (VIEWS[v] && v !== currentView) { if (sheetOpen) closeSheet(); navigate(v); }
  });
  window.addEventListener('online', () => currentView === 'settings' && renderCurrent());
  window.addEventListener('offline', () => currentView === 'settings' && renderCurrent());
  // Storage changed in another tab
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY && e.newValue) { state = normalise(JSON.parse(e.newValue)); hooks.load.forEach((fn) => fn(state)); renderCurrent(); } });

  // Refresh day-dependent stats when the date changes while the app is open.
  let lastDay = todayISO();
  setInterval(() => { if (todayISO() !== lastDay) { lastDay = todayISO(); if (!sheetOpen) renderCurrent(); } }, 60000);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (!sheetOpen && (currentView === 'dashboard' || currentView === 'settings')) renderCurrent();
  });
  window.addEventListener('appinstalled', () => { deferredInstall = null; toast('Installed — find it on your home screen', { icon: 'install' }); renderCurrent(); });

  // Service worker with update prompt
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then((reg) => {
        const prompt = (w) => toast('A new version is available.', { icon: 'refresh', action: 'Update', ms: 8000, onAction: () => w.postMessage('SKIP_WAITING') });
        if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w && w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w);
          });
        });
      }).catch((err) => console.warn('SW registration failed', err));
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; save(true); location.reload(); } });
    });
  }

  // ---------------------------------------------------------------
  // Plugin API — lets feature modules (e.g. quiz-centre.js) add views,
  // dashboard cards, achievements and reset behaviour without editing this file.
  // Plugins load after app.js and register before boot (DOMContentLoaded).
  // ---------------------------------------------------------------
  window.StudyApp = {
    get state() { return state; },
    save, overall, renderCurrent, navigate, toast, confirmDialog, celebrate, openSheet, closeSheet,
    icon, esc, bar, ring, fmtDate, fmtMin, fmtClock, relDay, todayISO, toISO, parseISO, addDays, daysBetween, clamp, num, uid,
    logActivity, afterChange, checkAchievements,
    isSheetOpen: () => sheetOpen,
    get currentView() { return currentView; },
    registerView(id, def) { VIEWS[id] = def; },
    addAchievement(a) { if (!ACHIEVEMENTS.some((x) => x.id === a.id)) ACHIEVEMENTS.push(a); },
    hooks,
    ICONS,
  };

  function boot() {
    // Build nav buttons
    $$('.nav-btn').forEach((b) => {
      const v = VIEWS[b.dataset.nav];
      if (!v) { b.hidden = true; return; }
      b.innerHTML = `<span class="nav-ic">${icon(v.icon)}</span><span>${v.short || v.label}</span>`;
    });
    load();
    hooks.load.forEach((fn) => fn(state));
    checkAchievements(true);
    save(true);
    const initial = (location.hash || '').replace('#', '');
    navigate(VIEWS[initial] ? initial : 'dashboard', { scroll: false });
    if (state.timer && state.timer.running) ensureTick();
    hooks.ready.forEach((fn) => fn(state));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  // Expose a tiny debug hook for testing in DevTools.
  window.__studyTracker = { get state() { return state; }, overall, save, render: renderCurrent };
})();
