/* =========================================================
   PrepWise Quiz Centre — a reusable quiz engine that always runs inside the
   active certification. Questions, attempts, statistics, bookmarks and mastery
   come only from that certification's own bank and progress, so nothing can
   leak between certifications. Plugs into the app via window.PrepWise.
   ========================================================= */
'use strict';

(() => {
  const A = window.PrepWise;
  if (!A) { console.warn('Quiz Centre: PrepWise core missing'); return; }
  const { icon, esc, toast, confirmDialog, bar, todayISO, toISO, addDays, clamp } = A;

  // ---------------------------------------------------------------
  // Active certification context
  // ---------------------------------------------------------------
  const EMPTY_EXAM = { domains: [], objectives: {}, sections: {}, refs: {}, weekSections: {}, modes: { mock: { count: 50, minutes: 100 }, final: { count: 60, minutes: 120 } }, minCoverage: 0.6, seed: '', disclaimer: '' };
  const X = () => (A.cert ? A.cert.exam : EMPTY_EXAM);
  let QS = [];
  let QMAP = new Map();
  let DOMS = [];
  function rebuild() {
    QS = A.cert ? A.getQuestions(A.cert.id) : [];
    QMAP = new Map(QS.map((q) => [q.id, q]));
    DOMS = X().domains.filter((d) => QS.some((q) => q.domain === d.id) || !QS.length);
    if (!DOMS.length) DOMS = X().domains;
    const mk = X().modes;
    Object.assign(MODES.mock, { count: mk.mock.count, minutes: mk.mock.minutes, desc: `${mk.mock.count} questions weighted to the exam domains · ${mk.mock.minutes}-minute timer` });
    Object.assign(MODES.final, { count: mk.final.count, minutes: mk.final.minutes, desc: `${mk.final.count} questions across all domains · ${mk.final.minutes}-minute timer` });
  }
  const domOf = (q) => q.domain;
  const domIds = () => DOMS.map((d) => d.id);
  const domById = (id) => DOMS.find((d) => d.id === String(id)) || X().domains.find((d) => d.id === String(id));
  const domIndex = (id) => { const i = X().domains.findIndex((d) => d.id === String(id)); return i >= 0 ? i + 1 : id; };
  const domLabel = (id) => `Domain ${domIndex(id)}`;
  const domShort = (id) => (domById(id) || {}).short || String(id);
  const domTitle = (id) => (domById(id) || {}).title || String(id);
  const mastery = () => (A.state ? A.state.settings.masteryTarget : 85);
  const minCoverage = () => X().minCoverage || 0.6;
  // Domain weights: midpoints of the official ranges, or equal weights when a range is missing.
  function weights() {
    const w = {};
    const all = DOMS.every((d) => d.weight);
    DOMS.forEach((d) => { w[d.id] = all ? (d.weight[0] + d.weight[1]) / 2 : 1; });
    return w;
  }
  const weightSum = () => Object.values(weights()).reduce((a, b) => a + b, 0) || 1;
  const seedKey = () => X().seed || (A.cert ? A.cert.id : 'prepwise');
  function sectionOf(obj) {
    const secs = X().sections || {};
    const hit = Object.keys(secs).filter((k) => obj === k || String(obj).startsWith(`${k}.`)).sort((a, b) => b.length - a.length)[0];
    return hit ? secs[hit] : '';
  }
  const weekSections = (w) => (X().weekSections || {})[w] || null;
  const hasWeekQuizzes = () => Object.keys(X().weekSections || {}).length > 0;
  const inSections = (q, secs) => secs.some((s) => q.obj === s || String(q.obj).startsWith(`${s}.`));
  const weekPool = (w) => { const secs = weekSections(w); return secs ? QS.filter((q) => inSections(q, secs)) : []; };

  const TYPE_LABEL = { single: 'Single answer', multi: 'Multiple answers', order: 'Ordering', match: 'Matching' };
  const DIFF_LABEL = { easy: 'Easy', intermediate: 'Intermediate', advanced: 'Advanced' };
  const MODES = {
    quick: { title: 'Quick Quiz', count: 10, minutes: 10, desc: '10 random questions · about 10 minutes', icon: 'play' },
    standard: { title: 'Standard Quiz', count: 25, minutes: 30, desc: '25 questions · about 25–30 minutes', icon: 'book' },
    mock: { title: 'Full Mock Exam', count: 50, minutes: 100, examOnly: true, weighted: true, desc: '', icon: 'clock' },
    domain: { title: 'Domain Quiz', count: 20, minutes: 25, desc: 'Focus on one exam domain', icon: 'target' },
    weak: { title: 'Weak Areas', count: 20, minutes: 25, desc: 'Questions you previously got wrong', icon: 'refresh' },
    flagged: { title: 'Bookmarked Questions', count: 30, minutes: 35, desc: 'Questions you bookmarked for revision', icon: 'bookmark' },
    daily: { title: 'Daily Challenge', count: 5, practiceOnly: true, desc: '5 questions a day · keep your streak', icon: 'flame' },
    week: { title: 'Week Revision', count: 20, minutes: 25, desc: 'Revision assessment for a programme week', icon: 'calendar' },
    final: { title: 'Final Mock Assessment', count: 60, minutes: 120, examOnly: true, weighted: true, desc: '', icon: 'trophy' },
    retry: { title: 'Retry Incorrect', count: 60, minutes: 60, desc: 'Retry the questions you missed', icon: 'refresh' },
  };

  // ---------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function seeded(str) { // deterministic RNG (mulberry32 seeded from a string hash)
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const pct = (c, t) => (t ? (c / t) * 100 : 0);
  const fmtMS = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
  const fmtDur = (sec) => { const m = Math.round(sec / 60); return m < 1 ? `${Math.round(sec)}s` : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`; };
  function refOf(q) {
    if (q.refUrl) return { url: q.refUrl, title: q.refTitle || 'Reference' };
    const r = q.ref && X().refs[q.ref];
    return r ? { url: r[0], title: r[1] } : null;
  }
  const refLabel = (ref) => (/^https:\/\/learn\.microsoft\.com\//.test(ref.url) ? `Microsoft Learn: ${ref.title}` : ref.title);
  const LETTERS = 'ABCDEFGH';

  // ---------------------------------------------------------------
  // Persistent quiz state — stored inside the active certification's progress
  // ---------------------------------------------------------------
  const DUMMY = { attempts: [], stats: {}, flagged: [], daily: {}, weekBest: {}, prefs: { exam: false, diff: 'all', domain: null }, active: null };
  function qs() {
    const s = A.state;
    if (!s) return DUMMY;
    if (!s.quiz || typeof s.quiz !== 'object') s.quiz = {};
    const q = s.quiz;
    if (!Array.isArray(q.attempts)) q.attempts = [];
    if (!q.stats || typeof q.stats !== 'object') q.stats = {};
    if (!Array.isArray(q.flagged)) q.flagged = [];
    if (!q.daily || typeof q.daily !== 'object') q.daily = {};
    if (!q.weekBest || typeof q.weekBest !== 'object') q.weekBest = {};
    if (!q.prefs || typeof q.prefs !== 'object') q.prefs = { exam: false, diff: 'all', domain: null };
    if (q.active === undefined) q.active = null;
    // Only prune against a loaded bank, so a missing bank never wipes bookmarks.
    if (QS.length) {
      if (q.active && (!Array.isArray(q.active.items) || q.active.items.some((it) => !QMAP.has(it.q)))) q.active = null;
      q.flagged = q.flagged.filter((id) => QMAP.has(id));
    }
    return q;
  }
  const activeOk = () => { const a = qs().active; return !!(a && QS.length && a.items.every((it) => QMAP.has(it.q))); };

  // ---------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------
  function domainStats(d) {
    const pool = QS.filter((q) => domOf(q) === d);
    const st = qs().stats;
    let seen = 0, lastOk = 0, n = 0, c = 0;
    pool.forEach((q) => { const s = st[q.id]; if (s && s.n) { seen++; lastOk += s.last ? 1 : 0; n += s.n; c += s.c; } });
    const coverage = pool.length ? seen / pool.length : 0;
    const accuracy = seen ? (lastOk / seen) * 100 : 0;
    const m = accuracy * Math.min(1, coverage / minCoverage());
    return { d, total: pool.length, seen, coverage, accuracy, allTime: pct(c, n), answers: n, mastery: m, mastered: pool.length > 0 && m >= mastery() };
  }
  function allDomainStats() { return domIds().map(domainStats); }
  function readiness() {
    const ds = allDomainStats();
    const W = weights();
    const weighted = ds.reduce((a, s) => a + s.mastery * W[s.d], 0) / weightSum();
    return { ds, score: QS.length ? weighted : 0, masteredCount: ds.filter((s) => s.mastered).length, ready: QS.length > 0 && ds.length > 0 && ds.every((s) => s.mastered), hasBank: QS.length > 0 };
  }
  function overallStats() {
    const q = qs();
    const st = Object.entries(q.stats).filter(([id]) => !QS.length || QMAP.has(id)).map(([, s]) => s);
    const answers = st.reduce((a, s) => a + s.n, 0), correct = st.reduce((a, s) => a + s.c, 0);
    const done = q.attempts;
    return {
      total: QS.length,
      unique: st.filter((s) => s.n).length,
      answers, accuracy: pct(correct, answers),
      quizzes: done.length,
      avgScore: done.length ? done.reduce((a, t) => a + t.pct, 0) / done.length : 0,
    };
  }
  // Average of the most recent quizzes with 10+ questions (used by the readiness score).
  function recentAssessment(n = 3) {
    const list = qs().attempts.filter((t) => t.total >= 10).slice(-n);
    return { count: list.length, pct: list.length ? list.reduce((a, t) => a + t.pct, 0) / list.length : 0, titles: list.map((t) => t.title) };
  }
  function weakPool() {
    const st = qs().stats;
    return QS.filter((q) => st[q.id] && st[q.id].n > st[q.id].c)
      .sort((a, b) => (st[a.id].last - st[b.id].last) || ((st[a.id].c / st[a.id].n) - (st[b.id].c / st[b.id].n)));
  }
  function dailyStreak() {
    const d = qs().daily;
    let day = new Date();
    if (!d[toISO(day)]) { day = addDays(day, -1); if (!d[toISO(day)]) return 0; }
    let n = 0;
    while (d[toISO(day)]) { n++; day = addDays(day, -1); }
    return n;
  }
  function topicStats() {
    const st = qs().stats;
    const byTopic = {};
    QS.forEach((q) => {
      const s = st[q.id];
      if (!s || !s.n) return;
      const t = byTopic[q.topic] || (byTopic[q.topic] = { topic: q.topic, obj: q.obj, objs: new Set(), domain: q.domain, n: 0, c: 0, ref: q.ref, refUrl: q.refUrl, refTitle: q.refTitle });
      t.n += 1; t.c += s.last ? 1 : 0; if (q.obj) t.objs.add(q.obj);
    });
    return Object.values(byTopic);
  }
  function weakTopics(limit = 5) {
    return topicStats().filter((t) => t.n >= 1 && t.c / t.n < mastery() / 100)
      .sort((a, b) => a.c / a.n - b.c / b.n || b.n - a.n).slice(0, limit);
  }
  // Study recommendations based only on saved results.
  function studyRecommendations(limit = 3) {
    const recs = [];
    topicStats().filter((t) => t.n >= 2 && pct(t.c, t.n) < mastery())
      .sort((a, b) => a.c / a.n - b.c / b.n || b.n - a.n).slice(0, limit)
      .forEach((t) => {
        const objTexts = [...t.objs].map((o) => X().objectives[o]).filter(Boolean);
        const focus = objTexts.length ? objTexts[0].replace(/\.$/, '') : `the ${t.topic} material`;
        recs.push({
          kind: 'topic', topic: t.topic, pct: pct(t.c, t.n), n: t.n, obj: t.obj, ref: refOf(t),
          text: `You scored ${Math.round(pct(t.c, t.n))}% in ${t.topic} (${t.c} of ${t.n} on your latest attempts). Consider revisiting “${focus}” before attempting another assessment.`,
        });
      });
    if (recs.length < limit) {
      allDomainStats().filter((d) => d.seen >= 5 && d.accuracy < mastery()).sort((a, b) => a.accuracy - b.accuracy).slice(0, limit - recs.length).forEach((d) => {
        recs.push({ kind: 'domain', domain: d.d, pct: d.accuracy, n: d.seen, text: `Your accuracy in ${domLabel(d.d)} (${domShort(d.d)}) is ${Math.round(d.accuracy)}% across ${d.seen} questions. A domain quiz will show which topics to revisit.` });
      });
    }
    return recs;
  }

  // ---------------------------------------------------------------
  // Question selection
  // ---------------------------------------------------------------
  function pickBalanced(pool, n, rng = Math.random, useStats = true) {
    const st = qs().stats;
    const groups = {};
    pool.forEach((q) => (groups[q.obj || q.topic] = groups[q.obj || q.topic] || []).push(q));
    Object.keys(groups).forEach((k) => {
      const sh = shuffle(groups[k], rng);
      if (useStats) sh.sort((a, b) => ((st[a.id] && st[a.id].n) || 0) - ((st[b.id] && st[b.id].n) || 0));
      groups[k] = sh;
    });
    const keys = shuffle(Object.keys(groups), rng);
    const out = [];
    while (out.length < n && keys.some((k) => groups[k].length)) {
      for (const k of keys) if (groups[k].length && out.length < n) out.push(groups[k].shift());
    }
    return shuffle(out, rng);
  }
  function weightedCounts(n) {
    const W = weights(), sum = weightSum();
    const raw = domIds().map((d) => ({ d, v: (n * W[d]) / sum }));
    raw.forEach((r) => { r.f = Math.floor(r.v); r.rem = r.v - r.f; });
    let left = n - raw.reduce((a, r) => a + r.f, 0);
    raw.slice().sort((a, b) => b.rem - a.rem).forEach((r) => { if (left > 0) { r.f++; left--; } });
    return Object.fromEntries(raw.map((r) => [r.d, r.f]));
  }
  const diffFilter = (pool, diff) => (diff && diff !== 'all' ? pool.filter((q) => q.diff === diff) : pool);
  const firstDomain = () => (DOMS[0] ? DOMS[0].id : null);

  function selectQuestions(cfg) {
    const m = MODES[cfg.mode];
    if (cfg.mode === 'mock' || cfg.mode === 'final') {
      const counts = weightedCounts(m.count);
      return domIds().flatMap((d) => pickBalanced(QS.filter((q) => domOf(q) === d), counts[d]));
    }
    if (cfg.mode === 'daily') {
      const rng = seeded(`${seedKey()}-daily-${todayISO()}`);
      const counts = weightedCounts(5);
      return shuffle(domIds().flatMap((d) => shuffle(QS.filter((q) => domOf(q) === d), rng).slice(0, counts[d])), rng);
    }
    if (cfg.mode === 'domain') return pickBalanced(diffFilter(QS.filter((q) => domOf(q) === String(cfg.domain)), cfg.diff), m.count);
    if (cfg.mode === 'week') return pickBalanced(weekPool(cfg.week), m.count);
    if (cfg.mode === 'weak') return shuffle(diffFilter(weakPool(), cfg.diff).slice(0, m.count));
    if (cfg.mode === 'flagged') return shuffle(qs().flagged.map((id) => QMAP.get(id)).filter(Boolean)).slice(0, m.count);
    if (cfg.mode === 'retry') return shuffle((cfg.ids || []).map((id) => QMAP.get(id)).filter(Boolean));
    return pickBalanced(diffFilter(QS, cfg.diff), m.count);
  }

  function makeItem(q, rng = Math.random) {
    const it = { q: q.id };
    if (q.type === 'single' || q.type === 'multi') it.order = shuffle(range(q.opts.length), rng);
    else if (q.type === 'order') {
      let p; let guard = 0;
      do { p = shuffle(range(q.opts.length), rng); guard++; } while (p.every((v, i) => v === i) && guard < 20);
      it.init = p;
    } else if (q.type === 'match') it.rights = shuffle(range(q.pairs.length), rng);
    return it;
  }

  // Answers & scoring
  // ---------------------------------------------------------------
  function isAnswered(q, r) {
    if (r == null) return false;
    if (q.type === 'single' || q.type === 'multi') return r.length > 0;
    if (q.type === 'order') return Array.isArray(r) && r.length === q.opts.length;
    if (q.type === 'match') return Array.isArray(r) && r.length === q.pairs.length && r.every((v) => v >= 0);
    return false;
  }
  function isCorrect(q, r) {
    if (!isAnswered(q, r)) return false;
    if (q.type === 'single' || q.type === 'multi') return sameSet(r, q.ans);
    return r.every((v, i) => v === i); // order: original index sequence; match: chosen right index per left
  }
  function recordStat(qid, ok) {
    const st = qs().stats;
    const s = st[qid] || (st[qid] = { n: 0, c: 0, last: 0 });
    s.n++; s.c += ok ? 1 : 0; s.last = ok ? 1 : 0; s.at = todayISO();
  }

  // ---------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------
  function startSession(cfg) {
    const m = MODES[cfg.mode];
    const qList = selectQuestions(cfg);
    if (!qList.length) {
      toast(cfg.mode === 'weak' ? 'No incorrect answers yet. Take a quiz first.' : cfg.mode === 'flagged' ? 'No bookmarked questions yet.' : 'No questions match those filters.', { icon: 'x' });
      return;
    }
    const exam = m.examOnly ? true : m.practiceOnly ? false : !!cfg.exam;
    const rng = cfg.mode === 'daily' ? seeded(`${seedKey()}-daily-items-${todayISO()}`) : Math.random;
    const title = cfg.mode === 'domain' ? `${domLabel(cfg.domain)}: ${domShort(cfg.domain)}`
      : cfg.mode === 'week' ? `Week ${cfg.week} revision assessment` : m.title;
    qs().active = {
      id: A.uid(), cert: A.cert.id, mode: cfg.mode, title, exam, diff: cfg.diff || 'all', domain: cfg.domain != null ? String(cfg.domain) : null, week: cfg.week || null,
      startedAt: Date.now(), limitSec: exam && m.minutes ? Math.round((m.minutes * qList.length) / m.count) * 60 : null,
      items: qList.map((q) => makeItem(q, rng)), idx: 0, resp: {}, submitted: {}, counted: {}, flags: [],
    };
    A.save(true);
    let adopt = false;
    if (A.isSheetOpen()) { A.closeSheet(true); adopt = true; } // reuse the sheet's history entry (no back/push race)
    openPlayer(adopt);
  }

  function finishSession(reason) {
    const q = qs();
    const s = q.active;
    if (!s) return;
    const durationSec = Math.round((Date.now() - s.startedAt) / 1000);
    const items = s.items.map((it, i) => {
      const qq = QMAP.get(it.q);
      const r = s.resp[i] != null ? s.resp[i] : null;
      const ok = isCorrect(qq, r);
      if (isAnswered(qq, r) && !s.counted[i]) recordStat(it.q, ok);
      return { q: it.q, ok: ok ? 1 : 0, r, a: isAnswered(qq, r) ? 1 : 0 };
    });
    const correct = items.filter((x) => x.ok).length;
    const byDomain = {}, byDiff = {};
    items.forEach((x) => {
      const qq = QMAP.get(x.q);
      const d = domOf(qq);
      (byDomain[d] = byDomain[d] || [0, 0])[1]++; if (x.ok) byDomain[d][0]++;
      (byDiff[qq.diff] = byDiff[qq.diff] || [0, 0])[1]++; if (x.ok) byDiff[qq.diff][0]++;
    });
    const attempt = {
      id: s.id, cert: s.cert || (A.cert && A.cert.id), mode: s.mode, title: s.title, exam: s.exam, week: s.week, domain: s.domain,
      date: new Date().toISOString(), durationSec, total: items.length, correct, pct: Math.round(pct(correct, items.length) * 10) / 10,
      byDomain, byDiff, items, reason: reason || 'finished',
    };
    q.attempts.push(attempt);
    if (q.attempts.length > 200) q.attempts.splice(0, q.attempts.length - 200);
    if (s.mode === 'daily') q.daily[todayISO()] = { pct: attempt.pct };
    if (s.mode === 'week' && s.week) {
      q.weekBest[s.week] = Math.max(q.weekBest[s.week] || 0, attempt.pct);
      const wk = A.state.weeks[s.week - 1];
      if (wk) { wk.assessmentScore = Math.round(attempt.pct); wk.revision = 'done'; }
    }
    q.active = null;
    A.logActivity({ min: durationSec / 60 });
    A.save(true);
    showResults(attempt.id, true);
    A.checkAchievements();
    if ((s.mode === 'mock' || s.mode === 'final') && attempt.pct >= mastery()) {
      A.celebrate(s.mode === 'final' ? 'Final assessment passed' : 'Mock exam passed', `${Math.round(attempt.pct)}% — above your ${mastery()}% target.`);
    }
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // Player (full-screen overlay)
  // ---------------------------------------------------------------
  const P = { el: null, mode: null /* 'quiz' | 'results' */, attemptId: null, hasHistory: false, tick: null, filter: 'wrong' };

  function claimHistory(adopt) {
    if (P.hasHistory) return;
    if (adopt) history.replaceState({ quizPlayer: true }, ''); else history.pushState({ quizPlayer: true }, '');
    P.hasHistory = true;
  }
  function openPlayer(adopt = false) {
    if (!activeOk()) { toast('This quiz can\'t be resumed because its questions are no longer in the bank.', { icon: 'x' }); qs().active = null; A.save(); A.renderCurrent(); return; }
    P.el = document.getElementById('quiz-player');
    P.mode = 'quiz';
    P.el.hidden = false;
    document.body.classList.add('sheet-open');
    claimHistory(adopt);
    renderPlayer();
    startTick();
  }
  function closePlayer(fromPop = false) {
    if (!P.el) return;
    P.el.hidden = true;
    P.el.innerHTML = '';
    document.body.classList.remove('sheet-open');
    stopTick();
    if (P.hasHistory && !fromPop) { P.hasHistory = false; history.back(); } else P.hasHistory = false;
    P.mode = null;
    A.renderCurrent();
  }
  window.addEventListener('popstate', async () => {
    if (!P.el || P.el.hidden) return;
    if (history.state && history.state.quizPlayer) return; // a sheet above the player was closed; still inside the player
    P.hasHistory = false;
    if (P.mode === 'results') { closePlayer(true); return; }
    history.pushState({ quizPlayer: true }, ''); P.hasHistory = true;
    const ok = await confirmDialog({ title: 'Leave this quiz?', body: 'Your answers are saved. You can resume from the Quiz Centre, but an exam timer keeps running.', ok: 'Leave', cancel: 'Stay' });
    if (ok) closePlayer();
  });

  function remainingSec(s) { return s.limitSec ? s.limitSec - (Date.now() - s.startedAt) / 1000 : null; }
  function startTick() {
    stopTick();
    P.tick = setInterval(() => {
      const s = qs().active;
      if (!s || P.mode !== 'quiz') return;
      const el = P.el && P.el.querySelector('[data-qx-timer]');
      if (s.limitSec) {
        const rem = remainingSec(s);
        if (el) { el.textContent = fmtMS(rem); el.classList.toggle('low', rem < 300); }
        if (rem <= 0) { stopTick(); toast('Time is up — your exam has been submitted.', { icon: 'clock' }); finishSession('timeout'); }
      } else if (el) el.textContent = fmtMS((Date.now() - s.startedAt) / 1000);
    }, 1000);
  }
  function stopTick() { if (P.tick) clearInterval(P.tick); P.tick = null; }

  function chipRow(q) {
    return `<div class="qx-chips">
      <span class="chip blue">${esc(domLabel(domOf(q)))}</span>
      ${q.obj ? `<span class="chip">${esc(q.obj)}</span>` : `<span class="chip">${esc(q.topic)}</span>`}
      <span class="chip ${q.diff === 'advanced' ? 'red' : q.diff === 'intermediate' ? 'amber' : 'teal'}">${DIFF_LABEL[q.diff]}</span>
      <span class="chip violet">${TYPE_LABEL[q.type]}${q.scenario ? ' · Scenario' : ''}</span>
    </div>`;
  }
  function instruction(q) {
    if (q.type === 'multi') return `Select ${q.ans.length === 2 ? 'two' : q.ans.length === 3 ? 'three' : q.ans.length} answers.`;
    if (q.type === 'single') return 'Select one answer.';
    if (q.type === 'order') return 'Use the arrows to put the steps in the correct order.';
    return 'Choose the matching item for each row.';
  }

  function optionsHTML(q, it, r, reveal, readOnly) {
    if (q.type === 'single' || q.type === 'multi') {
      const order = it && it.order ? it.order : range(q.opts.length);
      const sel = r || [];
      return `<div class="qx-opts ${q.type}" role="${q.type === 'single' ? 'radiogroup' : 'group'}">${order.map((oi, pos) => {
        const picked = sel.includes(oi), right = q.ans.includes(oi);
        let cls = picked ? ' selected' : '';
        if (reveal) cls += right ? ' correct' : picked ? ' wrong' : '';
        if (reveal && right && !picked) cls += ' missed';
        const mark = reveal ? (right ? icon('check') : picked ? icon('x') : '') : '';
        return `<button class="qx-opt${cls}" ${readOnly ? 'disabled' : ''} data-qa="select" data-i="${oi}" role="${q.type === 'single' ? 'radio' : 'checkbox'}" aria-checked="${picked}">
          <span class="qx-key">${LETTERS[pos]}</span><span class="qx-txt">${esc(q.opts[oi])}</span><span class="qx-mark">${mark}</span></button>`;
      }).join('')}</div>`;
    }
    if (q.type === 'order') {
      const cur = r || (it && it.init) || range(q.opts.length);
      return `<ol class="qx-order">${cur.map((oi, pos) => {
        const cls = reveal ? (oi === pos ? ' correct' : ' wrong') : '';
        return `<li class="qx-ord${cls}"><span class="qx-num">${pos + 1}</span><span class="qx-txt">${esc(q.opts[oi])}</span>
          ${readOnly ? (reveal ? `<span class="qx-mark">${oi === pos ? icon('check') : icon('x')}</span>` : '') : `
          <button class="mini-btn up" data-qa="move" data-pos="${pos}" data-dir="-1" aria-label="Move up" ${pos === 0 ? 'disabled' : ''}>${icon('chevron')}</button>
          <button class="mini-btn down" data-qa="move" data-pos="${pos}" data-dir="1" aria-label="Move down" ${pos === cur.length - 1 ? 'disabled' : ''}>${icon('chevron')}</button>`}
        </li>`;
      }).join('')}</ol>`;
    }
    // match
    const rights = it && it.rights ? it.rights : range(q.pairs.length);
    const cur = r || q.pairs.map(() => -1);
    return `<div class="qx-match">${q.pairs.map((p, i) => {
      const cls = reveal ? (cur[i] === i ? ' correct' : ' wrong') : '';
      return `<div class="qx-mrow${cls}"><div class="qx-left">${esc(p[0])}</div>
        <select class="select" data-qa-change="match" data-i="${i}" ${readOnly ? 'disabled' : ''} aria-label="Match for ${esc(p[0])}">
          <option value="-1">Choose…</option>
          ${rights.map((ri) => `<option value="${ri}" ${cur[i] === ri ? 'selected' : ''}>${esc(q.pairs[ri][1])}</option>`).join('')}
        </select>${reveal ? `<span class="qx-mark">${cur[i] === i ? icon('check') : icon('x')}</span>` : ''}</div>`;
    }).join('')}</div>`;
  }

  function explanationHTML(q, r) {
    const ok = isCorrect(q, r);
    const ref = refOf(q);
    let correct = '';
    if (q.type === 'single' || q.type === 'multi') correct = `<ul class="qx-list ok">${q.ans.map((i) => `<li>${esc(q.opts[i])}</li>`).join('')}</ul>`;
    else if (q.type === 'order') correct = `<ol class="qx-list ok">${q.opts.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>`;
    else correct = `<ul class="qx-list ok">${q.pairs.map((p) => `<li><strong>${esc(p[0])}</strong> → ${esc(p[1])}</li>`).join('')}</ul>`;
    const wrongs = (q.type === 'single' || q.type === 'multi') && Array.isArray(q.why)
      ? q.opts.map((o, i) => (q.ans.includes(i) ? '' : `<li><span class="qx-wopt">${esc(o)}</span><span class="qx-why">${esc(q.why[i] || '')}</span></li>`)).join('')
      : '';
    return `<div class="qx-explain ${ok ? 'ok' : 'bad'}">
      <div class="qx-verdict">${ok ? `${icon('check')} Correct` : isAnswered(q, r) ? `${icon('x')} Incorrect` : `${icon('x')} Not answered`}</div>
      <div class="qx-sec"><h4>Correct answer</h4>${correct}</div>
      ${q.exp ? `<div class="qx-sec"><h4>Why this is correct</h4><p>${esc(q.exp)}</p></div>` : ''}
      ${wrongs ? `<div class="qx-sec"><h4>Why the other options are wrong</h4><ul class="qx-wrongs">${wrongs}</ul></div>` : ''}
      <div class="qx-sec qx-meta">
        ${q.feat ? `<div><span class="k">Technology</span><span>${esc(q.feat)}</span></div>` : ''}
        ${q.obj ? `<div><span class="k">Exam objective</span><span>${esc(q.obj)}${X().objectives[q.obj] ? ` · ${esc(X().objectives[q.obj])}` : ''}</span></div>` : `<div><span class="k">Topic</span><span>${esc(q.topic)}</span></div>`}
        ${sectionOf(q.obj) ? `<div><span class="k">Section</span><span>${esc(sectionOf(q.obj))}</span></div>` : ''}
      </div>
      ${ref ? `<a class="btn btn-sm qx-learn" href="${esc(ref.url)}" target="_blank" rel="noopener">${icon('external')} ${esc(refLabel(ref))}</a>` : ''}
    </div>`;
  }

  function renderPlayer() {
    if (P.mode === 'results') return renderResults();
    const s = qs().active;
    if (!s) { closePlayer(); return; }
    const total = s.items.length;
    s.idx = clamp(s.idx, 0, total - 1);
    const it = s.items[s.idx];
    const q = QMAP.get(it.q);
    const r = s.resp[s.idx] != null ? s.resp[s.idx] : null;
    const submitted = !!s.submitted[s.idx];
    const reveal = !s.exam && submitted;
    const answeredCount = s.items.filter((x, i) => isAnswered(QMAP.get(x.q), s.resp[i])).length;
    const flagged = s.flags.includes(s.idx);
    const isLast = s.idx === total - 1;
    const rem = remainingSec(s);
    let primary;
    if (s.exam) primary = isLast ? `<button class="btn btn-primary" data-qa="finish">Finish exam</button>` : `<button class="btn btn-primary" data-qa="next">Next ${icon('chevron')}</button>`;
    else if (!submitted) primary = `<button class="btn btn-primary" data-qa="submit" ${isAnswered(q, r) ? '' : 'disabled'}>Submit answer</button>`;
    else primary = isLast ? `<button class="btn btn-primary" data-qa="finish">See results</button>` : `<button class="btn btn-primary" data-qa="next">Next question ${icon('chevron')}</button>`;

    P.el.innerHTML = `
      <div class="qx-top">
        <button class="icon-btn" data-qa="close" aria-label="Close quiz">${icon('x')}</button>
        <div class="qx-title"><div class="eyebrow">${esc(s.exam ? 'Exam mode' : 'Practice mode')}</div><div class="t">${esc(s.title)}</div></div>
        <div class="qx-timer ${s.limitSec ? 'count' : ''} ${rem != null && rem < 300 ? 'low' : ''}">${icon('clock')}<span data-qx-timer class="num">${s.limitSec ? fmtMS(rem) : fmtMS((Date.now() - s.startedAt) / 1000)}</span></div>
      </div>
      <div class="qx-progress"><div class="qx-pbar"><span style="width:${((s.idx + 1) / total) * 100}%"></span></div>
        <div class="qx-pmeta"><span class="num">Question ${s.idx + 1} of ${total}</span><span class="num">${answeredCount} answered${s.flags.length ? ` · ${s.flags.length} bookmarked` : ''}</span></div></div>
      <div class="qx-body" id="qx-body">
        ${chipRow(q)}
        <div class="qx-q">${esc(q.q)}</div>
        <div class="qx-hint">${instruction(q)}</div>
        ${optionsHTML(q, it, r, reveal, reveal)}
        ${reveal ? explanationHTML(q, r) : ''}
      </div>
      <div class="qx-foot">
        <button class="icon-btn" data-qa="prev" aria-label="Previous question" ${s.idx === 0 ? 'disabled' : ''}>${icon('chevron', 'flip')}</button>
        <button class="icon-btn ${flagged ? 'flag-on' : ''}" data-qa="flag" aria-label="${flagged ? 'Remove bookmark' : 'Bookmark for revision'}" aria-pressed="${flagged}">${icon('bookmark')}</button>
        <button class="icon-btn" data-qa="nav" aria-label="All questions">${icon('dashboard')}</button>
        ${primary}
        ${s.exam && !isLast ? `<button class="btn btn-ghost btn-sm qx-finish-sm" data-qa="finish">Finish</button>` : ''}
      </div>`;
    const body = document.getElementById('qx-body');
    if (body) body.scrollTop = 0;
  }

  function navigatorSheet() {
    const s = qs().active;
    if (!s) return;
    A.openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${esc(s.title)}</div><h2>Questions</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <div class="qx-navgrid">${s.items.map((it, i) => {
        const q = QMAP.get(it.q);
        const ans = isAnswered(q, s.resp[i]);
        const res = !s.exam && s.submitted[i] ? (isCorrect(q, s.resp[i]) ? ' ok' : ' bad') : '';
        return `<button class="qx-navcell${ans ? ' answered' : ''}${s.flags.includes(i) ? ' flagged' : ''}${i === s.idx ? ' current' : ''}${res}" data-qa="goto" data-i="${i}">${i + 1}</button>`;
      }).join('')}</div>
      <div class="cd-legend"><span><i style="background:var(--accent)"></i>Answered</span><span><i style="background:var(--amber)"></i>Bookmarked</span><span><i style="border:1.5px solid var(--text)"></i>Current</span></div>
      <button class="btn btn-primary btn-block" style="margin-top:18px" data-qa="finish">${s.exam ? 'Finish exam' : 'Finish and see results'}</button>`);
  }

  async function confirmFinish() {
    const s = qs().active;
    if (!s) return;
    const unanswered = s.items.filter((it, i) => !isAnswered(QMAP.get(it.q), s.resp[i])).length;
    const body = `${unanswered ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered and will be marked incorrect. ` : 'All questions are answered. '}${s.flags.length ? `${s.flags.length} flagged for review. ` : ''}${s.exam ? 'You can\'t change answers after submitting.' : ''}`;
    const ok = await confirmDialog({ title: s.exam ? 'Submit your exam?' : 'Finish this quiz?', body, ok: s.exam ? 'Submit exam' : 'Finish' });
    if (ok) { if (A.isSheetOpen()) A.closeSheet(); finishSession(); }
  }

  // ---------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------
  function showResults(attemptId, fresh = false) {
    P.el = document.getElementById('quiz-player');
    P.mode = 'results';
    P.attemptId = attemptId;
    P.filter = 'wrong';
    P.el.hidden = false;
    document.body.classList.add('sheet-open');
    stopTick();
    claimHistory(false);
    renderResults(fresh);
  }

  function renderResults(keepScroll = false) {
    const prevBody = keepScroll && P.el.querySelector('.qx-body');
    const prevScroll = prevBody ? prevBody.scrollTop : 0;
    const t = qs().attempts.find((a) => a.id === P.attemptId);
    if (!t) { closePlayer(); return; }
    const pass = t.pct >= mastery();
    const wrong = t.items.filter((x) => !x.ok);
    const topics = {};
    wrong.forEach((x) => { const q = QMAP.get(x.q); if (!q) return; const k = q.topic; (topics[k] = topics[k] || { topic: k, obj: q.obj, n: 0, ref: q.ref, refUrl: q.refUrl, refTitle: q.refTitle }).n++; });
    const recs = Object.values(topics).sort((a, b) => b.n - a.n).slice(0, 6);
    const list = P.filter === 'wrong' ? t.items.map((x, i) => [x, i]).filter(([x]) => !x.ok) : t.items.map((x, i) => [x, i]);
    P.el.innerHTML = `
      <div class="qx-top">
        <button class="icon-btn" data-qa="close" aria-label="Close results">${icon('x')}</button>
        <div class="qx-title"><div class="eyebrow">Results · ${esc(A.fmtDate(t.date.slice(0, 10)))}</div><div class="t">${esc(t.title)}</div></div>
        <div></div>
      </div>
      <div class="qx-body qx-results">
        <div class="card hero">
          <div class="ring-wrap">${A.ring(t.pct, 112, 10, 'resGrad')}<div class="ring-label"><span class="ring-value num">${Math.round(t.pct)}%</span><span class="ring-caption">score</span></div></div>
          <div class="hero-text">
            <div class="phase" style="color:${pass ? 'var(--teal)' : 'var(--amber)'}">${pass ? `At or above your ${mastery()}% target` : `${Math.round(mastery() - t.pct)} points below your ${mastery()}% target`}</div>
            <p class="motivation">${pass ? 'Strong result. Keep reviewing the explanations to lock it in.' : 'Review the incorrect answers below, then try a Weak Areas quiz.'}</p>
          </div>
        </div>
        <div class="quiz-summary" style="margin-top:12px">
          <div class="wc-stat"><div class="k">Correct</div><div class="v num" style="color:var(--teal)">${t.correct}</div></div>
          <div class="wc-stat"><div class="k">Incorrect</div><div class="v num" style="color:var(--red)">${t.total - t.correct}</div></div>
          <div class="wc-stat"><div class="k">Time taken</div><div class="v num">${fmtDur(t.durationSec)}</div></div>
        </div>
        ${t.reason === 'timeout' ? '<div class="callout">Submitted automatically when the timer ran out.</div>' : ''}

        <div class="section-title">Performance by domain</div>
        <div class="card week-bars">${domIds().filter((d) => t.byDomain[d]).map((d) => {
          const [c, n] = t.byDomain[d]; const p = pct(c, n);
          return `<div class="week-bar-row"><div class="row-top"><span class="label">${esc(domLabel(d))} <span class="muted">· ${esc(domShort(d))}</span></span><span class="val num">${c}/${n} · ${Math.round(p)}%</span></div>${bar(p, p >= mastery() ? 'teal' : p >= 60 ? '' : 'amber')}</div>`;
        }).join('')}</div>

        <div class="section-title">Performance by difficulty</div>
        <div class="card week-bars">${['easy', 'intermediate', 'advanced'].filter((d) => t.byDiff[d]).map((d) => {
          const [c, n] = t.byDiff[d]; const p = pct(c, n);
          return `<div class="week-bar-row"><div class="row-top"><span class="label">${DIFF_LABEL[d]}</span><span class="val num">${c}/${n} · ${Math.round(p)}%</span></div>${bar(p, p >= mastery() ? 'teal' : p >= 60 ? '' : 'amber')}</div>`;
        }).join('')}</div>

        ${recs.length ? `<div class="section-title">Recommended for revision</div>
        <div class="card">${recs.map((r) => { const ref = refOf(r); return `<div class="qx-rec"><div><div class="t">${esc(r.topic)}</div><div class="tiny muted">${esc(r.obj)} · ${esc(X().objectives[r.obj] || '')}</div></div>${ref ? `<a class="mini-btn" href="${esc(ref.url)}" target="_blank" rel="noopener" aria-label="Open reference">${icon('external')}</a>` : ''}</div>`; }).join('')}</div>` : ''}

        <div class="section-title">Review answers
          <span class="qx-filter"><button class="${P.filter === 'wrong' ? 'on' : ''}" data-qa="rfilter" data-f="wrong">Incorrect (${wrong.length})</button><button class="${P.filter === 'all' ? 'on' : ''}" data-qa="rfilter" data-f="all">All (${t.total})</button></span></div>
        ${list.length ? list.map(([x, i]) => {
          const q = QMAP.get(x.q);
          if (!q) return '';
          return `<details class="qx-review ${x.ok ? 'ok' : 'bad'}" data-i="${i}"><summary><span class="qx-rn num">${i + 1}</span><span class="qx-rv">${x.ok ? icon('check') : icon('x')}</span><span class="qx-rq">${esc(q.q)}</span></summary>
            <div class="qx-rbody"><div class="qx-rtools">${chipRow(q)}<button class="mini-btn ${qs().flagged.includes(q.id) ? 'flag-on' : ''}" data-qa="bm" data-q="${esc(q.id)}" aria-label="${qs().flagged.includes(q.id) ? 'Remove bookmark' : 'Bookmark question'}">${icon('bookmark')}</button></div><div class="qx-q small-q">${esc(q.q)}</div>${optionsHTML(q, null, x.r, true, true)}${explanationHTML(q, x.r)}</div></details>`;
        }).join('') : '<div class="card empty">Nothing to review here. Every answer was correct.</div>'}

        <div class="btn-row" style="margin-top:18px">
          ${wrong.length ? `<button class="btn" data-qa="retry" data-id="${t.id}">${icon('refresh')} Retry incorrect</button>` : ''}
          <button class="btn btn-primary" data-qa="close">Back to Quiz Centre</button>
        </div>
      </div>`;
    const body = P.el.querySelector('.qx-body');
    if (body) body.scrollTop = prevScroll;
  }

  // ---------------------------------------------------------------
  // Player events
  // ---------------------------------------------------------------
  function onPlayerClick(e) {
    const el = e.target.closest('[data-qa]');
    if (!el) return;
    const act = el.dataset.qa;
    const s = qs().active;
    if (act === 'close') {
      if (P.mode === 'results' || !s) return closePlayer();
      confirmDialog({ title: 'Leave this quiz?', body: 'Your answers are saved. You can resume from the Quiz Centre, but an exam timer keeps running.', ok: 'Leave', cancel: 'Stay' }).then((ok) => ok && closePlayer());
      return;
    }
    if (act === 'rfilter') { P.filter = el.dataset.f; renderResults(); return; }
    if (act === 'bm') { toggleBookmark(el.dataset.q); const open = [...P.el.querySelectorAll('details[open]')].map((d) => d.dataset.i); renderResults(true); open.forEach((i) => { const d = P.el.querySelector(`details[data-i="${i}"]`); if (d) d.open = true; }); return; }
    if (act === 'retry') {
      const t = qs().attempts.find((a) => a.id === el.dataset.id);
      if (!t) return;
      P.mode = 'quiz';
      startSession({ mode: 'retry', ids: t.items.filter((x) => !x.ok).map((x) => x.q), exam: false });
      return;
    }
    if (!s) return;
    const it = s.items[s.idx];
    const q = QMAP.get(it.q);
    const locked = !s.exam && s.submitted[s.idx];
    if (act === 'select' && !locked) {
      const i = Number(el.dataset.i);
      let r = (s.resp[s.idx] || []).slice();
      if (q.type === 'single') r = [i];
      else r = r.includes(i) ? r.filter((x) => x !== i) : [...r, i];
      s.resp[s.idx] = r;
    } else if (act === 'move' && !locked) {
      const cur = (s.resp[s.idx] || it.init).slice();
      const pos = Number(el.dataset.pos), to = pos + Number(el.dataset.dir);
      if (to < 0 || to >= cur.length) return;
      [cur[pos], cur[to]] = [cur[to], cur[pos]];
      s.resp[s.idx] = cur;
    } else if (act === 'submit') {
      if (!isAnswered(q, s.resp[s.idx])) return;
      s.submitted[s.idx] = true;
      if (!s.counted[s.idx]) { recordStat(it.q, isCorrect(q, s.resp[s.idx])); s.counted[s.idx] = true; }
      if (navigator.vibrate) navigator.vibrate(isCorrect(q, s.resp[s.idx]) ? 10 : [20, 40, 20]);
    } else if (act === 'next') s.idx = Math.min(s.items.length - 1, s.idx + 1);
    else if (act === 'prev') s.idx = Math.max(0, s.idx - 1);
    else if (act === 'flag') {
      s.flags = s.flags.includes(s.idx) ? s.flags.filter((x) => x !== s.idx) : [...s.flags, s.idx];
      const f = qs().flagged;
      if (s.flags.includes(s.idx)) { if (!f.includes(it.q)) f.push(it.q); toast('Bookmarked for revision', { icon: 'bookmark', ms: 1400 }); }
      else qs().flagged = f.filter((x) => x !== it.q);
    } else if (act === 'nav') { A.save(); navigatorSheet(); return; }
    else if (act === 'goto') { s.idx = Number(el.dataset.i); A.closeSheet(); }
    else if (act === 'finish') { A.save(true); confirmFinish(); return; }
    else return;
    A.save();
    renderPlayer();
  }
  function onPlayerChange(e) {
    const el = e.target.closest('[data-qa-change="match"]');
    if (!el) return;
    const s = qs().active;
    if (!s) return;
    const q = QMAP.get(s.items[s.idx].q);
    if (!s.exam && s.submitted[s.idx]) return;
    const cur = (s.resp[s.idx] || q.pairs.map(() => -1)).slice();
    cur[Number(el.dataset.i)] = Number(el.value);
    s.resp[s.idx] = cur;
    A.save();
    renderPlayer();
  }

  function toggleBookmark(id) {
    const q = qs();
    if (q.flagged.includes(id)) { q.flagged = q.flagged.filter((x) => x !== id); toast('Bookmark removed', { icon: 'bookmark', ms: 1200 }); }
    else { q.flagged.push(id); toast('Bookmarked for revision', { icon: 'bookmark', ms: 1200 }); }
    A.save();
  }

  // ---------------------------------------------------------------
  // Programme integration (study plan weeks)
  // ---------------------------------------------------------------
  function programmeContext(o) {
    const q = qs();
    const recs = [];
    if (!o) return { weekRecs: recs, finalUnlocked: false };
    const W = o.W;
    if (o.phase !== 'before' && hasWeekQuizzes()) {
      const lastWeek = o.phase === 'after' ? W : o.currentWeek;
      for (let w = 1; w <= lastWeek; w++) {
        if (!weekPool(w).length) continue;
        const endOfWeek = o.phase === 'after' || o.dayNo >= w * 7 - 1; // Day 6 of week w onwards
        const ss = A.state.sessions.filter((s) => s.week === w);
        const sessionsDone = ss.length > 0 && ss.every((s) => s.status !== 'pending');
        if ((endOfWeek || sessionsDone) && !(q.weekBest[w] >= mastery())) recs.push(w);
      }
    }
    const lastSessions = A.state.sessions.filter((s) => s.week === W);
    const finalUnlocked = o.phase === 'after' || o.dayNo >= W * 7 - 1 || (lastSessions.length > 0 && lastSessions.every((s) => s.status !== 'pending'));
    return { weekRecs: recs, finalUnlocked };
  }

  function recommendation(o) {
    const q = qs();
    if (!QS.length) return null;
    if (activeOk()) return { title: `Resume: ${q.active.title}`, why: 'You have a quiz in progress.', action: 'resume' };
    const ds = allDomainStats();
    const ctx = programmeContext(o);
    if (ctx.weekRecs.length) {
      const w = ctx.weekRecs[0];
      return { title: `Week ${w} revision assessment`, why: `Week ${w} of your study programme is wrapping up. Check those topics before moving on.`, action: 'week', week: w };
    }
    const thin = ds.filter((d) => d.seen < Math.min(10, d.total)).sort((a, b) => a.seen - b.seen)[0];
    if (thin) return { title: `${domLabel(thin.d)} quiz`, why: `You've answered only ${thin.seen} of ${thin.total} questions in ${domShort(thin.d)}. Build coverage first.`, action: 'domain', domain: thin.d };
    const weak = weakPool();
    if (weak.length >= 5) return { title: 'Weak Areas quiz', why: `${weak.length} questions you've missed before are waiting for another attempt.`, action: 'weak' };
    const low = ds.filter((d) => !d.mastered).sort((a, b) => a.mastery - b.mastery)[0];
    if (low) return { title: `${domLabel(low.d)} quiz`, why: `${domShort(low.d)} is your weakest domain at ${Math.round(low.mastery)}% mastery.`, action: 'domain', domain: low.d };
    return { title: 'Full Mock Exam', why: 'All domains are at mastery. Test yourself under exam conditions.', action: 'mock' };
  }

  // ---------------------------------------------------------------
  // Charts & small components
  // ---------------------------------------------------------------
  function historyChart(attempts) {
    const pts = attempts.slice(-20);
    if (pts.length < 1) return A.emptyState('target', 'No quizzes yet', 'Complete a quiz to see your performance over time.');
    const W = 640, H = 180, L = 30, R = 10, T = 12, Bm = 22, iw = W - L - R, ih = H - T - Bm;
    const y = (p) => T + ih * (1 - clamp(p, 0, 100) / 100);
    const n = pts.length;
    const x = (i) => (n === 1 ? L + iw / 2 : L + (iw * i) / (n - 1));
    const P2 = pts.map((a, i) => [x(i), y(a.pct)]);
    const line = P2.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const grid = [0, 50, 100].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${g}</text>`).join('');
    const lab = [0, n - 1].filter((v, i, arr) => arr.indexOf(v) === i).map((i) => `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}">${A.fmtDate(pts[i].date.slice(0, 10), { day: 'numeric', month: 'short' })}</text>`).join('');
    const M = mastery();
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quiz scores over time">
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(M)}" y2="${y(M)}" class="target-line"/>
      <text class="axis target" x="${W - R}" y="${y(M) - 5}" text-anchor="end">${M}% target</text>
      ${n > 1 ? `<path d="${line}" class="series"/>` : ''}
      ${P2.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" class="${pts[i].pct >= M ? 'pt-pass' : 'pt-fail'}"><title>${esc(pts[i].title)}: ${Math.round(pts[i].pct)}%</title></circle>`).join('')}
      ${lab}
    </svg>`;
  }
  function masteryBar(m) {
    return `<div class="qx-mbar"><div class="bar ${m >= mastery() ? 'teal' : ''}"><span style="width:${clamp(m, 0, 100).toFixed(1)}%"></span></div><i style="left:${mastery()}%"></i></div>`;
  }
  function domainRows(ds, { compact = false } = {}) {
    return ds.map((d) => {
      const dom = domById(d.d) || {};
      return `<div class="dom-row ${compact ? 'compact' : ''}">
        <div class="dom-top">
          <div class="dom-name"><span class="dom-k">${esc(domLabel(d.d))}${dom.weight ? ` · ${dom.weight[0]}–${dom.weight[1]}%` : ''}</span><span class="dom-t">${esc(compact ? dom.short : dom.title)}</span></div>
          <div class="dom-v num">${d.mastered ? `<span class="chip teal">${icon('check')}${Math.round(d.mastery)}%</span>` : `${Math.round(d.mastery)}%`}</div>
        </div>
        ${masteryBar(d.mastery)}
        ${compact ? '' : `<div class="dom-meta"><span>Accuracy <strong class="num">${d.seen ? Math.round(d.accuracy) + '%' : '—'}</strong></span><span>Coverage <strong class="num">${d.seen}/${d.total}</strong></span><span>All-time <strong class="num">${d.answers ? Math.round(d.allTime) + '%' : '—'}</strong></span>
          <button class="link-btn" data-qc="start" data-mode="domain" data-domain="${esc(d.d)}">Practise ${icon('chevron')}</button></div>`}
      </div>`;
    }).join('');
  }
  function noBankState() {
    const c = A.cert;
    return A.emptyState('book', `No questions for ${c ? c.code : 'this certification'} yet`,
      'Each certification has its own question bank. Import a bank someone shared, add questions yourself, or download the template to write your own in JSON.',
      `<button class="btn btn-primary" data-action="import-bank">${icon('upload')} Import question bank</button><button class="btn" data-action="add-question">${icon('plus')} Add a question</button><button class="btn btn-ghost" data-action="bank-template">${icon('download')} Template</button>`);
  }

  // ---------------------------------------------------------------
  // Quiz Centre view
  // ---------------------------------------------------------------
  let showAllHistory = false;
  function renderQuizView(o) {
    const el = document.getElementById('view-quiz');
    const c = A.cert;
    if (!c) { el.innerHTML = `<div class="panel">${A.emptyState('cert', 'No active certification', 'Choose a certification to open its Quiz Centre.', `<button class="btn btn-primary" data-action="goto" data-view="certs">My Certifications</button>`)}</div>`; return; }
    if (!QS.length) { el.innerHTML = `<div class="panel">${noBankState()}</div>`; return; }
    const q = qs();
    const st = overallStats();
    const rd = readiness();
    const ds = rd.ds;
    const attempted = ds.filter((d) => d.seen >= 5);
    const strongest = attempted.length ? attempted.slice().sort((a, b) => b.accuracy - a.accuracy)[0] : null;
    const weakest = attempted.length > 1 ? attempted.slice().sort((a, b) => a.accuracy - b.accuracy)[0] : null;
    const rec = recommendation(o);
    const ctx = programmeContext(o);
    const dailyDone = q.daily[todayISO()];
    const streak = dailyStreak();
    const hist = q.attempts.slice().reverse();
    const shown = showAllHistory ? hist : hist.slice(0, 6);
    const M = mastery();
    const wt = weakTopics();
    const modeTile = (k, extra = '', locked = false, lockMsg = '') => {
      const m = MODES[k];
      return `<button class="mode-tile ${locked ? 'locked' : ''}" data-qc="${locked ? 'locked' : 'start'}" data-mode="${k}" ${lockMsg ? `data-msg="${esc(lockMsg)}"` : ''}>
        <span class="mt-ic">${icon(locked ? 'x' : m.icon)}</span><span class="mt-t">${m.title}</span><span class="mt-d">${locked ? esc(lockMsg) : m.desc}${extra}</span></button>`;
    };

    el.innerHTML = `
      ${q.active && activeOk() ? `<div class="banner">${icon('clock')}
        <div class="txt"><strong>${esc(q.active.title)}</strong>In progress · question ${q.active.idx + 1} of ${q.active.items.length}${q.active.limitSec ? ` · ${fmtMS(remainingSec(q.active))} left` : ''}</div>
        <button class="btn btn-sm btn-primary" data-qc="resume">Resume</button></div>` : ''}
      <div class="qc-grid">
        <section class="panel qc-hero span-2">
          <div class="ring-wrap">${A.ring(rd.score, 124, 11, 'qcGrad')}<div class="ring-label"><span class="ring-value num">${Math.round(rd.score)}%</span><span class="ring-caption">mastery</span></div></div>
          <div class="qc-hero-text">
            <div class="eyebrow">${esc(c.code)} Quiz Centre</div>
            <h2>${rd.ready ? 'Certification prep complete' : `${rd.masteredCount} of ${ds.length} domains mastered`}</h2>
            <p class="muted">${rd.ready ? `Every domain is at or above ${M}% mastery. Book the exam and keep the daily challenge going.` : `Every domain needs ${M}% mastery before prep counts as complete. The score is weighted by the exam domains.`}</p>
            <div class="stat-row">
              <div class="mini-stat"><div class="k">Questions</div><div class="v num">${st.total}</div><div class="s">${st.unique} answered</div></div>
              <div class="mini-stat"><div class="k">Accuracy</div><div class="v num">${st.answers ? Math.round(st.accuracy) + '%' : '—'}</div><div class="s">${st.answers} answers</div></div>
              <div class="mini-stat"><div class="k">Average</div><div class="v num">${st.quizzes ? Math.round(st.avgScore) + '%' : '—'}</div><div class="s">${A.plural(st.quizzes, 'quiz', 'quizzes')}</div></div>
              <div class="mini-stat"><div class="k">Daily streak</div><div class="v num">${streak}</div><div class="s">${dailyDone ? `Today ${Math.round(dailyDone.pct)}%` : 'Today pending'}</div></div>
            </div>
          </div>
        </section>

        <section class="panel qc-next">
          <div class="panel-head"><h3>Recommended next</h3></div>
          ${rec ? `<div class="rec-title">${esc(rec.title)}</div><p class="small muted">${esc(rec.why)}</p>
          <button class="btn btn-primary btn-block" data-qc="rec" data-a="${rec.action}" data-week="${rec.week || ''}" data-domain="${esc(rec.domain || '')}">${icon('play')} Start</button>` : ''}
          <div class="daily-row">
            <div class="daily-ic ${dailyDone ? 'done' : ''}">${icon(dailyDone ? 'check' : 'flame')}</div>
            <div style="flex:1;min-width:0"><strong>${dailyDone ? `Daily done · ${Math.round(dailyDone.pct)}%` : 'Daily challenge'}</strong><div class="tiny muted">${streak ? `${streak}-day streak` : 'Start a streak today'} · new set daily</div></div>
            <button class="btn btn-sm ${dailyDone ? '' : 'btn-teal'}" data-qc="start" data-mode="daily">${dailyDone ? 'Retake' : 'Start'}</button>
          </div>
          ${ctx.weekRecs.length > 1 ? `<div class="tiny muted" style="margin-top:10px">Also pending: ${ctx.weekRecs.slice(1).map((w) => `<button class="link-btn" data-qc="start" data-mode="week" data-week="${w}">Week ${w} revision</button>`).join(' ')}</div>` : ''}
        </section>

        <section class="panel span-3">
          <div class="panel-head"><h3>Quiz modes</h3><span class="tiny muted">${esc(c.code)} questions only</span></div>
          <div class="mode-grid">
            ${modeTile('quick')}${modeTile('standard')}${modeTile('mock')}${modeTile('domain')}
            ${modeTile('weak', ` · ${weakPool().length} available`)}${modeTile('flagged', ` · ${q.flagged.length} saved`)}${modeTile('daily')}
            ${hasWeekQuizzes() ? modeTile('week', '', false) : ''}
            ${modeTile('final', '', !ctx.finalUnlocked, `Unlocks at the end of Week ${o ? o.W : ''} of your study programme`)}
          </div>
        </section>

        <section class="panel span-2">
          <div class="panel-head"><h3>Domain mastery</h3><span class="tiny muted">Target ${M}%</span></div>
          ${strongest || weakest ? `<div class="sw-row">
            ${strongest ? `<span><span class="k">Strongest</span> ${esc(domShort(strongest.d))} <span class="num muted">${Math.round(strongest.accuracy)}%</span></span>` : ''}
            ${weakest && weakest.d !== (strongest && strongest.d) ? `<span><span class="k">Weakest</span> ${esc(domShort(weakest.d))} <span class="num muted">${Math.round(weakest.accuracy)}%</span></span>` : ''}
          </div>` : ''}
          <div class="dom-list">${domainRows(ds)}</div>
          <div class="tiny muted" style="margin-top:10px">Mastery is your latest-answer accuracy, scaled down until you've answered at least ${Math.round(minCoverage() * 100)}% of a domain's questions.</div>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Topics to revise</h3></div>
          ${wt.length ? wt.map((t) => { const ref = refOf(t); return `<div class="qx-rec"><div style="min-width:0"><div class="t">${esc(t.topic)}</div><div class="tiny muted">${t.obj ? `${esc(t.obj)} · ` : ''}${t.c}/${t.n} correct on latest attempt</div></div>
            <div class="row-actions">${A.ext.revision ? A.ext.revision.topicBookmarkBtn(t.topic) : ''}${ref ? `<a class="mini-btn" href="${esc(ref.url)}" target="_blank" rel="noopener" aria-label="Open reference">${icon('external')}</a>` : ''}</div></div>`; }).join('')
            : '<div class="small muted">Weak topics appear here once you have quiz results below your target.</div>'}
        </section>

        <section class="panel span-2">
          <div class="panel-head"><h3>Performance over time</h3></div>
          <div class="chart-wrap">${historyChart(q.attempts)}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Recent results</h3>${hist.length > 6 ? `<button class="link-btn" data-qc="hist">${showAllHistory ? 'Show fewer' : `All (${hist.length})`}</button>` : ''}</div>
          ${shown.length ? `<div class="list-gap">${shown.map((t) => `<button class="quiz-item" data-qc="result" data-id="${t.id}">
            <div class="score ${t.pct >= M ? 'pass' : 'fail'} num">${Math.round(t.pct)}%</div>
            <div class="body"><div class="name">${esc(t.title)}</div><div class="meta">${A.fmtDate(t.date.slice(0, 10))} · ${t.correct}/${t.total} · ${fmtDur(t.durationSec)} · ${t.exam ? 'Exam' : 'Practice'}</div></div>
            ${icon('chevron', 'muted')}</button>`).join('')}</div>` : '<div class="small muted">No quizzes yet. Start with the daily challenge or a Quick Quiz.</div>'}
        </section>
      </div>

      <div class="disclaimer">${icon('info')}
        <div class="small">${esc(X().disclaimer || 'Practice questions are study aids, not official exam content. Always check the linked references.')}
        ${c.studyGuideUrl ? ` <a href="${esc(c.studyGuideUrl)}" target="_blank" rel="noopener">Official study guide</a>` : ''}</div>
      </div>`;
  }

  function startSheet(mode, preset = {}) {
    if (!QS.length) { toast(`There are no questions in the ${A.cert ? A.cert.code : ''} bank yet.`, { icon: 'x' }); return; }
    const m = MODES[mode];
    const p = qs().prefs;
    const exam = m.examOnly ? true : m.practiceOnly ? false : (preset.exam != null ? preset.exam : p.exam);
    const diff = preset.diff || p.diff || 'all';
    let domain = preset.domain != null ? String(preset.domain) : p.domain != null ? String(p.domain) : firstDomain();
    if (!domById(domain) || !domIds().includes(domain)) domain = firstDomain();
    const showDiff = ['quick', 'standard', 'domain', 'weak'].includes(mode);
    const poolCount = () => {
      if (mode === 'domain') return diffFilter(QS.filter((q) => domOf(q) === domain), diff).length;
      if (mode === 'weak') return diffFilter(weakPool(), diff).length;
      if (mode === 'flagged') return qs().flagged.length;
      if (mode === 'week') return weekPool(preset.week).length;
      if (mode === 'mock' || mode === 'final' || mode === 'daily') return QS.length;
      return diffFilter(QS, diff).length;
    };
    const avail = poolCount();
    const n = Math.min(m.count, avail);
    const title = mode === 'week' ? `Week ${preset.week} revision assessment` : m.title;
    const secs = mode === 'week' ? weekSections(preset.week) || [] : [];
    const desc = mode === 'week' ? `Questions on this week's topics: ${secs.map((s) => X().sections[s] || s).join('; ')}.` : m.desc;
    A.openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${esc(A.cert.code)} · Quiz Centre</div><h2>${esc(title)}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <p class="small muted" style="margin:0">${esc(desc)}</p>
      ${mode === 'domain' ? `<div class="field"><span class="label">Exam domain</span><div class="qx-seg3" style="--n:${Math.min(DOMS.length, 3)}">${DOMS.map((d) => `<button class="${d.id === domain ? 'active' : ''}" data-qc="sopt" data-k="domain" data-v="${esc(d.id)}"><strong>${esc(domLabel(d.id))}</strong><span>${esc(d.short)}</span></button>`).join('')}</div></div>` : ''}
      ${m.examOnly || m.practiceOnly ? `<div class="callout info">${m.examOnly ? `Exam mode: timed (${fmtDur(m.minutes * 60)}), and answers are revealed only after you submit. Weighted by the exam domain percentages.` : 'Practice mode: you see the answer and explanation straight after each question.'}</div>` : `
      <div class="field"><span class="label">Mode</span><div class="mini-seg qx-seg2">
        <button class="${!exam ? 'active' : ''}" data-qc="sopt" data-k="exam" data-v="0">Practice<span>Instant feedback</span></button>
        <button class="${exam ? 'active' : ''}" data-qc="sopt" data-k="exam" data-v="1">Exam<span>Timed · answers at end</span></button>
      </div></div>`}
      ${showDiff ? `<div class="field"><span class="label">Difficulty</span><div class="mini-seg qx-seg4">${['all', 'easy', 'intermediate', 'advanced'].map((d) => `<button class="${diff === d ? 'active' : ''}" data-qc="sopt" data-k="diff" data-v="${d}">${d === 'all' ? 'All' : DIFF_LABEL[d]}</button>`).join('')}</div></div>` : ''}
      <div class="score-preview"><div><div class="small muted">Questions</div><div class="big num">${n}</div></div>
        <div style="text-align:right"><div class="small muted">${exam && m.minutes ? 'Time limit' : 'Suggested time'}</div><div class="big num">${m.minutes ? fmtDur(Math.round((m.minutes * Math.max(n, 1)) / m.count) * 60) : '~5 min'}</div></div></div>
      ${n < m.count && avail > 0 ? `<div class="tiny muted" style="margin-top:8px">Only ${avail} question${avail === 1 ? '' : 's'} match, so the quiz is shorter.</div>` : ''}
      <button class="btn btn-primary btn-block" style="margin-top:18px" data-qc="go" data-mode="${mode}" data-week="${preset.week || ''}" data-exam="${exam ? 1 : 0}" data-diff="${diff}" data-domain="${esc(domain || '')}" ${n ? '' : 'disabled'}>${icon('play')} Start ${exam ? 'exam' : 'quiz'}</button>`);
    startSheet.ctx = { mode, preset: { ...preset, exam, diff, domain } };
  }

  // Delegated events for the Quiz Centre view + start sheet
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-qc]');
    if (!el) return;
    const k = el.dataset.qc;
    if (k === 'resume') { openPlayer(); return; }
    if (k === 'hist') { showAllHistory = !showAllHistory; A.renderCurrent(); return; }
    if (k === 'result') { showResults(el.dataset.id); return; }
    if (k === 'locked') { toast(el.dataset.msg || 'This mode is locked for now.', { icon: 'calendar' }); return; }
    if (k === 'start') {
      const mode = el.dataset.mode;
      if (activeOk()) { toast('Finish or resume your current quiz first.', { icon: 'clock', action: 'Resume', onAction: openPlayer }); return; }
      startSheet(mode, { week: Number(el.dataset.week) || undefined, domain: el.dataset.domain || undefined });
      return;
    }
    if (k === 'rec') {
      const a = el.dataset.a;
      if (a === 'resume') { openPlayer(); return; }
      if (a === 'week') { startSheet('week', { week: Number(el.dataset.week) }); return; }
      if (a === 'domain') { startSheet('domain', { domain: el.dataset.domain }); return; }
      startSheet(a);
      return;
    }
    if (k === 'sopt') {
      const c = startSheet.ctx;
      if (!c) return;
      const v = el.dataset.v;
      const p = qs().prefs;
      if (el.dataset.k === 'exam') { c.preset.exam = v === '1'; p.exam = v === '1'; }
      if (el.dataset.k === 'diff') { c.preset.diff = v; p.diff = v; }
      if (el.dataset.k === 'domain') { c.preset.domain = v; p.domain = v; }
      A.save();
      startSheet(c.mode, c.preset);
      return;
    }
    if (k === 'go') {
      startSession({ mode: el.dataset.mode, exam: el.dataset.exam === '1', diff: el.dataset.diff, domain: el.dataset.domain || firstDomain(), week: Number(el.dataset.week) || null });
    }
  });

  // ---------------------------------------------------------------
  // Register with the app
  // ---------------------------------------------------------------
  A.registerView('quiz', {
    label: 'Quiz Centre', short: 'Quiz', icon: 'target', scope: 'cert', order: 40, render: renderQuizView,
    eyebrow: () => (A.cert ? `${A.cert.code} exam preparation` : 'Quiz Centre'),
  });

  // Home: exam readiness panel (side column) and study recommendations (main column)
  A.hooks.home.push({
    slot: 'side', order: 1,
    render: (o) => {
      if (!QS.length) return `<section class="panel"><div class="panel-head"><h3>Exam preparation</h3></div>${noBankState()}</section>`;
      const rd = readiness();
      const dailyDone = qs().daily[todayISO()];
      const rec = recommendation(o);
      return `<section class="panel">
        <div class="panel-head"><h3>Domain mastery</h3><span class="tiny muted">${rd.masteredCount}/${rd.ds.length} mastered</span></div>
        <div class="dom-list">${domainRows(rd.ds, { compact: true })}</div>
        ${rec ? `<div class="small muted" style="margin-top:12px">Next: ${esc(rec.title)}</div>` : ''}
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn-sm ${dailyDone ? '' : 'btn-teal'}" data-qc="start" data-mode="daily">${icon(dailyDone ? 'check' : 'flame')} ${dailyDone ? 'Daily done' : 'Daily challenge'}</button>
          <button class="btn btn-sm" data-nav="quiz">${icon('target')} Quiz Centre</button>
        </div>
      </section>`;
    },
  });
  A.hooks.home.push({
    slot: 'main', order: 5,
    render: () => {
      if (!QS.length) return '';
      const recs = studyRecommendations(3);
      if (!recs.length) return '';
      return `<section class="panel">
        <div class="panel-head"><h3>Study recommendations</h3><span class="tiny muted">From your saved quiz results</span></div>
        <ul class="rec-list">${recs.map((r) => `<li>${icon(r.kind === 'topic' ? 'sparkle' : 'target')}<div><p>${esc(r.text)}</p>
          <div class="btn-row">${r.kind === 'domain' ? `<button class="btn btn-sm" data-qc="start" data-mode="domain" data-domain="${esc(r.domain)}">Domain quiz</button>` : `<button class="btn btn-sm" data-qc="start" data-mode="weak">Weak Areas quiz</button>`}
          ${r.ref ? `<a class="btn btn-sm btn-ghost" href="${esc(r.ref.url)}" target="_blank" rel="noopener">${icon('external')} ${esc(r.ref.title)}</a>` : ''}</div></div></li>`).join('')}</ul>
      </section>`;
    },
  });
  // Analytics: quiz performance
  A.hooks.analytics.push({
    slot: 'main', order: 10,
    render: () => {
      if (!QS.length) return '';
      const st = overallStats();
      const rd = readiness();
      const q = qs();
      return `<section class="panel span-2">
        <div class="panel-head"><h3>Quiz Centre performance</h3><button class="link-btn" data-nav="quiz">Open Quiz Centre ${icon('chevron')}</button></div>
        <div class="stat-row">
          <div class="mini-stat"><div class="k">Quizzes</div><div class="v num">${st.quizzes}</div></div>
          <div class="mini-stat"><div class="k">Average</div><div class="v num">${st.quizzes ? Math.round(st.avgScore) + '%' : '—'}</div></div>
          <div class="mini-stat"><div class="k">Accuracy</div><div class="v num">${st.answers ? Math.round(st.accuracy) + '%' : '—'}</div></div>
          <div class="mini-stat"><div class="k">Coverage</div><div class="v num">${st.unique}/${st.total}</div></div>
        </div>
        <div class="chart-wrap">${historyChart(q.attempts)}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Domain mastery</h3><span class="tiny muted">${rd.masteredCount}/${rd.ds.length}</span></div>
        <div class="dom-list">${domainRows(rd.ds, { compact: true })}</div>
      </section>`;
    },
  });
  // Study plan: week revision quiz shortcut
  A.hooks.planWeek.push({
    slot: 'main',
    render: ({ week }) => (weekPool(week).length ? `<button class="btn btn-sm btn-block" style="margin-top:12px" data-qc="start" data-mode="week" data-week="${week}">${icon('target')} Week ${week} revision quiz${qs().weekBest[week] != null ? ` · best ${Math.round(qs().weekBest[week])}%` : ''}</button>` : ''),
  });

  A.hooks.certChange.push(() => { rebuild(); if (P.el && !P.el.hidden) closePlayer(true); qs(); });
  A.hooks.bankChange.push((id) => { if (A.cert && A.cert.id === id) { rebuild(); qs(); } });
  A.hooks.load.push(() => { rebuild(); qs(); });
  A.hooks.reset.push((state) => { delete state.quiz; qs(); });
  A.hooks.ready.push(() => {
    document.addEventListener('click', (e) => { if (e.target.closest('#quiz-player, #sheet-body')) onPlayerClick(e); });
    document.addEventListener('change', (e) => { if (e.target.closest('#quiz-player')) onPlayerChange(e); });
    const s = qs().active;
    if (s && activeOk() && s.limitSec && remainingSec(s) <= 0) {
      setTimeout(() => { toast('Your exam timer ran out while the app was closed. It has been submitted.', { icon: 'clock', ms: 5000 }); finishSession('timeout'); }, 300);
    }
  });

  A.addAchievement({ id: 'qc-first', t: 'First practice quiz', d: 'Complete a Quiz Centre quiz', icon: 'target', test: () => qs().attempts.length >= 1 });
  A.addAchievement({ id: 'qc-daily7', t: '7-day quiz streak', d: 'Daily challenge 7 days running', icon: 'flame', test: () => dailyStreak() >= 7 });
  A.addAchievement({ id: 'qc-mock85', get t() { return `Mock exam at ${mastery()}%+`; }, get d() { return `Score ${mastery()}% or more on a full mock`; }, icon: 'trophy', test: () => qs().attempts.some((t) => (t.mode === 'mock' || t.mode === 'final') && t.pct >= mastery()) });
  A.addAchievement({ id: 'qc-ready', get t() { return `${A.cert ? A.cert.code : 'Exam'} ready`; }, get d() { return `Every domain at ${mastery()}% mastery`; }, icon: 'star', test: () => readiness().ready });

  A.ext.quiz = {
    get QS() { return QS; }, get QMAP() { return QMAP; },
    qs, readiness, overallStats, recentAssessment, allDomainStats, weakTopics, studyRecommendations, recommendation,
    startSheet, toggleBookmark, chipRow, optionsHTML, explanationHTML, domLabel, domShort, refOf, refLabel, rebuild,
  };
  // Testing hook
  window.__quizCentre = { qs, readiness, allDomainStats, isCorrect, isAnswered, selectQuestions, weightedCounts, startSession, finishSession, recommendation, programmeContext, studyRecommendations, get QMAP() { return QMAP; }, get QS() { return QS; }, rebuild };
})();
