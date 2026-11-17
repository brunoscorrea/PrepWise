/* =========================================================
   AB-650 Quiz Centre — plugs into the Study Tracker via window.StudyApp.
   Question bank: ab650/*.js (original practice questions, not exam content).
   ========================================================= */
'use strict';

(() => {
  const A = window.StudyApp;
  const B = window.AB650;
  if (!A || !B) { console.warn('Quiz Centre: StudyApp or question bank missing'); return; }
  const { icon, esc, toast, confirmDialog, bar, todayISO, toISO, parseISO, addDays, daysBetween, clamp } = A;

  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  const QS = B.questions;
  const QMAP = new Map(QS.map((q) => [q.id, q]));
  const domOf = (q) => Number(q.obj[0]);
  const MASTERY = 85;              // % target per domain
  const MIN_COVERAGE = 0.6;        // share of a domain's questions you must have answered before it can count as mastered
  const WEIGHT = { 1: 22.5, 2: 42.5, 3: 37.5 }; // midpoints of the official ranges
  const WEEK_SECTIONS = { 1: ['1.1', '2.1'], 2: ['2.2', '2.3'], 3: ['1.2', '2.4'], 4: ['3.1', '3.2', '3.3', '3.4'] };
  const TYPE_LABEL = { single: 'Single answer', multi: 'Multiple answers', order: 'Ordering', match: 'Matching' };
  const DIFF_LABEL = { easy: 'Easy', intermediate: 'Intermediate', advanced: 'Advanced' };
  const MODES = {
    quick: { title: 'Quick Quiz', count: 10, minutes: 10, desc: '10 random questions · about 10 minutes', icon: 'play' },
    standard: { title: 'Standard Quiz', count: 25, minutes: 30, desc: '25 questions · about 25–30 minutes', icon: 'book' },
    mock: { title: 'Full Mock Exam', count: 50, minutes: 100, examOnly: true, weighted: true, desc: '50 questions weighted to the official domains · 100-minute timer', icon: 'clock' },
    domain: { title: 'Domain Quiz', count: 20, minutes: 25, desc: 'Focus on one official exam domain', icon: 'target' },
    weak: { title: 'Weak Areas', count: 20, minutes: 25, desc: 'Questions you previously got wrong', icon: 'refresh' },
    flagged: { title: 'Flagged Questions', count: 30, minutes: 35, desc: 'Questions you flagged for revision', icon: 'star' },
    daily: { title: 'Daily Challenge', count: 5, practiceOnly: true, desc: '5 questions a day · keep your streak', icon: 'flame' },
    week: { title: 'Week Revision', count: 20, minutes: 25, desc: 'Revision assessment for a programme week', icon: 'calendar' },
    final: { title: 'Final Mock Assessment', count: 60, minutes: 120, examOnly: true, weighted: true, desc: '60 questions across all domains · 120-minute timer', icon: 'trophy' },
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
  const refOf = (q) => { const r = B.refs[q.ref]; return r ? { url: r[0], title: r[1] } : null; };
  const LETTERS = 'ABCDEFGH';

  // ---------------------------------------------------------------
  // Persistent quiz state (lives inside the app state → same storage, export/import, reset)
  // ---------------------------------------------------------------
  function qs() {
    const s = A.state;
    if (!s.quiz || typeof s.quiz !== 'object') s.quiz = {};
    const q = s.quiz;
    if (!Array.isArray(q.attempts)) q.attempts = [];
    if (!q.stats || typeof q.stats !== 'object') q.stats = {};
    if (!Array.isArray(q.flagged)) q.flagged = [];
    if (!q.daily || typeof q.daily !== 'object') q.daily = {};
    if (!q.weekBest || typeof q.weekBest !== 'object') q.weekBest = {};
    if (!q.prefs || typeof q.prefs !== 'object') q.prefs = { exam: false, diff: 'all', domain: 1 };
    if (q.active && (!Array.isArray(q.active.items) || q.active.items.some((it) => !QMAP.has(it.q)))) q.active = null;
    if (q.active === undefined) q.active = null;
    q.flagged = q.flagged.filter((id) => QMAP.has(id));
    return q;
  }

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
    const mastery = accuracy * Math.min(1, coverage / MIN_COVERAGE);
    return { d, total: pool.length, seen, coverage, accuracy, allTime: pct(c, n), answers: n, mastery, mastered: mastery >= MASTERY };
  }
  function allDomainStats() { return [1, 2, 3].map(domainStats); }
  function readiness() {
    const ds = allDomainStats();
    const weighted = ds.reduce((a, s) => a + s.mastery * WEIGHT[s.d], 0) / 102.5; // normalise midpoints (sum 102.5)
    return { ds, score: weighted, masteredCount: ds.filter((s) => s.mastered).length, ready: ds.every((s) => s.mastered) };
  }
  function overallStats() {
    const q = qs();
    const st = Object.values(q.stats);
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
  function weakTopics(limit = 5) {
    const st = qs().stats;
    const byTopic = {};
    QS.forEach((q) => {
      const s = st[q.id];
      if (!s || !s.n) return;
      const t = byTopic[q.topic] || (byTopic[q.topic] = { topic: q.topic, obj: q.obj, n: 0, c: 0, ref: q.ref });
      t.n += 1; t.c += s.last ? 1 : 0;
    });
    return Object.values(byTopic).filter((t) => t.n >= 1 && t.c / t.n < MASTERY / 100)
      .sort((a, b) => a.c / a.n - b.c / b.n || b.n - a.n).slice(0, limit);
  }

  // ---------------------------------------------------------------
  // Question selection
  // ---------------------------------------------------------------
  function pickBalanced(pool, n, rng = Math.random, useStats = true) {
    const st = qs().stats;
    const groups = {};
    pool.forEach((q) => (groups[q.obj] = groups[q.obj] || []).push(q));
    Object.values(groups).forEach((g) => {
      const sh = shuffle(g, rng);
      if (useStats) sh.sort((a, b) => ((st[a.id] && st[a.id].n) || 0) - ((st[b.id] && st[b.id].n) || 0));
      groups[Object.keys(groups).find((k) => groups[k] === g)] = sh;
    });
    const keys = shuffle(Object.keys(groups), rng);
    const out = [];
    while (out.length < n && keys.some((k) => groups[k].length)) {
      for (const k of keys) if (groups[k].length && out.length < n) out.push(groups[k].shift());
    }
    return shuffle(out, rng);
  }
  function weightedCounts(n) {
    const raw = [1, 2, 3].map((d) => ({ d, v: (n * WEIGHT[d]) / 102.5 }));
    raw.forEach((r) => { r.f = Math.floor(r.v); r.rem = r.v - r.f; });
    let left = n - raw.reduce((a, r) => a + r.f, 0);
    raw.slice().sort((a, b) => b.rem - a.rem).forEach((r) => { if (left > 0) { r.f++; left--; } });
    return Object.fromEntries(raw.map((r) => [r.d, r.f]));
  }
  const diffFilter = (pool, diff) => (diff && diff !== 'all' ? pool.filter((q) => q.diff === diff) : pool);

  function selectQuestions(cfg) {
    const m = MODES[cfg.mode];
    if (cfg.mode === 'mock' || cfg.mode === 'final') {
      const counts = weightedCounts(m.count);
      return [1, 2, 3].flatMap((d) => pickBalanced(QS.filter((q) => domOf(q) === d), counts[d]));
    }
    if (cfg.mode === 'daily') {
      const rng = seeded(`ab650-daily-${todayISO()}`);
      const counts = { 1: 1, 2: 2, 3: 2 };
      return shuffle([1, 2, 3].flatMap((d) => shuffle(QS.filter((q) => domOf(q) === d), rng).slice(0, counts[d])), rng);
    }
    if (cfg.mode === 'domain') return pickBalanced(diffFilter(QS.filter((q) => domOf(q) === cfg.domain), cfg.diff), m.count);
    if (cfg.mode === 'week') return pickBalanced(QS.filter((q) => WEEK_SECTIONS[cfg.week].includes(q.obj.slice(0, 3))), m.count);
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

  // ---------------------------------------------------------------
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
      toast(cfg.mode === 'weak' ? 'No incorrect answers yet. Take a quiz first.' : cfg.mode === 'flagged' ? 'No flagged questions yet.' : 'No questions match those filters.', { icon: 'x' });
      return;
    }
    const exam = m.examOnly ? true : m.practiceOnly ? false : !!cfg.exam;
    const rng = cfg.mode === 'daily' ? seeded(`ab650-daily-items-${todayISO()}`) : Math.random;
    const title = cfg.mode === 'domain' ? `Domain ${cfg.domain}: ${B.domains[cfg.domain - 1].short}`
      : cfg.mode === 'week' ? `Week ${cfg.week} revision assessment` : m.title;
    qs().active = {
      id: A.uid(), mode: cfg.mode, title, exam, diff: cfg.diff || 'all', domain: cfg.domain || null, week: cfg.week || null,
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
      id: s.id, mode: s.mode, title: s.title, exam: s.exam, week: s.week, domain: s.domain,
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
    if ((s.mode === 'mock' || s.mode === 'final') && attempt.pct >= MASTERY) {
      A.celebrate(s.mode === 'final' ? 'Final assessment passed' : 'Mock exam passed', `${Math.round(attempt.pct)}% — above your ${MASTERY}% target.`);
    }
  }

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
      <span class="chip blue">Domain ${domOf(q)}</span>
      <span class="chip">${esc(q.obj)}</span>
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
      <div class="qx-sec"><h4>Why this is correct</h4><p>${esc(q.exp)}</p></div>
      ${wrongs ? `<div class="qx-sec"><h4>Why the other options are wrong</h4><ul class="qx-wrongs">${wrongs}</ul></div>` : ''}
      <div class="qx-sec qx-meta">
        <div><span class="k">Technology</span><span>${esc(q.feat)}</span></div>
        <div><span class="k">Exam objective</span><span>${esc(q.obj)} · ${esc(B.objectives[q.obj] || '')}</span></div>
        <div><span class="k">Section</span><span>${esc(B.sections[q.obj.slice(0, 3)] || '')}</span></div>
      </div>
      ${ref ? `<a class="btn btn-sm qx-learn" href="${esc(ref.url)}" target="_blank" rel="noopener">${icon('external')} Microsoft Learn: ${esc(ref.title)}</a>` : ''}
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
        <div class="qx-pmeta"><span class="num">Question ${s.idx + 1} of ${total}</span><span class="num">${answeredCount} answered${s.flags.length ? ` · ${s.flags.length} flagged` : ''}</span></div></div>
      <div class="qx-body" id="qx-body">
        ${chipRow(q)}
        <div class="qx-q">${esc(q.q)}</div>
        <div class="qx-hint">${instruction(q)}</div>
        ${optionsHTML(q, it, r, reveal, reveal)}
        ${reveal ? explanationHTML(q, r) : ''}
      </div>
      <div class="qx-foot">
        <button class="icon-btn" data-qa="prev" aria-label="Previous question" ${s.idx === 0 ? 'disabled' : ''}>${icon('chevron', 'flip')}</button>
        <button class="icon-btn ${flagged ? 'flag-on' : ''}" data-qa="flag" aria-label="${flagged ? 'Unflag' : 'Flag for review'}">${icon('star')}</button>
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
      <div class="cd-legend"><span><i style="background:var(--accent)"></i>Answered</span><span><i style="background:var(--amber)"></i>Flagged</span><span><i style="border:1.5px solid var(--text)"></i>Current</span></div>
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

  function renderResults() {
    const t = qs().attempts.find((a) => a.id === P.attemptId);
    if (!t) { closePlayer(); return; }
    const pass = t.pct >= MASTERY;
    const wrong = t.items.filter((x) => !x.ok);
    const topics = {};
    wrong.forEach((x) => { const q = QMAP.get(x.q); if (!q) return; const k = q.topic; (topics[k] = topics[k] || { topic: k, obj: q.obj, n: 0, ref: q.ref }).n++; });
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
            <div class="phase" style="color:${pass ? 'var(--teal)' : 'var(--amber)'}">${pass ? 'At or above your 85% target' : `${Math.round(MASTERY - t.pct)} points below your 85% target`}</div>
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
        <div class="card week-bars">${[1, 2, 3].filter((d) => t.byDomain[d]).map((d) => {
          const [c, n] = t.byDomain[d]; const p = pct(c, n);
          return `<div class="week-bar-row"><div class="row-top"><span class="label">Domain ${d} <span class="muted">· ${esc(B.domains[d - 1].short)}</span></span><span class="val num">${c}/${n} · ${Math.round(p)}%</span></div>${bar(p, p >= MASTERY ? 'teal' : p >= 60 ? '' : 'amber')}</div>`;
        }).join('')}</div>

        <div class="section-title">Performance by difficulty</div>
        <div class="card week-bars">${['easy', 'intermediate', 'advanced'].filter((d) => t.byDiff[d]).map((d) => {
          const [c, n] = t.byDiff[d]; const p = pct(c, n);
          return `<div class="week-bar-row"><div class="row-top"><span class="label">${DIFF_LABEL[d]}</span><span class="val num">${c}/${n} · ${Math.round(p)}%</span></div>${bar(p, p >= MASTERY ? 'teal' : p >= 60 ? '' : 'amber')}</div>`;
        }).join('')}</div>

        ${recs.length ? `<div class="section-title">Recommended for revision</div>
        <div class="card">${recs.map((r) => { const ref = B.refs[r.ref]; return `<div class="qx-rec"><div><div class="t">${esc(r.topic)}</div><div class="tiny muted">${esc(r.obj)} · ${esc(B.objectives[r.obj] || '')}</div></div>${ref ? `<a class="mini-btn" href="${esc(ref[0])}" target="_blank" rel="noopener" aria-label="Open Microsoft Learn">${icon('external')}</a>` : ''}</div>`; }).join('')}</div>` : ''}

        <div class="section-title">Review answers
          <span class="qx-filter"><button class="${P.filter === 'wrong' ? 'on' : ''}" data-qa="rfilter" data-f="wrong">Incorrect (${wrong.length})</button><button class="${P.filter === 'all' ? 'on' : ''}" data-qa="rfilter" data-f="all">All (${t.total})</button></span></div>
        ${list.length ? list.map(([x, i]) => {
          const q = QMAP.get(x.q);
          if (!q) return '';
          return `<details class="qx-review ${x.ok ? 'ok' : 'bad'}"><summary><span class="qx-rn num">${i + 1}</span><span class="qx-rv">${x.ok ? icon('check') : icon('x')}</span><span class="qx-rq">${esc(q.q)}</span></summary>
            <div class="qx-rbody">${chipRow(q)}<div class="qx-q small-q">${esc(q.q)}</div>${optionsHTML(q, null, x.r, true, true)}${explanationHTML(q, x.r)}</div></details>`;
        }).join('') : '<div class="card empty">Nothing to review here. Every answer was correct.</div>'}

        <div class="btn-row" style="margin-top:18px">
          ${wrong.length ? `<button class="btn" data-qa="retry" data-id="${t.id}">${icon('refresh')} Retry incorrect</button>` : ''}
          <button class="btn btn-primary" data-qa="close">Back to Quiz Centre</button>
        </div>
      </div>`;
    const body = P.el.querySelector('.qx-body');
    if (body) body.scrollTop = 0;
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
      if (s.flags.includes(s.idx)) { if (!f.includes(it.q)) f.push(it.q); toast('Flagged for revision', { icon: 'star', ms: 1400 }); }
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

  // ---------------------------------------------------------------
  // Programme integration (study plan weeks)
  // ---------------------------------------------------------------
  function programmeContext(o) {
    const q = qs();
    const recs = [];
    if (o.phase !== 'before') {
      const lastWeek = o.phase === 'after' ? 4 : o.currentWeek;
      for (let w = 1; w <= lastWeek; w++) {
        const endOfWeek = o.phase === 'after' || o.dayNo >= w * 7 - 1; // Saturday of week w onwards
        const sessionsDone = A.state.sessions.filter((s) => s.week === w).every((s) => s.status !== 'pending');
        if ((endOfWeek || sessionsDone) && !(q.weekBest[w] >= MASTERY)) recs.push(w);
      }
    }
    const finalUnlocked = o.phase === 'after' || o.dayNo >= 27 || A.state.sessions.filter((s) => s.week === 4).every((s) => s.status !== 'pending');
    return { weekRecs: recs, finalUnlocked };
  }

  function recommendation(o) {
    const q = qs();
    if (q.active) return { title: `Resume: ${q.active.title}`, why: 'You have a quiz in progress.', action: 'resume' };
    const ds = allDomainStats();
    const ctx = programmeContext(o);
    if (ctx.weekRecs.length) {
      const w = ctx.weekRecs[0];
      return { title: `Week ${w} revision assessment`, why: `Week ${w} of your study programme is wrapping up. Check those topics before moving on.`, action: 'week', week: w };
    }
    const thin = ds.filter((d) => d.seen < Math.min(10, d.total)).sort((a, b) => a.seen - b.seen)[0];
    if (thin) return { title: `Domain ${thin.d} quiz`, why: `You've answered only ${thin.seen} of ${thin.total} questions in ${B.domains[thin.d - 1].short}. Build coverage first.`, action: 'domain', domain: thin.d };
    const weak = weakPool();
    if (weak.length >= 5) return { title: 'Weak Areas quiz', why: `${weak.length} questions you've missed before are waiting for another attempt.`, action: 'weak' };
    const low = ds.filter((d) => !d.mastered).sort((a, b) => a.mastery - b.mastery)[0];
    if (low) return { title: `Domain ${low.d} quiz`, why: `${B.domains[low.d - 1].short} is your weakest domain at ${Math.round(low.mastery)}% mastery.`, action: 'domain', domain: low.d };
    return { title: 'Full Mock Exam', why: 'All domains are at mastery. Test yourself under exam conditions.', action: 'mock' };
  }

  // ---------------------------------------------------------------
  // Quiz Centre view
  // ---------------------------------------------------------------
  function historyChart(attempts) {
    const pts = attempts.slice(-20);
    if (pts.length < 1) return '<div class="empty" style="padding:16px 6px">Complete a quiz to see your performance over time.</div>';
    const W = 340, H = 160, L = 30, R = 10, T = 12, Bm = 22, iw = W - L - R, ih = H - T - Bm;
    const y = (p) => T + ih * (1 - clamp(p, 0, 100) / 100);
    const n = pts.length;
    const x = (i) => (n === 1 ? L + iw / 2 : L + (iw * i) / (n - 1));
    const P2 = pts.map((a, i) => [x(i), y(a.pct)]);
    const line = P2.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const grid = [0, 50, 100].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke="rgba(255,255,255,0.06)"/><text class="axis" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${g}</text>`).join('');
    const lab = [0, n - 1].filter((v, i, arr) => arr.indexOf(v) === i).map((i) => `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}">${A.fmtDate(pts[i].date.slice(0, 10), { day: 'numeric', month: 'short' })}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quiz scores over time">
      ${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(MASTERY)}" y2="${y(MASTERY)}" stroke="#2fd1b5" stroke-dasharray="5 5" stroke-width="1.4"/>
      <text class="axis" x="${W - R}" y="${y(MASTERY) - 5}" text-anchor="end" style="fill:#2fd1b5">${MASTERY}% target</text>
      ${n > 1 ? `<path d="${line}" fill="none" stroke="#5b9bff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
      ${P2.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="${pts[i].pct >= MASTERY ? '#2fd1b5' : '#f3b54a'}" stroke="#131a27" stroke-width="2"><title>${esc(pts[i].title)}: ${Math.round(pts[i].pct)}%</title></circle>`).join('')}
      ${lab}
    </svg>`;
  }

  function masteryBar(m) {
    return `<div class="qx-mbar"><div class="bar ${m >= MASTERY ? 'teal' : ''}"><span style="width:${clamp(m, 0, 100).toFixed(1)}%"></span></div><i style="left:${MASTERY}%"></i></div>`;
  }

  let showAllHistory = false;
  function renderQuizView(o) {
    const el = document.getElementById('view-quiz');
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
    const shown = showAllHistory ? hist : hist.slice(0, 5);

    el.innerHTML = `
      ${q.active ? `<div class="card qx-resume">
        <div>${icon('clock')}</div>
        <div style="flex:1;min-width:0"><strong>${esc(q.active.title)}</strong><div class="small muted">In progress · question ${q.active.idx + 1} of ${q.active.items.length}${q.active.limitSec ? ` · ${fmtMS(remainingSec(q.active))} left` : ''}</div></div>
        <button class="btn btn-sm btn-primary" data-qc="resume">Resume</button>
      </div>` : ''}

      <div class="card hero">
        <div class="ring-wrap">${A.ring(rd.score, 112, 10, 'qcGrad')}<div class="ring-label"><span class="ring-value num">${Math.round(rd.score)}%</span><span class="ring-caption">readiness</span></div></div>
        <div class="hero-text">
          <div class="phase" style="${rd.ready ? 'color:var(--teal)' : ''}">${rd.ready ? 'Certification prep complete' : `${rd.masteredCount} of 3 domains mastered`}</div>
          <p class="motivation">${rd.ready ? 'All three domains are at or above 85% mastery. Book the exam and keep doing the daily challenge.' : `Every domain needs ${MASTERY}% mastery before prep counts as complete. Weighted by the official exam domains.`}</p>
        </div>
      </div>

      <div class="stat-grid qx-stats">
        <div class="card stat"><div class="stat-top">${icon('book')} Question bank</div><div class="stat-value num">${st.total}</div><div class="stat-foot">${st.unique} answered at least once</div></div>
        <div class="card stat"><div class="stat-top">${icon('check')} Accuracy</div><div class="stat-value num">${st.answers ? Math.round(st.accuracy) + '%' : '—'}</div><div class="stat-foot">${st.answers} answers in total</div></div>
        <div class="card stat"><div class="stat-top">${icon('target')} Average score</div><div class="stat-value num">${st.quizzes ? Math.round(st.avgScore) + '%' : '—'}</div><div class="stat-foot">${st.quizzes} quiz${st.quizzes === 1 ? '' : 'zes'} completed</div></div>
        <div class="card stat flame"><div class="stat-top">${icon('flame')} Daily streak</div><div class="stat-value num">${streak}<small>day${streak === 1 ? '' : 's'}</small></div><div class="stat-foot">${dailyDone ? `Today: ${Math.round(dailyDone.pct)}%` : 'Today\'s challenge pending'}</div></div>
      </div>
      ${strongest || weakest ? `<div class="card qx-sw">
        ${strongest ? `<div><span class="k">Strongest</span><span class="v">Domain ${strongest.d} · ${esc(B.domains[strongest.d - 1].short)}</span><span class="num muted">${Math.round(strongest.accuracy)}%</span></div>` : ''}
        ${weakest && weakest.d !== (strongest && strongest.d) ? `<div><span class="k">Weakest</span><span class="v">Domain ${weakest.d} · ${esc(B.domains[weakest.d - 1].short)}</span><span class="num muted">${Math.round(weakest.accuracy)}%</span></div>` : ''}
      </div>` : ''}

      <div class="section-title">Recommended next</div>
      <div class="card qx-rec-card">
        <div class="qx-rec-title">${esc(rec.title)}</div>
        <div class="small muted" style="margin-top:4px">${esc(rec.why)}</div>
        <button class="btn btn-primary btn-block" style="margin-top:14px" data-qc="rec" data-a="${rec.action}" data-week="${rec.week || ''}" data-domain="${rec.domain || ''}">${icon('play')} Start</button>
      </div>

      ${ctx.weekRecs.length > 1 ? `<div class="card" style="margin-top:12px"><div class="small muted">Also pending: ${ctx.weekRecs.slice(1).map((w) => `<button class="link-btn" data-qc="start" data-mode="week" data-week="${w}">Week ${w} revision</button>`).join(' ')}</div></div>` : ''}

      <div class="section-title">Daily challenge</div>
      <div class="card qx-daily">
        <div class="qx-daily-ic ${dailyDone ? 'done' : ''}">${icon(dailyDone ? 'check' : 'flame')}</div>
        <div style="flex:1;min-width:0"><strong>${dailyDone ? `Done today · ${Math.round(dailyDone.pct)}%` : '5 questions for today'}</strong><div class="small muted">${streak ? `${streak}-day streak` : 'Start a streak today'} · a new set every day</div></div>
        <button class="btn btn-sm ${dailyDone ? '' : 'btn-teal'}" data-qc="start" data-mode="daily">${dailyDone ? 'Retake' : 'Start'}</button>
      </div>

      <div class="section-title">Exam domains <span class="tiny" style="text-transform:none;letter-spacing:0">Target ${MASTERY}%</span></div>
      ${ds.map((d) => `<div class="card qx-domain">
        <div class="qx-dhead"><div><div class="wc-kicker">Domain ${d.d} · ${B.domains[d.d - 1].weight[0]}–${B.domains[d.d - 1].weight[1]}% of exam</div><div class="wc-title">${esc(B.domains[d.d - 1].title)}</div></div>
          ${d.mastered ? `<span class="chip teal">${icon('check')}Mastered</span>` : ''}</div>
        <div class="qx-mrow2"><span class="small muted">Mastery</span><span class="num"><strong>${Math.round(d.mastery)}%</strong></span></div>
        ${masteryBar(d.mastery)}
        <div class="wc-stats">
          <div class="wc-stat"><div class="k">Accuracy</div><div class="v num">${d.seen ? Math.round(d.accuracy) + '%' : '—'}</div></div>
          <div class="wc-stat"><div class="k">Coverage</div><div class="v num">${d.seen}/${d.total}</div></div>
          <div class="wc-stat"><div class="k">All-time</div><div class="v num">${d.answers ? Math.round(d.allTime) + '%' : '—'}</div></div>
        </div>
        <button class="btn btn-sm btn-block" style="margin-top:10px" data-qc="start" data-mode="domain" data-domain="${d.d}">Practise domain ${d.d}</button>
      </div>`).join('')}
      <div class="tiny muted" style="margin:8px 4px 0">Mastery is your latest-answer accuracy, scaled down until you've answered at least ${Math.round(MIN_COVERAGE * 100)}% of the domain's questions.</div>

      <div class="section-title">Quiz modes</div>
      <div class="qx-modes">
        ${['quick', 'standard', 'mock', 'domain', 'weak', 'flagged'].map((k) => {
          const m = MODES[k];
          const extra = k === 'weak' ? ` · ${weakPool().length} available` : k === 'flagged' ? ` · ${q.flagged.length} flagged` : '';
          return `<button class="card qx-mode" data-qc="start" data-mode="${k}"><div class="qx-mode-ic">${icon(m.icon)}</div><div class="t">${m.title}</div><div class="d">${m.desc}${extra}</div></button>`;
        }).join('')}
        <button class="card qx-mode ${ctx.finalUnlocked ? '' : 'locked'}" data-qc="${ctx.finalUnlocked ? 'start' : 'locked'}" data-mode="final">
          <div class="qx-mode-ic">${icon(ctx.finalUnlocked ? 'trophy' : 'x')}</div><div class="t">Final Mock Assessment</div>
          <div class="d">${ctx.finalUnlocked ? MODES.final.desc : 'Unlocks at the end of Week 4 of your study programme'}</div></button>
      </div>

      <div class="section-title">Performance over time</div>
      <div class="card"><div class="chart-wrap">${historyChart(q.attempts)}</div></div>

      <div class="section-title">Recent results ${hist.length > 5 ? `<button class="link-btn" data-qc="hist">${showAllHistory ? 'Show fewer' : `Show all (${hist.length})`}</button>` : ''}</div>
      ${shown.length ? shown.map((t) => `<button class="quiz-item" data-qc="result" data-id="${t.id}">
        <div class="score ${t.pct >= MASTERY ? 'pass' : 'fail'} num">${Math.round(t.pct)}%</div>
        <div class="body"><div class="name">${esc(t.title)}</div><div class="meta">${A.fmtDate(t.date.slice(0, 10))} · ${t.correct}/${t.total} · ${fmtDur(t.durationSec)} · ${t.exam ? 'Exam' : 'Practice'}</div></div>
        ${icon('chevron', 'muted')}</button>`).join('') : '<div class="card empty">No quizzes yet. Start with the daily challenge or a Quick Quiz.</div>'}

      ${weakTopics().length ? `<div class="section-title">Topics to revise</div>
      <div class="card">${weakTopics().map((t) => { const ref = B.refs[t.ref]; return `<div class="qx-rec"><div><div class="t">${esc(t.topic)}</div><div class="tiny muted">${esc(t.obj)} · ${t.c}/${t.n} correct on latest attempt</div></div>${ref ? `<a class="mini-btn" href="${esc(ref[0])}" target="_blank" rel="noopener" aria-label="Open Microsoft Learn">${icon('external')}</a>` : ''}</div>`; }).join('')}</div>` : ''}

      <div class="card qx-disclaimer">
        ${icon('book')}
        <div class="small">These are <strong>original practice questions</strong> written against the official AB-650 skills outline. They aren't Microsoft exam questions. New AI and agent features change often, so always check the linked Microsoft Learn page.
        <a href="${esc(B.studyGuideUrl)}" target="_blank" rel="noopener">Official study guide</a></div>
      </div>`;
  }

  function startSheet(mode, preset = {}) {
    const m = MODES[mode];
    const p = qs().prefs;
    const exam = m.examOnly ? true : m.practiceOnly ? false : (preset.exam != null ? preset.exam : p.exam);
    const diff = preset.diff || p.diff || 'all';
    const domain = preset.domain || p.domain || 1;
    const showDiff = ['quick', 'standard', 'domain', 'weak'].includes(mode);
    const poolCount = () => {
      if (mode === 'domain') return diffFilter(QS.filter((q) => domOf(q) === domain), diff).length;
      if (mode === 'weak') return diffFilter(weakPool(), diff).length;
      if (mode === 'flagged') return qs().flagged.length;
      if (mode === 'week') return QS.filter((q) => WEEK_SECTIONS[preset.week].includes(q.obj.slice(0, 3))).length;
      if (mode === 'mock' || mode === 'final' || mode === 'daily') return QS.length;
      return diffFilter(QS, diff).length;
    };
    const avail = poolCount();
    const n = Math.min(m.count, avail);
    const title = mode === 'week' ? `Week ${preset.week} revision assessment` : m.title;
    const desc = mode === 'week' ? `Questions on this week's topics: ${WEEK_SECTIONS[preset.week].map((s) => B.sections[s]).join('; ')}.` : m.desc;
    A.openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">Quiz Centre</div><h2>${esc(title)}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <p class="small muted" style="margin:0">${esc(desc)}</p>
      ${mode === 'domain' ? `<div class="field"><span class="label">Exam domain</span><div class="qx-seg3">${[1, 2, 3].map((d) => `<button class="${d === domain ? 'active' : ''}" data-qc="sopt" data-k="domain" data-v="${d}"><strong>Domain ${d}</strong><span>${esc(B.domains[d - 1].short)}</span></button>`).join('')}</div></div>` : ''}
      ${m.examOnly || m.practiceOnly ? `<div class="callout info">${m.examOnly ? `Exam mode: timed (${fmtDur(m.minutes * 60)}), and answers are revealed only after you submit. Weighted by the official domain percentages.` : 'Practice mode: you see the answer and explanation straight after each question.'}</div>` : `
      <div class="field"><span class="label">Mode</span><div class="mini-seg qx-seg2">
        <button class="${!exam ? 'active' : ''}" data-qc="sopt" data-k="exam" data-v="0">Practice<span>Instant feedback</span></button>
        <button class="${exam ? 'active' : ''}" data-qc="sopt" data-k="exam" data-v="1">Exam<span>Timed · answers at end</span></button>
      </div></div>`}
      ${showDiff ? `<div class="field"><span class="label">Difficulty</span><div class="mini-seg qx-seg4">${['all', 'easy', 'intermediate', 'advanced'].map((d) => `<button class="${diff === d ? 'active' : ''}" data-qc="sopt" data-k="diff" data-v="${d}">${d === 'all' ? 'All' : DIFF_LABEL[d]}</button>`).join('')}</div></div>` : ''}
      <div class="score-preview"><div><div class="small muted">Questions</div><div class="big num">${n}</div></div>
        <div style="text-align:right"><div class="small muted">${exam && m.minutes ? 'Time limit' : 'Suggested time'}</div><div class="big num">${m.minutes ? fmtDur(Math.round((m.minutes * Math.max(n, 1)) / m.count) * 60) : '~5 min'}</div></div></div>
      ${n < m.count && avail > 0 ? `<div class="tiny muted" style="margin-top:8px">Only ${avail} question${avail === 1 ? '' : 's'} match, so the quiz is shorter.</div>` : ''}
      <button class="btn btn-primary btn-block" style="margin-top:18px" data-qc="go" data-mode="${mode}" data-week="${preset.week || ''}" data-exam="${exam ? 1 : 0}" data-diff="${diff}" data-domain="${domain}" ${n ? '' : 'disabled'}>${icon('play')} Start ${exam ? 'exam' : 'quiz'}</button>`);
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
    if (k === 'locked') { toast('The Final Mock Assessment unlocks at the end of Week 4.', { icon: 'calendar' }); return; }
    if (k === 'start') {
      const mode = el.dataset.mode;
      if (qs().active) { toast('Finish or resume your current quiz first.', { icon: 'clock', action: 'Resume', onAction: openPlayer }); return; }
      startSheet(mode, { week: Number(el.dataset.week) || undefined, domain: Number(el.dataset.domain) || undefined });
      return;
    }
    if (k === 'rec') {
      const a = el.dataset.a;
      if (a === 'resume') { openPlayer(); return; }
      if (a === 'week') { startSheet('week', { week: Number(el.dataset.week) }); return; }
      if (a === 'domain') { startSheet('domain', { domain: Number(el.dataset.domain) }); return; }
      startSheet(a);
      return;
    }
    if (k === 'sopt') {
      const c = startSheet.ctx;
      if (!c) return;
      const v = el.dataset.v;
      if (el.dataset.k === 'exam') c.preset.exam = v === '1';
      if (el.dataset.k === 'diff') c.preset.diff = v;
      if (el.dataset.k === 'domain') c.preset.domain = Number(v);
      const p = qs().prefs;
      if (el.dataset.k === 'exam') p.exam = v === '1';
      if (el.dataset.k === 'diff') p.diff = v;
      if (el.dataset.k === 'domain') p.domain = Number(v);
      A.save();
      startSheet(c.mode, c.preset);
      return;
    }
    if (k === 'go') {
      startSession({ mode: el.dataset.mode, exam: el.dataset.exam === '1', diff: el.dataset.diff, domain: Number(el.dataset.domain) || 1, week: Number(el.dataset.week) || null });
    }
  });

  // ---------------------------------------------------------------
  // Register with the app
  // ---------------------------------------------------------------
  A.registerView('quiz', {
    label: 'Quiz Centre', short: 'Quiz', icon: 'target', render: renderQuizView,
    eyebrow: () => 'AB-650 exam preparation',
  });

  A.hooks.dashboard.push((o) => {
    const rd = readiness();
    const dailyDone = qs().daily[todayISO()];
    const rec = recommendation(o);
    return `<div class="section-title">AB-650 exam readiness <span class="tiny" style="text-transform:none;letter-spacing:0">${rd.masteredCount}/3 mastered</span></div>
      <div class="card qx-dash">
        ${rd.ds.map((d) => `<div class="qx-dash-row"><span class="label">D${d.d} <span class="muted">${esc(B.domains[d.d - 1].short)}</span></span><span class="num small">${Math.round(d.mastery)}%</span></div>${masteryBar(d.mastery)}`).join('')}
        <div class="small muted" style="margin-top:10px">Next: ${esc(rec.title)}</div>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn-sm ${dailyDone ? '' : 'btn-teal'}" data-qc="start" data-mode="daily">${icon(dailyDone ? 'check' : 'flame')} ${dailyDone ? 'Daily done' : 'Daily challenge'}</button>
          <button class="btn btn-sm" data-nav="quiz">${icon('target')} Quiz Centre</button>
        </div>
      </div>`;
  });

  A.hooks.load.push(() => { qs(); });
  A.hooks.reset.push((state) => { delete state.quiz; qs(); });
  A.hooks.ready.push(() => {
    // Player controls live in #quiz-player; the question navigator lives in the shared bottom sheet.
    document.addEventListener('click', (e) => { if (e.target.closest('#quiz-player, #sheet-body')) onPlayerClick(e); });
    document.addEventListener('change', (e) => { if (e.target.closest('#quiz-player')) onPlayerChange(e); });
    const s = qs().active;
    if (s && s.limitSec && remainingSec(s) <= 0) {
      // Timer expired while the app was closed: submit automatically
      setTimeout(() => { toast('Your exam timer ran out while the app was closed. It has been submitted.', { icon: 'clock', ms: 5000 }); finishSession('timeout'); }, 300);
    }
  });

  A.addAchievement({ id: 'qc-first', t: 'First practice quiz', d: 'Complete a Quiz Centre quiz', icon: 'target', test: () => qs().attempts.length >= 1 });
  A.addAchievement({ id: 'qc-daily7', t: '7-day quiz streak', d: 'Daily challenge 7 days running', icon: 'flame', test: () => dailyStreak() >= 7 });
  A.addAchievement({ id: 'qc-mock85', t: 'Mock exam at 85%+', d: 'Score 85% or more on a full mock', icon: 'trophy', test: () => qs().attempts.some((t) => (t.mode === 'mock' || t.mode === 'final') && t.pct >= MASTERY) });
  A.addAchievement({ id: 'qc-ready', t: 'AB-650 ready', d: 'All three domains at 85% mastery', icon: 'star', test: () => readiness().ready });

  // Testing hook
  window.__quizCentre = { qs, readiness, allDomainStats, isCorrect, isAnswered, selectQuestions, weightedCounts, startSession, finishSession, recommendation, programmeContext, QMAP };
})();
