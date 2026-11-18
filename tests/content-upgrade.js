/* Content upgrade and AI-103 integration test — real headless Edge/Chrome (Node 22+, no packages).

     node tests/content-upgrade.js

   1. Serves the previous app (git UPGRADE_FROM, default the last main commit before this change)
      at /prev/ and the current working tree at /cur/ on the SAME origin, so they share storage.
   2. A user studies AB-650 (Udemy-era content), SC-300 and MD-102 in the previous app, bookmarks
      questions that the audit later replaced, adds a resource and renames a session.
   3. The current app opens the same storage and must: keep every result, note and bookmark, move
      bookmarks from retired questions to their replacements, remove Udemy, leave SC-300/MD-102
      untouched, and add AI-103 as an independent certification.
   4. AI-103 is then exercised: all question types score correctly, hints show in practice mode
      only, the study guide renders, export/import keeps AI-103, profiles stay isolated, and the
      app works offline. */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { launch, newPage, sleep, ROOT } = require('./cdp.js');

const FROM = process.env.UPGRADE_FROM || 'ed53a8f';
const results = [];
const diff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i >= a.length && i >= b.length ? '' : `@${i}: ${a.slice(Math.max(0, i - 60), i + 80)}  ≠  ${b.slice(Math.max(0, i - 60), i + 80)}`; };
const t = (name, ok, detail = '') => { results.push({ ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${!ok && detail ? `  [${String(detail).slice(0, 300)}]` : ''}`); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };

function exportRef(ref, dir) {
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { cwd: ROOT }).toString().trim().split('\n');
  files.forEach((f) => { const to = path.join(dir, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, execFileSync('git', ['show', `${ref}:${f}`], { cwd: ROOT, maxBuffer: 64 << 20 })); });
}
function server(port, sites) {
  const socks = new Set();
  const s = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const base = Object.keys(sites).find((b) => u.startsWith(b));
    if (!base) { res.writeHead(404); return res.end(); }
    const f = path.join(sites[base], u.slice(base.length) || 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  s.on('connection', (c) => { socks.add(c); c.on('close', () => socks.delete(c)); });
  return new Promise((r) => s.listen(port, '127.0.0.1', () => r({ stop: () => new Promise((d) => { socks.forEach((c) => c.destroy()); s.close(d); }) })));
}
const QUIZ = (cert, mode = 'quick') => `PrepWise.switchCert('${cert}', { toast: false, view: 'quiz' }); await new Promise((r) => setTimeout(r, 150));
  const QC = window.__quizCentre; QC.startSession({ mode: '${mode}', exam: false }); await new Promise((r) => setTimeout(r, 100));
  const s = QC.qs().active; s.items.forEach((it, i) => { const q = QC.QMAP.get(it.q); s.resp[i] = q.type === 'single' || q.type === 'multi' ? [...q.ans] : [...Array((q.type === 'order' ? q.opts : q.pairs).length).keys()]; });
  QC.finishSession(); await new Promise((r) => setTimeout(r, 150)); return PrepWise.store.progress['${cert}'].quiz.attempts.length;`;
// A certification nobody has opened yet has no progress record; that counts as 0 attempts.
const ATTEMPTS = "const o = {}; for (const id of ['ab-650', 'sc-300', 'md-102', 'ai-103']) { const p = PrepWise.store.progress[id]; o[id] = p && p.quiz && p.quiz.attempts ? p.quiz.attempts.length : 0; } return o;";
async function onboard(p, name) {
  await p.waitFor("return !!document.getElementById('ob-name')");
  await p.type('#ob-name', name); await p.eval("document.getElementById('ob-go').click(); return true");
  await p.waitFor("return document.documentElement.dataset.ready === '1'");
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prepwise-upgrade-'));
  exportRef(FROM, path.join(tmp, 'prev'));
  const PORT = 19000 + Math.floor(Math.random() * 900);
  const O = `http://127.0.0.1:${PORT}`;
  let srv = await server(PORT, { '/prev/': path.join(tmp, 'prev'), '/cur/': ROOT });
  const br = await launch();
  try {
    const A = await newPage(br.cdp, { width: 1280, height: 900 });
    // ---------- 1. Previous version: study and bookmark
    await A.goto(`${O}/prev/`); await A.ready(); await onboard(A, 'Bruno');
    const prevVer = await A.eval('return PrepWise.APP_VERSION');
    const prevAb = await A.eval("const c = PrepWise.store.certs['ab-650']; return { cv: c.contentVersion, udemy: JSON.stringify(c.resources).includes('udemy'), course: PrepWise.store.progress['ab-650'].settings.courseUrl }");
    t(`setup: previous app ${FROM} (v${prevVer}) has Udemy-era AB-650 content ${prevAb.cv}`, prevAb.udemy && /udemy\.com/.test(prevAb.course), JSON.stringify(prevAb));
    for (const c of ['ab-650', 'sc-300', 'md-102']) await A.eval(QUIZ(c));
    await A.eval(`const p = PrepWise.store.progress['ab-650'];
      p.sessions.slice(0, 3).forEach((s, i) => { s.status = 'completed'; s.actualSec = 1800 + i * 60; s.notes = 'my note ' + i; s.completedOn = '2026-11-0' + (i + 2); });
      const custom = p.sessions.find((s) => s.week === 2 && s.day === 1); custom.topic = 'My own topic: Conditional Access deep dive'; custom.status = 'partial';
      p.notes.push({ id: 'n-keep', title: 'Keep me', body: 'personal note', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      p.quiz.flagged = ['D2-035', 'D3-046', 'D1-001'];
      p.quiz.stats['D2-035'] = { n: 3, c: 1, last: 0, at: '2026-11-10' };
      PrepWise.store.certs['ab-650'].resources.push({ id: 'r-mine', title: 'My lab notes', url: 'https://example.com/my-notes', type: 'other', notes: '' });
      PrepWise.save(true); return true;`);
    await A.reload();
    const before = await A.eval(`const s = PrepWise.store; return { ab: JSON.stringify(s.progress['ab-650']), sc: JSON.stringify(s.progress['sc-300']), md: JSON.stringify(s.progress['md-102']), scCert: JSON.stringify(s.certs['sc-300']), mdCert: JSON.stringify(s.certs['md-102']), certs: Object.keys(s.certs).sort() }`);
    t('setup: previous app has AB-650, SC-300 and MD-102 only', JSON.stringify(before.certs) === '["ab-650","md-102","sc-300"]', before.certs.join());

    // ---------- 2. Current version opens the same storage
    await A.goto('about:blank'); await A.goto(`${O}/cur/`); await A.ready();
    t('upgrade: no welcome screen, same profile', !(await A.eval("return !!document.getElementById('onboard-root')")) && (await A.eval('return PrepWise.profile.name')) === 'Bruno');
    const after = await A.eval(`const s = PrepWise.store; return { ab: s.progress['ab-650'], sc: JSON.stringify(s.progress['sc-300']), md: JSON.stringify(s.progress['md-102']), scCert: JSON.stringify(s.certs['sc-300']), mdCert: JSON.stringify(s.certs['md-102']), abCert: s.certs['ab-650'], certs: Object.keys(s.certs).sort() }`);
    const ab0 = JSON.parse(before.ab); const ab1 = after.ab;
    t('upgrade: all four certifications are present', JSON.stringify(after.certs) === '["ab-650","ai-103","md-102","sc-300"]', after.certs.join());
    t('upgrade: SC-300 progress and content unchanged byte for byte', after.sc === before.sc && after.scCert === before.scCert, diff(before.sc, after.sc) + ' | ' + diff(before.scCert, after.scCert));
    t('upgrade: MD-102 progress and content unchanged byte for byte', after.md === before.md && after.mdCert === before.mdCert, diff(before.md, after.md) + ' | ' + diff(before.mdCert, after.mdCert));
    t('upgrade: AB-650 quiz history, statistics (incl. retired questions) and notes preserved', JSON.stringify(ab1.quiz.attempts) === JSON.stringify(ab0.quiz.attempts) && JSON.stringify(ab1.quiz.stats) === JSON.stringify(ab0.quiz.stats) && JSON.stringify(ab1.notes) === JSON.stringify(ab0.notes));
    const sessKeep = (p) => JSON.stringify(p.sessions.map((s) => ({ id: s.id, st: s.status, sec: s.actualSec, n: s.notes, on: s.completedOn, w: s.week, d: s.day })));
    t('upgrade: AB-650 session status, logged time and session notes preserved', sessKeep(ab1) === sessKeep(ab0));
    const custom = ab1.sessions.find((s) => s.week === 2 && s.day === 1);
    t('upgrade: a session topic the user renamed is left exactly as it was', custom.topic === 'My own topic: Conditional Access deep dive' && !custom.tpl);
    const renamed = ab1.sessions.filter((s) => s.tpl);
    t('upgrade: untouched default topics move to the Microsoft Learn plan (with study guides)', renamed.length >= 25 && !ab1.sessions.some((s) => /lecture|udemy/i.test(s.topic)), `${renamed.length} linked`);
    t('upgrade: AB-650 "Continue course" now points to Microsoft Learn', /^https:\/\/learn\.microsoft\.com\/en-us\/training\/courses\/ab-650t00/.test(ab1.settings.courseUrl), ab1.settings.courseUrl);
    t('upgrade: Udemy resource removed, Microsoft Learn resources added, the user\'s own resource kept', !JSON.stringify(after.abCert.resources).includes('udemy') && after.abCert.resources.some((r) => r.id === 'r-mine') && after.abCert.resources.some((r) => /training\/paths/.test(r.url)));
    t('upgrade: AB-650 content version 2.0.0 with source of truth recorded', after.abCert.contentVersion === '2.0.0' && after.abCert.source && after.abCert.source.skillsAsOf === '2026-07-27');
    await A.eval("PrepWise.switchCert('ab-650', { toast: false, view: 'quiz' }); await new Promise((r) => setTimeout(r, 300)); return true");
    const flagged = await A.eval("return PrepWise.store.progress['ab-650'].quiz.flagged");
    t('upgrade: bookmarks on replaced questions move to their replacements', JSON.stringify([...flagged].sort()) === JSON.stringify(['D1-001', 'D2-067', 'D3-064']), JSON.stringify(flagged));
    let pageText = '';
    for (const v of ['home', 'plan', 'resources', 'revision', 'analytics']) { await A.eval(`PrepWise.navigate('${v}'); return true`); await sleep(150); pageText += await A.eval("return document.querySelector('main').innerText + [...document.querySelectorAll('main a')].map((a) => a.href).join(' ')"); }
    t('upgrade: no Udemy text or links anywhere in the AB-650 pages', !/udemy/i.test(pageText), (pageText.match(/.{0,40}udemy.{0,40}/i) || [''])[0]);
    t('upgrade: AI-103 starts empty and independent', JSON.stringify(await A.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': ab0.quiz.attempts.length, 'sc-300': 1, 'md-102': 1, 'ai-103': 0 }), JSON.stringify(await A.eval(ATTEMPTS)));

    // ---------- 3. AI-103 behaves like a first-class certification
    await A.eval("PrepWise.switchCert('ai-103', { toast: false, view: 'home' }); await new Promise((r) => setTimeout(r, 250)); return true");
    const info = await A.eval("return { n: PrepWise.getQuestions('ai-103').length, code: PrepWise.cert.code, chip: document.getElementById('sb-cert').innerText, title: document.getElementById('topbar-title').textContent }");
    t('AI-103: selectable, shown in the certification chip, 216 questions', info.n === 216 && info.code === 'AI-103' && /AI-103/.test(info.chip), JSON.stringify(info));
    const typesOk = await A.eval(`const QC = window.__quizCentre; const all = PrepWise.getQuestions('ai-103');
      const pick = ['single', 'multi', 'order', 'match'].map((t) => all.find((q) => q.type === t).id);
      const run = async (correct) => { QC.startSession({ mode: 'retry', ids: pick, exam: false }); await new Promise((r) => setTimeout(r, 100));
        const s = QC.qs().active; s.items.forEach((it, i) => { const q = QC.QMAP.get(it.q); let r;
          if (q.type === 'single' || q.type === 'multi') r = correct ? [...q.ans] : [q.opts.findIndex((_, k) => !q.ans.includes(k))];
          else { const n = (q.type === 'order' ? q.opts : q.pairs).length; r = [...Array(n).keys()]; if (!correct) r.reverse(); }
          s.resp[i] = r; });
        QC.finishSession(); await new Promise((r) => setTimeout(r, 120)); const a = PrepWise.store.progress['ai-103'].quiz.attempts; return a[a.length - 1].pct; };
      return { right: await run(true), wrong: await run(false) };`);
    t('AI-103: single, multi, order and match questions score correctly', typesOk.right === 100 && typesOk.wrong === 0, JSON.stringify(typesOk));
    for (const m of ['quick', 'standard', 'mock', 'daily']) await A.eval(QUIZ('ai-103', m));
    const mock = await A.eval("const a = PrepWise.store.progress['ai-103'].quiz.attempts.find((x) => x.mode === 'mock'); return { total: a.total, dom: a.byDomain };");
    const want = { 1: 14, 2: 16, 3: 6, 4: 6, 5: 6 };
    t('AI-103: weighted 50-question mock follows the domain weightings', mock.total === 50 && Object.entries(mock.dom).every(([d, v]) => Math.abs(v[1] - want[d]) <= 2), JSON.stringify(mock));
    const hint = await A.eval(`const QC = window.__quizCentre; QC.startSession({ mode: 'quick', exam: false }); await new Promise((r) => setTimeout(r, 200));
      const practice = !!document.querySelector('#quiz-player .qx-hintbox'); QC.finishSession(); await new Promise((r) => setTimeout(r, 150));
      QC.startSession({ mode: 'quick', exam: true }); await new Promise((r) => setTimeout(r, 200));
      const exam = !!document.querySelector('#quiz-player .qx-hintbox'); QC.finishSession(); await new Promise((r) => setTimeout(r, 150)); return { practice, exam };`);
    t('AI-103: hints show in practice mode and stay hidden in exam mode', hint.practice && !hint.exam, JSON.stringify(hint));
    const guide = await A.eval(`PrepWise.navigate('plan'); await new Promise((r) => setTimeout(r, 200));
      const s = PrepWise.state.sessions.find((x) => x.tpl); document.querySelector('[data-action="open-session"][data-id="' + s.id + '"]').click(); await new Promise((r) => setTimeout(r, 250));
      const g = document.querySelector('#sheet-body .session-guide'); const links = g ? [...g.querySelectorAll('a')].map((a) => a.href) : [];
      PrepWise.closeSheet(); return { has: !!g, links: links.length, learn: links.every((u) => u.startsWith('https://learn.microsoft.com/')) };`);
    t('AI-103: study plan sessions open with a Microsoft Learn study guide', guide.has && guide.links > 0 && guide.learn, JSON.stringify(guide));
    const res = await A.eval("return PrepWise.cert.resources.map((r) => r.url)");
    t('AI-103: every resource is a free Microsoft Learn link', res.length >= 10 && res.every((u) => /^https:\/\/(learn\.microsoft\.com|aka\.ms)\//.test(u)), res.join(' '));
    const abAttemptsNow = await A.eval("return PrepWise.store.progress['ab-650'].quiz.attempts.length");
    t('AI-103: its quizzes never touch AB-650, SC-300 or MD-102 history', abAttemptsNow === ab0.quiz.attempts.length && (await A.eval("return PrepWise.store.progress['sc-300'].quiz.attempts.length")) === 1);

    // Export, then import as a new profile
    await A.eval("PrepWise.navigate('settings'); document.querySelector('#set-profile [data-action=\"export-all\"]').click(); await new Promise((r) => setTimeout(r, 300)); return true");
    const exported = JSON.parse(await A.eval('return await window.__lastBlob.text()'));
    const aiN = await A.eval("return PrepWise.store.progress['ai-103'].quiz.attempts.length");
    t('export: profile backup includes AI-103 content and progress', !!exported.store.certs['ai-103'] && aiN > 0 && exported.store.progress['ai-103'].quiz.attempts.length === aiN, `${aiN}`);
    const fp = path.join(tmp, 'backup.json'); fs.writeFileSync(fp, JSON.stringify(exported));
    const chooser = br.cdp.wait('Page.fileChooserOpened', A.sessionId);
    await A.eval("document.querySelector('#set-profile [data-action=\"import-any\"]').click(); return true");
    const { backendNodeId } = await chooser;
    await A.send('DOM.setFileInputFiles', { files: [fp], backendNodeId });
    await A.waitFor("return !!document.querySelector('#dialog-root [data-c=\"new\"]')");
    const load = br.cdp.wait('Page.loadEventFired', A.sessionId, 20000);
    await A.eval("document.querySelector('#dialog-root [data-c=\"new\"]').click(); return true"); await load; await A.ready();
    t('import: the imported profile has the same AI-103 progress', (await A.eval("return PrepWise.profile.name")) === 'Bruno (2)' && (await A.eval("return PrepWise.store.progress['ai-103'].quiz.attempts.length")) === aiN);

    // Profile isolation
    const B = await newPage(br.cdp);
    await B.goto(`${O}/cur/`); await B.ready(); await onboard(B, 'Alex');
    t('isolation: a different browser has AI-103 with no history', JSON.stringify(await B.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': 0, 'sc-300': 0, 'md-102': 0, 'ai-103': 0 }));
    await B.close();

    // Offline
    await A.goto('about:blank'); await A.goto(`${O}/cur/`); await A.ready();
    await A.waitFor('return navigator.serviceWorker.getRegistration().then((r) => !!(r && r.active))', 20000);
    await A.reload(); await A.waitFor('return !!navigator.serviceWorker.controller');
    const cached = await A.eval("let n = 0; for (const k of (await caches.keys()).filter((x) => x.startsWith('prepwise:'))) n += (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname).filter((p) => p.startsWith('/cur/certifications/ai-103/')).length; return n");
    t('offline: all 7 AI-103 files are in the offline cache', cached === 7, `${cached}`);
    const nBefore = await A.eval("return PrepWise.store.progress['ai-103'].quiz.attempts.length");
    await srv.stop();
    await A.goto('about:blank'); await A.goto(`${O}/cur/`); await A.ready();
    const offline = await A.eval(QUIZ('ai-103'));
    t('offline: an AI-103 quiz runs with the server stopped', offline === nBefore + 1, `${nBefore} -> ${offline}`);
    srv = await server(PORT, {});
  } catch (e) {
    t('test run completed without errors', false, e.stack || e.message);
  } finally {
    await br.close(); await srv.stop().catch(() => {});
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} content upgrade tests passed`);
  process.exit(failed ? 1 : 0);
})();
