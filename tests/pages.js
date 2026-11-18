/* GitHub Pages deployment test — real headless Edge/Chrome, no npm packages (Node 22+).

     node tests/pages.js

   Simulates brunoscorrea.github.io with BOTH sites on one origin, served the way
   GitHub Pages serves them (project paths, Cache-Control: max-age=600, 404 elsewhere):
     /m365-study-tracker/  the currently live app (v2.2.0, rebuilt from git LEGACY_REF)
     /PrepWise/            the new build from scripts/build-pages.js
   and checks: data carry-over between the two addresses, PWA paths and scope,
   precaching, offline use, cache isolation between the two copies, the update
   path (no stale files), and the prepared legacy-redirect stub. */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { launch, newPage, sleep, ROOT } = require('./cdp.js');
const { build } = require('../scripts/build-pages.js');

const LEGACY_REF = process.env.LEGACY_REF || '0612add'; // what https://brunoscorrea.github.io/m365-study-tracker/ serves (v2.2.0)
const results = [];
const t = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${!ok && detail ? `  [${String(detail).slice(0, 300)}]` : ''}`); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };

function exportRef(ref, dir) {
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { cwd: ROOT }).toString().trim().split('\n');
  files.forEach((f) => { const to = path.join(dir, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, execFileSync('git', ['show', `${ref}:${f}`], { cwd: ROOT, maxBuffer: 64 << 20 })); });
}

// A GitHub-Pages-like server with swappable sites.
function pagesServer(port, sites) {
  const socks = new Set();
  const s = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const base = Object.keys(sites).find((b) => u.startsWith(b));
    if (!base) { res.writeHead(404); return res.end('404'); }
    const f = path.join(sites[base], u.slice(base.length) || 'index.html');
    if (!f.startsWith(sites[base]) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
    fs.createReadStream(f).pipe(res);
  });
  s.on('connection', (c) => { socks.add(c); c.on('close', () => socks.delete(c)); });
  return new Promise((r) => s.listen(port, '127.0.0.1', () => r({ stop: () => new Promise((d) => { socks.forEach((c) => c.destroy()); s.close(d); }) })));
}

const QUIZ = (cert) => `PrepWise.switchCert('${cert}', { toast: false, view: 'quiz' }); await new Promise((r) => setTimeout(r, 150));
  const QC = window.__quizCentre; QC.startSession({ mode: 'quick', exam: false }); await new Promise((r) => setTimeout(r, 100));
  const s = QC.qs().active; s.items.forEach((it, i) => { const q = QC.QMAP.get(it.q); s.resp[i] = q.type === 'single' || q.type === 'multi' ? [...q.ans] : [...Array((q.type === 'order' ? q.opts : q.pairs).length).keys()]; });
  QC.finishSession(); await new Promise((r) => setTimeout(r, 150)); return PrepWise.store.progress['${cert}'].quiz.attempts.length;`;
const STORAGE = 'const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o;';
// SC-300 and MD-102 byte for byte; for AB-650 everything the learner produced (results, notes, time, bookmarks).
function sameStudy(a, b) {
  const x = JSON.parse(a); const y = JSON.parse(b);
  const mine = (p) => p && JSON.stringify({ quiz: p.quiz, notes: p.notes, s: p.sessions.map((q) => [q.id, q.status, q.actualSec, q.notes, q.completedOn]) });
  return ['sc-300', 'md-102'].every((id) => JSON.stringify(x[id]) === JSON.stringify(y[id])) && mine(x['ab-650']) === mine(y['ab-650']);
}
const PROGRESS = "const o = {}; for (const p of PrepWise.profiles) { o[p.name] = p.id; } return { active: PrepWise.profile.name, profiles: o, progress: JSON.stringify(PrepWise.store.progress) };";
const CACHES = 'const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname); return out;';

async function onboard(p, name) {
  await p.waitFor("return !!document.getElementById('ob-name')");
  await p.type('#ob-name', name); await p.eval("document.getElementById('ob-go').click(); return true");
  await p.waitFor("return document.documentElement.dataset.ready === '1'");
}
async function openFresh(p, url) { await p.goto('about:blank'); await p.goto(url); await p.ready(); }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prepwise-pages-'));
  const dirs = { old: path.join(tmp, 'old'), neu: path.join(tmp, 'new'), neu2: path.join(tmp, 'new2'), stub: path.join(ROOT, 'legacy-redirect') };
  exportRef(LEGACY_REF, dirs.old);
  const v1 = build(dirs.neu);
  const oldVersion = (/const CACHE_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(dirs.old, 'service-worker.js'), 'utf8')) || [])[1];
  t(`setup: old site ${LEGACY_REF} (${oldVersion}) and new build ${v1.version}`, !!oldVersion && /^v\d+\.\d+\.\d+-[0-9a-f]{10}$/.test(v1.version));

  const PORT = 18000 + Math.floor(Math.random() * 1000);
  const ORIGIN = `http://127.0.0.1:${PORT}`;
  const OLD = `${ORIGIN}/m365-study-tracker/`, NEW = `${ORIGIN}/PrepWise/`;
  const sites = { '/m365-study-tracker/': dirs.old, '/PrepWise/': dirs.neu };
  let srv = await pagesServer(PORT, sites);
  const br = await launch();
  try {
    // ---------- 1. Existing user on the old address
    const A = await newPage(br.cdp, { width: 390, height: 844, mobile: true });
    await openFresh(A, OLD);
    await onboard(A, 'Bruno');
    for (const c of ['ab-650', 'sc-300', 'md-102']) await A.eval(QUIZ(c));
    await A.eval("const p = PrepWise.store.progress['ab-650']; p.sessions[0].status = 'completed'; p.sessions[0].notes = 'bruno ab-650 note'; PrepWise.save(true); return true");
    await A.reload();
    await A.waitFor('return !!navigator.serviceWorker.controller');
    const brunoId = await A.eval('return PrepWise.profile.id');
    await A.eval("document.querySelector('[data-action=\"profile-new\"]') || PrepWise.navigate('settings'); PrepWise.navigate('settings'); return true");
    await A.eval("document.querySelector('[data-action=\"profile-new\"]').click(); return true");
    await A.waitFor("return !!document.getElementById('dlg-name')"); await A.type('#dlg-name', 'Sam');
    await A.eval("document.getElementById('dlg-name').dispatchEvent(new Event('input')); return true");
    let load = br.cdp.wait('Page.loadEventFired', A.sessionId, 20000);
    await A.eval("document.querySelector('#dialog-root [data-d=\"1\"]').click(); return true"); await load; await A.ready();
    await A.eval(QUIZ('sc-300'));
    load = br.cdp.wait('Page.loadEventFired', A.sessionId, 20000);
    await A.eval(`PrepWise.switchProfile('${brunoId}'); return true`); await load; await A.ready();
    const before = await A.eval(PROGRESS);
    const storeBefore = await A.eval(STORAGE);
    t('old site: Bruno (AB-650, SC-300, MD-102) and Sam profiles set up on /m365-study-tracker/', before.active === 'Bruno' && Object.keys(before.profiles).sort().join() === 'Bruno,Sam');

    // ---------- 2. Same browser opens the new address
    await openFresh(A, NEW);
    t('new site: no welcome screen — the existing profile opens', !(await A.eval("return !!document.getElementById('onboard-root')")) && (await A.eval("return document.querySelector('#topbar-title').textContent")) === 'Good afternoon, Bruno');
    const after = await A.eval(PROGRESS);
    t('new site: both profiles carried over (same origin, same storage)', JSON.stringify(after.profiles) === JSON.stringify(before.profiles));
    // The new build also moves AB-650 to Microsoft Learn (tests/content-upgrade.js covers that in
    // detail): default topics and the course link change, everything the learner did stays.
    t('new site: Bruno\'s SC-300 and MD-102 progress identical, AB-650 study history identical', sameStudy(after.progress, before.progress), 'progress differs');
    const storeAfter = await A.eval(STORAGE);
    const changed = Object.keys(storeBefore).filter((k) => k !== 'prepwise:profiles' && storeAfter[k] !== storeBefore[k]);
    t('new site: only profile stores changed, and only by the AB-650 content upgrade', changed.every((k) => { try { const x = JSON.parse(storeBefore[k]); const y = JSON.parse(storeAfter[k]); return !!x.progress && sameStudy(JSON.stringify(y.progress), JSON.stringify(x.progress)) && ['sc-300', 'md-102'].every((id) => JSON.stringify(x.certs[id]) === JSON.stringify(y.certs[id])); } catch (e) { return false; } }), changed.join());
    const sam = await A.eval(`return JSON.parse(localStorage.getItem('prepwise:p:${before.profiles.Sam}:store')).progress['sc-300'].quiz.attempts.length`);
    t('new site: Sam\'s SC-300 history carried over', sam === 1);

    // ---------- 3. PWA paths and scope under /PrepWise/
    const reg = await A.waitFor("return navigator.serviceWorker.getRegistration().then((r) => r && r.active && r.active.state === 'activated' ? { scope: r.scope, script: r.active.scriptURL } : null)");
    t('PWA: service worker scope is /PrepWise/', reg.scope === NEW && reg.script === `${NEW}service-worker.js`, JSON.stringify(reg));
    const regs = await A.eval('return (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope).sort()');
    t('PWA: the two sites have separate registrations', JSON.stringify(regs) === JSON.stringify([OLD, NEW].sort()), regs.join());
    const man = await A.eval("const href = document.querySelector('link[rel=manifest]').href; const m = await (await fetch(href)).json(); return { id: new URL(m.id, href).href, start: new URL(m.start_url, href).href, scope: new URL(m.scope, href).href, display: m.display, icons: await Promise.all(m.icons.map(async (i) => (await fetch(new URL(i.src, href))).status)), shortcuts: m.shortcuts.map((s) => new URL(s.url, href).href) }");
    t('PWA: manifest id, start_url and scope resolve under /PrepWise/', man.id === NEW && man.start === `${NEW}index.html` && man.scope === NEW && man.display === 'standalone', JSON.stringify(man));
    t('PWA: manifest icons load and shortcuts stay under /PrepWise/', man.icons.every((s) => s === 200) && man.shortcuts.every((u) => u.startsWith(NEW)));
    await A.reload();
    t('PWA: page controlled by the /PrepWise/ worker', await A.waitFor(`return navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL === '${NEW}service-worker.js'`));
    let cs = await A.eval(CACHES);
    const newCache = `prepwise:/PrepWise/:${v1.version}`;
    const shellFiles = fs.readdirSync(dirs.neu, { recursive: true }).filter((f) => fs.statSync(path.join(dirs.neu, f)).isFile() && !f.startsWith('.') && f !== 'service-worker.js').map((f) => `/PrepWise/${f.split(path.sep).join('/')}`);
    t(`PWA: new cache "${newCache}" holds every app file (${shellFiles.length})`, cs[newCache] && shellFiles.filter((f) => f !== '/PrepWise/index.html').every((f) => cs[newCache].includes(f)) && cs[newCache].includes('/PrepWise/'), JSON.stringify(Object.keys(cs)));
    t('PWA: all 25 certification files precached', (cs[newCache] || []).filter((f) => f.startsWith('/PrepWise/certifications/')).length === 25);
    t('cache isolation: the new site did NOT delete the old site\'s cache', !!cs[`prepwise-${oldVersion}`] && cs[`prepwise-${oldVersion}`].every((f) => f.startsWith('/m365-study-tracker/')));
    t('cache isolation: no cache mixes files from both sites', Object.values(cs).every((list) => !(list.some((f) => f.startsWith('/PrepWise/')) && list.some((f) => f.startsWith('/m365-study-tracker/')))));
    t('build: tests, docs and fixtures are not published', !fs.existsSync(path.join(dirs.neu, 'tests')) && !fs.existsSync(path.join(dirs.neu, 'docs')) && !fs.existsSync(path.join(dirs.neu, 'README.md')));

    // ---------- 4. Offline (server stopped)
    await srv.stop();
    await openFresh(A, `${NEW}#quiz`);
    t('offline: /PrepWise/#quiz opens from the cache', (await A.eval('return PrepWise.currentView')) === 'quiz' && (await A.eval('return PrepWise.profile.name')) === 'Bruno');
    const offQ = [];
    for (const c of ['ab-650', 'sc-300', 'md-102']) offQ.push(await A.eval(QUIZ(c)));
    t('offline: quizzes run on AB-650, SC-300 and MD-102', JSON.stringify(offQ) === '[2,2,2]', JSON.stringify(offQ));
    await A.eval("const s = PrepWise.store.progress['sc-300']; s.notes.push({ id: PrepWise.uid(), title: 'Offline note', body: 'x', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); PrepWise.save(true); PrepWise.navigate('plan'); return true");
    await A.reload();
    t('offline: notes, plan and progress persist across reloads', (await A.eval("return PrepWise.store.progress['sc-300'].notes.length === 1 && document.getElementById('view-plan') !== null && PrepWise.store.progress['sc-300'].quiz.attempts.length === 2")));
    await openFresh(A, OLD);
    t('offline: the old site still opens too (its cache survived)', (await A.eval('return PrepWise.APP_VERSION')) === '2.2.0');
    srv = await pagesServer(PORT, sites);

    // ---------- 5. A visitor who opens the OLD site after the new one
    const B = await newPage(br.cdp);
    await openFresh(B, NEW); await onboard(B, 'Alex');
    await B.reload(); await B.waitFor('return !!navigator.serviceWorker.controller');
    await openFresh(B, OLD); // old v2.2 worker installs and activates now: it deletes "prepwise-*" caches that aren't its own
    await B.waitFor(`return navigator.serviceWorker.getRegistration('${OLD}').then((r) => r && r.active && r.active.state === 'activated')`);
    await sleep(300);
    cs = await B.eval(CACHES);
    t('cache isolation: the old app activating later leaves the new cache intact', !!cs[newCache] && cs[newCache].length >= shellFiles.length, JSON.stringify(Object.keys(cs)));
    await srv.stop();
    await openFresh(B, NEW);
    t('cache isolation: the new site still works offline afterwards', (await B.eval('return PrepWise.profile.name')) === 'Alex');
    srv = await pagesServer(PORT, sites);
    await B.close();

    // ---------- 6. Update within GitHub Pages' 10-minute HTTP cache window
    const app2 = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    fs.cpSync(dirs.neu, dirs.neu2, { recursive: true });
    fs.writeFileSync(path.join(dirs.neu2, 'app.js'), `${app2}\nwindow.__deployMarker = 'second-deploy';\n`);
    const v2 = `${v1.version.split('-')[0]}-deadbeef01`;
    fs.writeFileSync(path.join(dirs.neu2, 'service-worker.js'), fs.readFileSync(path.join(dirs.neu, 'service-worker.js'), 'utf8').replace(v1.version, v2));
    sites['/PrepWise/'] = dirs.neu2;
    await openFresh(A, NEW);
    await A.eval('const r = await navigator.serviceWorker.getRegistration(); await r.update(); return true');
    t('update: the new version is detected', await A.waitFor('return navigator.serviceWorker.getRegistration().then((r) => !!r.waiting)', 15000).catch(() => false));
    t('update: "A new version is available → Update" prompt appears', await A.waitFor("return /new version is available/i.test(document.getElementById('toast-root').innerText)", 6000).catch(() => false));
    const cached = await A.eval(`const r = await (await caches.open('prepwise:/PrepWise/:${v2}')).match('${NEW}app.js'); return r ? (await r.text()).includes('second-deploy') : false`);
    t('update: the new cache holds the NEW app.js (HTTP cache bypassed)', cached);
    load = br.cdp.wait('Page.loadEventFired', A.sessionId, 20000);
    await A.eval("[...document.querySelectorAll('#toast-root button')].find((b) => /update/i.test(b.textContent)).click(); return true");
    await load; await A.ready();
    cs = await A.eval(CACHES);
    t('update: after Update the new code runs', (await A.eval('return window.__deployMarker')) === 'second-deploy');
    t('update: the previous /PrepWise/ cache is removed, the old site\'s is kept', !cs[newCache] && !!cs[`prepwise:/PrepWise/:${v2}`] && !!cs[`prepwise-${oldVersion}`], JSON.stringify(Object.keys(cs)));
    t('update: profiles and progress unchanged', (await A.eval(PROGRESS)).profiles.Sam === before.profiles.Sam && (await A.eval("return PrepWise.store.progress['ab-650'].sessions[0].notes")) === 'bruno ab-650 note');

    // ---------- 7. The prepared redirect stub replaces the old site
    sites['/m365-study-tracker/'] = dirs.stub;
    await A.goto('about:blank');
    await A.send('Page.navigate', { url: `${OLD}#plan` });
    const landed = await A.waitFor(`return location.href.startsWith('${NEW}') && document.documentElement.dataset.ready === '1' ? location.href : false`, 20000).catch(() => false);
    t('redirect: the old address (with the old app installed) ends at /PrepWise/ and keeps #plan', landed === `${NEW}#plan`, landed);
    await sleep(500);
    const regs2 = await A.eval('return (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope)');
    cs = await A.eval(CACHES);
    t('redirect: the old service worker is unregistered', JSON.stringify(regs2) === JSON.stringify([NEW]), regs2.join());
    t('redirect: the old site\'s caches are deleted, the new site\'s kept', !Object.keys(cs).some((k) => k.startsWith('prepwise-')) && !!cs[`prepwise:/PrepWise/:${v2}`], JSON.stringify(Object.keys(cs)));
    t('redirect: all profiles and progress intact', (await A.eval('return PrepWise.profile.name')) === 'Bruno' && Object.keys((await A.eval(PROGRESS)).profiles).sort().join() === 'Bruno,Sam' && (await A.eval("return PrepWise.store.progress['ab-650'].sessions[0].notes")) === 'bruno ab-650 note');
    const C = await newPage(br.cdp);
    await C.goto(`${OLD}#quiz`);
    const fresh = await C.waitFor(`return location.href === '${NEW}#quiz' ? location.href : false`, 15000).catch(() => false);
    t('redirect: a first-time visitor to the old address lands on /PrepWise/#quiz', !!fresh);
    await C.close(); await A.close();
  } catch (e) {
    t('test run completed without errors', false, e.stack || e.message);
  } finally {
    await br.close(); await srv.stop().catch(() => {});
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} Pages deployment tests passed`);
  process.exit(failed.length ? 1 : 0);
})();
