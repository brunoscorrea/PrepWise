/* In-page browser test for the SC-300 and MD-102 profiles.
   Run on a FRESH origin (it clears localStorage), for example:
     python -m http.server 8765   →  http://localhost:8765/index.html
   then in the page console (or a Playwright evaluate):
     const s = await (await fetch('tests/browser-multicert.js')).text(); eval(s); await __mc.run();
   Repeat (reloading the page whenever it returns next: 'reload') until next === 'done'.
   Results accumulate in sessionStorage['__mc'] and are printed by __mc.report(). */
(() => {
  const KEY = '__mc';
  const load = () => JSON.parse(sessionStorage.getItem(KEY) || '{"stage":0,"results":[],"tmp":{}}');
  const keep = (st) => sessionStorage.setItem(KEY, JSON.stringify(st));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = () => window.PrepWise;
  const QC = () => window.__quizCentre;
  const S = () => window.PrepWiseSchema || window.PrepWiseS;

  function answerAll(correct) {
    const s = QC().qs().active;
    s.items.forEach((it, i) => {
      const q = QC().QMAP.get(it.q);
      let r;
      if (q.type === 'single' || q.type === 'multi') r = correct ? [...q.ans] : [q.opts.findIndex((_, k) => !q.ans.includes(k))];
      else { const n = (q.type === 'order' ? q.opts : q.pairs).length; r = [...Array(n).keys()]; if (!correct) r.reverse(); }
      s.resp[i] = r;
    });
    QC().finishSession();
  }
  const ids = (list) => list.map((q) => q.id);
  // Clear storage and stop the app's pagehide/visibility save from writing the old store back before the reload.
  // A ready-made local profile skips the first-run welcome screen.
  const wipe = () => { localStorage.clear(); localStorage.setItem('prepwise:profiles', JSON.stringify({ schema: 1, active: 'ptestprofile1', profiles: [{ id: 'ptestprofile1', name: 'Tester', ns: 'p' }] })); const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === window.localStorage) return; return real.call(this, k, v); }; };

  const stages = [
    // 0: start from an empty origin
    async (t) => { wipe(); t('setup: storage cleared', true); return 'reload'; },

    // 1: fresh install, seed AB-650 progress, then simulate the store of an older version (no SC-300/MD-102)
    async (t, st) => {
      const store = A().store;
      t('fresh install: storage really started empty (no prior progress)', ['ab-650', 'sc-300', 'md-102'].every((id) => !store.progress[id] || !(store.progress[id].quiz && store.progress[id].quiz.attempts && store.progress[id].quiz.attempts.length)));
      t('fresh install: AB-650, SC-300 and MD-102 built-ins present', ['ab-650', 'sc-300', 'md-102'].every((id) => store.certs[id] && store.certs[id].builtin === id));
      t('fresh install: question counts 167 / ≥120 / ≥120', A().getQuestions('ab-650').length === 167 && A().getQuestions('sc-300').length >= 120 && A().getQuestions('md-102').length >= 120,
        [A().getQuestions('ab-650').length, A().getQuestions('sc-300').length, A().getQuestions('md-102').length].join('/'));
      A().switchCert('ab-650', { toast: false, view: 'home' }); await wait(200);
      const s0 = A().state.sessions[0];
      s0.status = 'completed'; s0.notes = 'keep-me'; s0.actualSec = 1800; A().save(true);
      QC().startSession({ mode: 'quick', exam: false }); await wait(100); answerAll(true); await wait(150);
      st.tmp.ab = JSON.stringify(A().store.progress['ab-650']);
      st.tmp.abBankIds = ids(A().getQuestions('ab-650')).join(',');
      // Older-version store: remove the two new profiles as if they never existed
      delete store.certs['sc-300']; delete store.certs['md-102']; delete store.progress['sc-300']; delete store.progress['md-102'];
      A().save(true);
      t('upgrade simulation: SC-300 and MD-102 removed from the stored data', !JSON.parse(localStorage.getItem(A().STORE_KEY)).certs['sc-300']);
      return 'reload';
    },

    // 2: after "upgrade": new profiles added, AB-650 untouched; SC-300 quizzes, separation, guides
    async (t, st) => {
      const store = A().store;
      t('upgrade: SC-300 and MD-102 installed automatically', !!store.certs['sc-300'] && !!store.certs['md-102']);
      t('upgrade: AB-650 progress byte-for-byte unchanged', JSON.stringify(store.progress['ab-650']) === st.tmp.ab);
      t('upgrade: AB-650 bank unchanged (167 ids, same order)', ids(A().getQuestions('ab-650')).join(',') === st.tmp.abBankIds);
      const abAttempts = store.progress['ab-650'].quiz.attempts.length;

      for (const [id, prefix, nDom] of [['sc-300', 'SC300-', 4], ['md-102', 'MD102-', 5]]) {
        A().switchCert(id, { toast: false, view: 'home' }); await wait(250);
        const all = QC().QS;
        t(`${id}: active bank contains only ${prefix} questions`, all.length >= 120 && all.every((q) => q.id.startsWith(prefix)), all.length);
        const sel = (cfg) => QC().selectQuestions(cfg);
        t(`${id}: Quick 10 / Standard 25 / Daily 5`, sel({ mode: 'quick', diff: 'all' }).length === 10 && sel({ mode: 'standard', diff: 'all' }).length === 25 && sel({ mode: 'daily' }).length === 5);
        const mock = sel({ mode: 'mock' });
        const want = QC().weightedCounts(50);
        const got = {}; mock.forEach((q) => { got[q.domain] = (got[q.domain] || 0) + 1; });
        t(`${id}: Full Mock 50 follows the domain weightings`, mock.length === 50 && Object.keys(want).every((d) => got[d] === want[d]) && mock.every((q) => q.id.startsWith(prefix)), JSON.stringify({ want, got }));
        const domOk = A().cert.exam.domains.every((d) => { const l = sel({ mode: 'domain', domain: d.id, diff: 'all' }); return l.length > 0 && l.every((q) => q.domain === d.id && q.id.startsWith(prefix)); });
        t(`${id}: ${nDom} domain quizzes contain only their own domain`, A().cert.exam.domains.length === nDom && domOk);
        t(`${id}: week revision quizzes use this certification only`, [1, 2, 3, 4].every((w) => { const l = sel({ mode: 'week', week: w }); return l.length > 0 && l.every((q) => q.id.startsWith(prefix)); }));
        // Multi-select scoring through the real engine
        const multis = all.filter((q) => q.type === 'multi');
        const multiOk = multis.every((q) => {
          const wrong = q.opts.findIndex((_, k) => !q.ans.includes(k));
          return QC().isCorrect(q, [...q.ans].reverse()) && !QC().isCorrect(q, q.ans.slice(1)) && !QC().isCorrect(q, [...q.ans, wrong]) && !QC().isCorrect(q, []);
        });
        t(`${id}: multiple-select scoring (all correct only; partial or extra = wrong) for ${multis.length} questions`, multis.length > 0 && multiOk);
        // Exam-mode timer and deferred feedback
        QC().startSession({ mode: 'standard', exam: true }); await wait(100);
        const act = QC().qs().active;
        t(`${id}: exam mode has a timer and deferred feedback`, act.exam === true && act.limitSec > 0);
        answerAll(true); await wait(150);
        QC().startSession({ mode: 'quick', exam: false }); await wait(100); answerAll(false); await wait(150);
        const weak = sel({ mode: 'weak', diff: 'all' });
        t(`${id}: Weak Areas quiz built from this certification\'s mistakes`, weak.length > 0 && weak.every((q) => q.id.startsWith(prefix)));
        const rd = QC().readiness();
        t(`${id}: readiness has ${nDom} domains with an 85% target`, rd.ds.length === nDom && (A().state.settings.masteryTarget === 85));
        const recs = QC().studyRecommendations ? QC().studyRecommendations() : [];
        t(`${id}: next-topic recommendations come from this certification`, Array.isArray(recs) ? recs.length > 0 : !!recs);
        // Study guide in the session sheet
        A().navigate('plan'); await wait(250);
        const s0 = A().state.sessions.find((s) => s.week === 1 && s.day === 0);
        const btn = document.querySelector(`#view-plan [data-id="${s0.id}"]`);
        if (btn) btn.click(); await wait(300);
        const body = document.querySelector('#sheet-body');
        t(`${id}: session sheet shows the study guide with Microsoft Learn links and an exercise`, !!body && /Study guide/.test(body.textContent) && !!body.querySelector('.session-guide a[href^="https://learn.microsoft.com/"]') && /Practical exercise/.test(body.textContent));
        A().closeSheet(); await wait(150);
        t(`${id}: plan defaults to 4 weeks, 10.5 h per week`, A().state.weeks.length === 4 && A().state.sessions.filter((s) => s.week === 1).reduce((a, s) => a + s.plannedMin, 0) === 630);
      }
      // Separate histories
      const P = A().store.progress;
      t('histories: AB-650 attempts unchanged', P['ab-650'].quiz.attempts.length === abAttempts);
      t('histories: SC-300 and MD-102 each have exactly their own 2 attempts', P['sc-300'].quiz.attempts.length === 2 && P['md-102'].quiz.attempts.length === 2
        && P['sc-300'].quiz.attempts.every((a) => a.cert === 'sc-300' && a.items.every((i) => i.q.startsWith('SC300-')))
        && P['md-102'].quiz.attempts.every((a) => a.cert === 'md-102' && a.items.every((i) => i.q.startsWith('MD102-'))));
      t('histories: question stats never mix certifications', Object.keys(P['sc-300'].quiz.stats).every((k) => k.startsWith('SC300-')) && Object.keys(P['md-102'].quiz.stats).every((k) => k.startsWith('MD102-')) && Object.keys(P['ab-650'].quiz.stats).every((k) => !/^(SC300|MD102)-/.test(k)));
      // Library cards
      A().navigate('certs'); await wait(250);
      const cards = [...document.querySelectorAll('#view-certs .cert-card')];
      const card = (code) => cards.find((c) => c.textContent.includes(code));
      t('library: SC-300 and MD-102 cards show code, title, description, progress, quiz score, domains and last studied',
        ['SC-300', 'MD-102'].every((code) => { const c = card(code); return c && c.querySelector('.cc-desc') && /domains/.test(c.textContent) && /Quiz \d+%/.test(c.textContent) && /Studied/.test(c.textContent); }));
      // Export files
      const Sc = window.PrepWiseSchema;
      const banks = {};
      const backup = Sc.backupFile(A().store, banks);
      st.tmp.backup = JSON.stringify(backup);
      st.tmp.before = JSON.stringify({ sc: P['sc-300'], md: P['md-102'], ab: P['ab-650'] });
      for (const id of ['sc-300', 'md-102']) {
        const f = Sc.certificationFile(A().store.certs[id], A().getQuestions(id));
        const r = Sc.parseImport(JSON.stringify(f));
        t(`${id}: profile export re-imports (${r.summary && r.summary.questions} questions, no personal data)`, r.ok && r.summary.questions === A().getQuestions(id).length && !('progress' in f) && f.questions.every((q) => q.cert === id));
        const pf = Sc.progressFile(id, JSON.parse(JSON.stringify(P[id])));
        const pr = Sc.parseImport(JSON.stringify(pf));
        t(`${id}: progress export validates`, pr.ok && pr.kind === 'progress');
      }
      wipe();
      return 'reload';
    },

    // 3: restore the backup through the real import UI
    async (t, st) => {
      const pre = A().store.progress;
      t('import: device really empty before restore (no SC-300/MD-102 attempts)', ['sc-300', 'md-102'].every((id) => !pre[id] || !pre[id].quiz || !(pre[id].quiz.attempts || []).length));
      const input = document.getElementById('import-file');
      const realClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () { if (this.id !== 'import-file') return realClick.call(this); };
      A().navigate('certs'); await wait(250);
      const trigger = document.querySelector('[data-action="import-any"]');
      t('import: import button available', !!trigger);
      trigger.click(); await wait(50);
      const dt = new DataTransfer();
      dt.items.add(new File([st.tmp.backup], 'prepwise-backup-test.json', { type: 'application/json' }));
      input.files = dt.files; input.dispatchEvent(new Event('change')); await wait(400);
      // Since v2.2 a backup is imported as a new profile by default; restore into this one instead.
      const replace = document.querySelector('#dialog-root [data-c="replace"]');
      t('import: backup offers "new profile" and "replace this profile"', !!replace && !!document.querySelector('#dialog-root [data-c="new"]'));
      if (replace) replace.click(); await wait(150);
      const req = document.getElementById('dlg-req');
      if (req) { req.value = 'RESTORE'; req.dispatchEvent(new Event('input', { bubbles: true })); }
      await wait(100);
      const ok = document.querySelector('#dialog-root [data-d="1"]');
      if (ok) ok.click(); await wait(600);
      HTMLInputElement.prototype.click = realClick;
      const P = A().store.progress;
      const before = JSON.parse(st.tmp.before);
      t('import: backup restores SC-300 progress and quiz history', JSON.stringify(P['sc-300'] && P['sc-300'].quiz.attempts) === JSON.stringify(before.sc.quiz.attempts));
      t('import: backup restores MD-102 progress and quiz history', JSON.stringify(P['md-102'] && P['md-102'].quiz.attempts) === JSON.stringify(before.md.quiz.attempts));
      t('import: backup restores AB-650 progress', JSON.stringify(P['ab-650'] && P['ab-650'].sessions) === JSON.stringify(before.ab.sessions));
      return 'done';
    },
  ];

  window.__mc = {
    async run() {
      const st = load();
      const t = (name, ok, info) => { st.results.push({ name, ok: !!ok, info: ok ? '' : String(info == null ? '' : info) }); };
      if (st.stage >= stages.length) return { next: 'done', report: this.report() };
      if (!A() || !A().store) return { next: 'reload', error: 'app not ready' };
      let next;
      try { next = await stages[st.stage](t, st); } catch (e) { t(`stage ${st.stage} threw`, false, e && e.stack); next = 'done'; st.stage = stages.length - 1; }
      st.stage++; keep(st);
      return { next, stage: st.stage, report: next === 'done' ? this.report() : undefined };
    },
    report() { const st = load(); const pass = st.results.filter((r) => r.ok).length; return { pass, total: st.results.length, failed: st.results.filter((r) => !r.ok) }; },
    reset() { sessionStorage.removeItem(KEY); },
  };
})();
