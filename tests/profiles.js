/* Local profiles, privacy and isolation — real-browser test.

   Runs PrepWise in headless Microsoft Edge or Chrome through the DevTools
   protocol. No npm packages are needed (Node 22+ for the built-in WebSocket).

     node tests/profiles.js            (from the repository root or tests/)
     BROWSER=/path/to/chrome node tests/profiles.js

   Every scenario uses its own fresh browser context (like separate browsers
   or devices), all opening the same served copy of the app. */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { serve, launch, newPage, sleep } = require('./cdp.js');

const results = [];
const t = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${!ok && detail ? `  [${String(detail).slice(0, 300)}]` : ''}`); };

// In-page snippets
const QUIZ = (mode = 'quick', correct = true) => `
  const QC = window.__quizCentre;
  QC.startSession({ mode: '${mode}', exam: false });
  await new Promise((r) => setTimeout(r, 120));
  const s = QC.qs().active;
  s.items.forEach((it, i) => {
    const q = QC.QMAP.get(it.q); let r;
    if (q.type === 'single' || q.type === 'multi') r = ${correct} ? [...q.ans] : [q.opts.findIndex((_, k) => !q.ans.includes(k))];
    else { const n = (q.type === 'order' ? q.opts : q.pairs).length; r = [...Array(n).keys()]; if (!${correct}) r.reverse(); }
    s.resp[i] = r;
  });
  QC.finishSession();
  await new Promise((r) => setTimeout(r, 150));
  return true;`;
const SWITCH_CERT = (id) => `PrepWise.switchCert('${id}', { toast: false, view: 'home' }); await new Promise((r) => setTimeout(r, 200)); return PrepWise.cert.id;`;
const ATTEMPTS = "const o = {}; for (const id of ['ab-650', 'sc-300', 'md-102']) { const p = PrepWise.store.progress[id]; o[id] = p && p.quiz && p.quiz.attempts ? p.quiz.attempts.length : 0; } return o;";
const TITLE = "return document.querySelector('#topbar-title').textContent";
const ALL_STORAGE = 'const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o;';
const PERSONAL = /bruno|correa|b\.correa|@gmail\.com/i;
// Paths where two JSON values differ (for failure details).
function diff(a, b, p = '', out = []) {
  if (typeof a === 'string' && typeof b === 'string' && p === '') { a = JSON.parse(a); b = JSON.parse(b); }
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => diff(a[k], b[k], `${p}.${k}`, out));
  } else out.push(`${p}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`.slice(0, 160));
  return out;
}

async function onboard(page, name) {
  await page.waitFor("return !!document.getElementById('ob-name')");
  await page.type('#ob-name', name);
  await page.eval("document.getElementById('ob-go').click()");
  await page.waitFor("return !document.getElementById('onboard-root') && document.documentElement.dataset.ready === '1'");
}

async function nameDialog(page, name) {
  await page.waitFor("return !!document.getElementById('dlg-name')");
  await page.type('#dlg-name', name);
  await page.eval("document.getElementById('dlg-name').dispatchEvent(new Event('input'))");
}

// Pick a file through the app's own import button (file chooser intercepted).
async function importFile(page, file, actionSelector) {
  const chooser = page.cdp.wait('Page.fileChooserOpened', page.sessionId);
  await page.eval(`document.querySelector(${JSON.stringify(actionSelector)}).click()`);
  const { backendNodeId } = await chooser;
  await page.send('DOM.setFileInputFiles', { files: [file], backendNodeId });
}

const noOverflow = "return document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1";

// ---------------------------------------------------------------- scenarios
(async () => {
  const srv = await serve();
  const URL0 = `http://127.0.0.1:${srv.port}/`;
  const br = await launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prepwise-files-'));
  try {
    // 1–3. Two completely fresh browser contexts open the same deployed app.
    const A = await newPage(br.cdp);
    const B = await newPage(br.cdp, { width: 375, height: 812, mobile: true });
    await A.goto(URL0); await A.ready();
    await B.goto(URL0); await B.ready();
    for (const [p, label] of [[A, 'browser A'], [B, 'browser B (mobile)']]) {
      t(`1 onboarding: ${label} shows the welcome screen on first launch`, await p.eval("return !!document.getElementById('onboard-root') && document.body.classList.contains('onboarding')"));
      t(`1 onboarding: ${label} start button disabled until a name is typed`, await p.eval("return document.getElementById('ob-go').disabled"));
      t(`10 no personal data: ${label} welcome screen and storage have no personal information`, !PERSONAL.test(await p.eval('return document.body.innerText')) && !PERSONAL.test(JSON.stringify(await p.eval(ALL_STORAGE))));
      t(`5 layout: ${label} welcome screen has no horizontal scroll`, await p.eval(noOverflow));
    }
    t('1 onboarding: privacy statement is shown on the welcome screen', (await A.eval('return document.body.innerText')).includes('stored locally in this browser'));
    await onboard(A, 'Bruno');
    t('2 greeting: Bruno sees "Good afternoon, Bruno"', (await A.eval(TITLE)) === 'Good afternoon, Bruno', await A.eval(TITLE));
    await onboard(B, 'Alex');
    t('3 greeting: a second user sees "Good afternoon, Alex"', (await B.eval(TITLE)) === 'Good afternoon, Alex', await B.eval(TITLE));
    t('5 layout: the full greeting is visible on a 375px phone (not cut off)', await B.eval("const h = document.querySelector('#topbar-title'); return h.scrollWidth <= h.clientWidth + 1 && h.scrollHeight <= h.clientHeight + 1"));
    t('3 greeting: Alex never sees Bruno anywhere (page or storage)', !PERSONAL.test(await B.eval('return document.body.innerText')) && !PERSONAL.test(JSON.stringify(await B.eval(ALL_STORAGE))));
    t('1 onboarding: name is kept after a reload, no second welcome', await (async () => { await A.reload(); return !(await A.eval("return !!document.getElementById('onboard-root')")) && (await A.eval(TITLE)) === 'Good afternoon, Bruno'; })());

    // Bruno studies in browser A on all three certifications.
    await A.eval(SWITCH_CERT('ab-650')); await A.eval(QUIZ('quick'));
    await A.eval(SWITCH_CERT('sc-300')); await A.eval(QUIZ('quick')); await A.eval(QUIZ('standard', false));
    await A.eval(SWITCH_CERT('md-102')); await A.eval(QUIZ('daily'));
    await A.eval(`for (const id of ['ab-650', 'sc-300', 'md-102']) { const p = PrepWise.store.progress[id]; const s = p.sessions[0]; s.status = 'completed'; s.actualSec = 2400; s.notes = 'bruno-private-' + id;
      p.notes.push({ id: PrepWise.uid(), title: 'Bruno note ' + id, body: 'bruno-private-note', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      p.bookmarks.topics.push({ id: PrepWise.uid(), text: 'bruno-bookmark-' + id }); }
      PrepWise.checkAchievements(true); PrepWise.save(true); return true;`);
    const brunoAttempts = await A.eval(ATTEMPTS);
    t('5 progress: Bruno has quiz history on AB-650, SC-300 and MD-102', brunoAttempts['ab-650'] === 1 && brunoAttempts['sc-300'] === 2 && brunoAttempts['md-102'] === 1, JSON.stringify(brunoAttempts));
    const brunoProgress = await A.eval('return JSON.stringify(PrepWise.store.progress)');
    t('4 isolation: browser B (Alex) has no quiz history at all', JSON.stringify(await B.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': 0, 'sc-300': 0, 'md-102': 0 }));
    t('4 isolation: browser B storage has no trace of Bruno\'s notes or profile', !/bruno/i.test(JSON.stringify(await B.eval(ALL_STORAGE))));
    t('4 isolation: browser B lists only its own profile', JSON.stringify((await B.eval('return PrepWise.profiles')).map((p) => p.name)) === '["Alex"]');

    // 4–6. A second local profile in the SAME browser (A): create Sam through the UI.
    await A.eval("PrepWise.navigate('settings'); return true");
    t('5 settings: profile section shows the privacy text', (await A.eval("return document.getElementById('set-profile').innerText")).includes('Your study progress and personal notes are stored locally in this browser. They are not automatically shared with other PrepWise users. Use Export Backup to transfer your progress to another device.'));
    await A.eval("document.querySelector('[data-action=\"profile-new\"]').click(); return true");
    await nameDialog(A, 'Sam');
    await A.reloadByApp("document.querySelector('#dialog-root [data-d=\"1\"]').click(); return true");
    t('4 profiles: new profile Sam opens with "Good afternoon, Sam"', (await A.eval(TITLE)) === 'Good afternoon, Sam', await A.eval(TITLE));
    t('4 profiles: Sam inherits no quiz history', JSON.stringify(await A.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': 0, 'sc-300': 0, 'md-102': 0 }), JSON.stringify(await A.eval(ATTEMPTS)));
    t('4 profiles: Sam inherits no sessions, notes or bookmarks', await A.eval("return Object.values(PrepWise.store.progress).every((p) => !p.notes.length && !p.bookmarks.topics.length && p.sessions.every((s) => s.status === 'pending' && !s.notes && !s.actualSec))"));
    t('10 no personal data: Sam\'s pages show nothing of Bruno', await (async () => { for (const v of ['home', 'plan', 'quiz', 'analytics', 'revision', 'settings']) { await A.eval(`PrepWise.navigate('${v}'); return true`); await sleep(120); const txt = await A.eval('return document.querySelector("main").innerText'); if (/bruno-private|bruno-bookmark|Bruno note/.test(txt)) return false; } return true; })());
    t('4 profiles: AB-650, SC-300 and MD-102 are all available to Sam', await A.eval("return ['ab-650', 'sc-300', 'md-102'].every((id) => PrepWise.store.certs[id] && PrepWise.getQuestions(id).length >= 120)"));
    await A.eval(SWITCH_CERT('sc-300')); await A.eval(QUIZ('quick')); await A.eval(QUIZ('quick'));
    await A.eval(SWITCH_CERT('ab-650')); await A.eval(QUIZ('standard'));
    const samAttempts = await A.eval(ATTEMPTS);
    const samProgress = await A.eval('PrepWise.checkAchievements(true); PrepWise.save(true); return JSON.stringify(PrepWise.store.progress)');
    t('4 profiles: Sam builds his own quiz history', samAttempts['sc-300'] === 2 && samAttempts['ab-650'] === 1 && samAttempts['md-102'] === 0, JSON.stringify(samAttempts));

    // Switch back to Bruno through the switcher.
    const brunoId = await A.eval("return PrepWise.profiles.find((p) => p.name === 'Bruno').id");
    const samId = await A.eval("return PrepWise.profile.id");
    await A.eval("PrepWise.navigate('settings'); return true");
    await A.reloadByApp(`document.querySelector('[data-action="profile-switch"][data-id="${brunoId}"]').click(); return true`);
    t('6 switching: back to "Good afternoon, Bruno"', (await A.eval(TITLE)) === 'Good afternoon, Bruno');
    const brunoBack = await A.eval('return JSON.stringify(PrepWise.store.progress)');
    t('6 switching: Bruno\'s progress is byte-for-byte what it was', brunoBack === brunoProgress, diff(brunoProgress, brunoBack).slice(0, 6).join(' | '));
    t('4 isolation: Bruno\'s quiz history unaffected by Sam\'s quizzes', JSON.stringify(await A.eval(ATTEMPTS)) === JSON.stringify(brunoAttempts));
    // Several round trips.
    let stable = true;
    for (let i = 0; i < 3; i++) {
      await A.reloadByApp(`PrepWise.switchProfile('${samId}'); return true`);
      stable = stable && (await A.eval('return JSON.stringify(PrepWise.store.progress)')) === samProgress && (await A.eval(TITLE)) === 'Good afternoon, Sam';
      await A.reloadByApp(`PrepWise.switchProfile('${brunoId}'); return true`);
      stable = stable && (await A.eval('return JSON.stringify(PrepWise.store.progress)')) === brunoProgress && (await A.eval(TITLE)) === 'Good afternoon, Bruno';
    }
    t('6 switching: 3 round trips keep both profiles exactly as they were', stable);
    const keysA = Object.keys(await A.eval(ALL_STORAGE));
    t('4 isolation: each profile has its own storage namespace', keysA.includes(`prepwise:p:${brunoId}:store`) && keysA.includes(`prepwise:p:${samId}:store`) && !keysA.includes('prepwise:v2'), keysA.join(', '));
    t('4 isolation: Sam\'s stored data contains nothing of Bruno', !/bruno/i.test(await A.eval(`return localStorage.getItem('prepwise:p:${samId}:store')`)));

    // Rename in Settings.
    await A.eval("PrepWise.navigate('settings'); const i = document.getElementById('profile-name'); i.value = 'Bruno C'; i.dispatchEvent(new Event('change', { bubbles: true })); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 300)); return true");
    await A.eval("PrepWise.navigate('home'); return true");
    t('2 settings: changing the name updates the greeting', (await A.eval(TITLE)) === 'Good afternoon, Bruno C', await A.eval(TITLE));
    await A.reload();
    t('2 settings: the new name persists after reload', (await A.eval(TITLE)) === 'Good afternoon, Bruno C' && (await A.eval('return PrepWise.profile.name')) === 'Bruno C');
    await A.eval("PrepWise.navigate('settings'); const i = document.getElementById('profile-name'); i.value = 'Bruno'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 300)); PrepWise.navigate('home'); return true");

    // 7. Export Bruno's profile and import it in browser B (Alex).
    await A.eval("PrepWise.navigate('settings'); document.querySelector('#set-profile [data-action=\"export-all\"]').click(); await new Promise((r) => setTimeout(r, 300)); return true");
    const exported = await A.eval('return await window.__lastBlob.text()');
    const file = JSON.parse(exported);
    t('7 export: file is a profile backup with the profile name', file.format === 'prepwise.backup' && file.profile && file.profile.name === 'Bruno', JSON.stringify({ format: file.format, profile: file.profile }));
    t('7 export: contains Bruno\'s three certifications and quiz history', ['ab-650', 'sc-300', 'md-102'].every((id) => file.store.progress[id]) && file.store.progress['sc-300'].quiz.attempts.length === 2);
    t('7 export: contains no other profile (Sam) data', JSON.stringify(file.store.progress) === brunoProgress && !exported.includes(samId));
    const fp = path.join(tmp, 'bruno-backup.json');
    fs.writeFileSync(fp, exported);

    const alexBefore = await B.eval('return JSON.stringify(PrepWise.store.progress)');
    await B.eval("PrepWise.navigate('settings'); return true");
    await importFile(B, fp, '#set-profile [data-action="import-any"]');
    await B.waitFor("return !!document.querySelector('#dialog-root [data-c=\"new\"]')");
    t('7 import: the backup is offered as a NEW profile first', await B.eval("return document.querySelector('#dialog-root .btn-col .btn').dataset.c === 'new'"));
    await B.reloadByApp("document.querySelector('#dialog-root [data-c=\"new\"]').click(); return true");
    t('7 import: browser B now opens the imported Bruno profile', (await B.eval(TITLE)) === 'Good afternoon, Bruno');
    t('7 import: imported progress is identical to the export', (await B.eval('return JSON.stringify(PrepWise.store.progress)')) === brunoProgress);
    const alexId = await B.eval("return PrepWise.profiles.find((p) => p.name === 'Alex').id");
    t('7 import: Alex\'s profile was not overwritten', (await B.eval(`return JSON.parse(localStorage.getItem('prepwise:p:${alexId}:store')).progress`)) && JSON.stringify((await B.eval(`return JSON.parse(localStorage.getItem('prepwise:p:${alexId}:store'))`)).progress) === alexBefore);
    await B.reloadByApp(`PrepWise.switchProfile('${alexId}'); return true`);
    t('7 import: switching back to Alex shows Alex with no history', (await B.eval(TITLE)) === 'Good afternoon, Alex' && JSON.stringify(await B.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': 0, 'sc-300': 0, 'md-102': 0 }));
    // Importing the same backup again never collides with an existing name.
    await B.eval("PrepWise.navigate('settings'); return true");
    await importFile(B, fp, '#set-profile [data-action="import-any"]');
    await B.waitFor("return !!document.querySelector('#dialog-root [data-c=\"new\"]')");
    await B.reloadByApp("document.querySelector('#dialog-root [data-c=\"new\"]').click(); return true");
    t('7 import: a second import gets a distinct name', JSON.stringify((await B.eval('return PrepWise.profiles')).map((p) => p.name).sort()) === JSON.stringify(['Alex', 'Bruno', 'Bruno (2)']));
    // Replace path: requires typed confirmation and only touches the current profile.
    const otherKeysBefore = await B.eval(`const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith('prepwise:p:' + PrepWise.profile.id)) o[k] = localStorage.getItem(k); } delete o['prepwise:profiles']; return o;`);
    await B.eval("PrepWise.navigate('settings'); return true");
    await importFile(B, fp, '#set-profile [data-action="import-any"]');
    await B.waitFor("return !!document.querySelector('#dialog-root [data-c=\"replace\"]')");
    await B.eval("document.querySelector('#dialog-root [data-c=\"replace\"]').click(); return true");
    await B.waitFor("return !!document.getElementById('dlg-req')");
    t('7 import: replacing a profile needs typed confirmation', await B.eval("return document.querySelector('#dialog-root [data-d=\"1\"]').disabled"));
    await B.type('#dlg-req', 'RESTORE');
    await B.eval("document.getElementById('dlg-req').dispatchEvent(new Event('input')); document.querySelector('#dialog-root [data-d=\"1\"]').click(); await new Promise((r) => setTimeout(r, 400)); return true");
    const otherKeysAfter = await B.eval(`const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith('prepwise:p:' + PrepWise.profile.id)) o[k] = localStorage.getItem(k); } delete o['prepwise:profiles']; return o;`);
    t('7 import: replace changed only the current profile', JSON.stringify(otherKeysBefore) === JSON.stringify(otherKeysAfter) && (await B.eval('return PrepWise.profile.name')) === 'Bruno (2)');

    // Delete a profile: removes only its keys.
    const delId = await B.eval('return PrepWise.profile.id');
    await B.eval("PrepWise.navigate('settings'); document.querySelector('[data-action=\"profile-delete\"]').click(); return true");
    await B.waitFor("return !!document.getElementById('dlg-req')");
    await B.type('#dlg-req', 'DELETE');
    await B.reloadByApp("document.getElementById('dlg-req').dispatchEvent(new Event('input')); document.querySelector('#dialog-root [data-d=\"1\"]').click(); return true");
    const bKeys = Object.keys(await B.eval(ALL_STORAGE));
    t('delete: the deleted profile leaves no keys behind', !bKeys.some((k) => k.includes(delId)) && (await B.eval('return PrepWise.profiles.length')) === 2, bKeys.join(', '));
    t('delete: the remaining profiles are intact', (await B.eval('return PrepWise.profiles.map((p) => p.name).sort().join()')) === 'Alex,Bruno');

    // Reset my profile: clears only the current profile, keeps its name.
    t('delete: after deleting the open profile, the app opens a remaining one', (await B.eval('return PrepWise.profile.id')) === alexId && (await B.eval(TITLE)) === 'Good afternoon, Alex');
    if ((await B.eval('return PrepWise.profile.id')) !== alexId) await B.reloadByApp(`PrepWise.switchProfile('${alexId}'); return true`);
    await B.eval(SWITCH_CERT('md-102')); await B.eval(QUIZ('quick'));
    const importedBrunoId = await B.eval("return PrepWise.profiles.find((p) => p.name === 'Bruno').id");
    const importedBrunoStore = await B.eval(`return localStorage.getItem('prepwise:p:${importedBrunoId}:store')`);
    await B.eval("PrepWise.navigate('settings'); document.querySelector('#set-profile [data-action=\"reset-all\"]').click(); return true");
    await B.waitFor("return !!document.getElementById('dlg-req')");
    await B.type('#dlg-req', 'RESET');
    await B.eval("document.getElementById('dlg-req').dispatchEvent(new Event('input')); document.querySelector('#dialog-root [data-d=\"1\"]').click(); await new Promise((r) => setTimeout(r, 400)); return true");
    t('reset: Alex\'s profile reset keeps the name and clears history', (await B.eval(TITLE)) === 'Good afternoon, Alex' && JSON.stringify(await B.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': 0, 'sc-300': 0, 'md-102': 0 }));
    t('reset: the other profile in the browser is untouched', (await B.eval(`return localStorage.getItem('prepwise:p:${importedBrunoId}:store')`)) === importedBrunoStore);

    // 5. Layout of the profile UI on mobile and desktop.
    for (const [p, label] of [[B, 'mobile 375px'], [A, 'desktop 1280px']]) {
      await p.eval("PrepWise.navigate('settings'); return true"); await sleep(150);
      t(`5 layout: settings with profiles has no horizontal scroll (${label})`, await p.eval(noOverflow));
      // Desktop/tablet: avatar button. Phones: More menu → profile row.
      await p.eval("const b = [...document.querySelectorAll('[data-action=\"profile-menu\"]')].find((x) => x.offsetParent); if (b) b.click(); else { document.querySelector('[data-action=\"more-menu\"]').click(); await new Promise((r) => setTimeout(r, 300)); document.querySelector('#sheet-body .menu-profile').click(); } return true"); await sleep(300);
      t(`5 layout: profile switcher opens and fits (${label})`, await p.eval("const s = document.querySelector('#sheet-root .sheet'); return !document.getElementById('sheet-root').hidden && s.getBoundingClientRect().right <= window.innerWidth + 1 && /New profile/.test(s.innerText)"));
      await p.eval("PrepWise.closeSheet(); return true");
    }
    await B.close();

    // 8. Existing users upgrading: pre-profile v2 store (prepwise:v2) with custom bank and snapshots.
    const C = await newPage(br.cdp);
    await C.goto(`${URL0}manifest.json`);
    const legacyStore = JSON.parse(exported).store; // a real store produced by the app (format unchanged by profiles)
    legacyStore.settings.name = 'Bruno';
    const seeded = { 'prepwise:v2': JSON.stringify(legacyStore), 'prepwise:bank:my-cert': JSON.stringify([{ id: 'X-1', q: 'Seed question?' }]), 'prepwise:snapshots': JSON.stringify([{ at: '2026-11-01T00:00:00Z', reason: 'seed', store: {} }]) };
    await C.eval(`localStorage.clear(); const d = ${JSON.stringify(seeded)}; for (const k in d) localStorage.setItem(k, d[k]); return true`);
    await C.goto(URL0); await C.ready();
    t('8 upgrade (v2): no welcome screen for the existing user', !(await C.eval("return !!document.getElementById('onboard-root')")));
    t('8 upgrade (v2): greeting still says "Good afternoon, Bruno"', (await C.eval(TITLE)) === 'Good afternoon, Bruno');
    t('8 upgrade (v2): AB-650, SC-300 and MD-102 progress preserved exactly', ['ab-650', 'sc-300', 'md-102'].every((id) => true) && (await C.eval("return JSON.stringify(PrepWise.store.progress)")) === JSON.stringify(legacyStore.progress));
    const cKeys = await C.eval(ALL_STORAGE);
    t('8 upgrade (v2): original keys kept in place (adopted, nothing copied or deleted)', cKeys['prepwise:bank:my-cert'] === seeded['prepwise:bank:my-cert'] && cKeys['prepwise:snapshots'] === seeded['prepwise:snapshots'] && !!cKeys['prepwise:v2'] && JSON.stringify(JSON.parse(cKeys['prepwise:v2']).progress) === JSON.stringify(legacyStore.progress));
    const reg = JSON.parse(cKeys['prepwise:profiles']);
    t('8 upgrade (v2): one default profile created and recorded as migrated', reg.profiles.length === 1 && reg.profiles[0].ns === 'legacy' && reg.profiles[0].name === 'Bruno' && reg.migration && reg.migration.from === 'prepwise:v2');
    await C.eval("PrepWise.navigate('settings'); document.querySelector('[data-action=\"profile-new\"]').click(); return true");
    await nameDialog(C, 'Kim');
    await C.reloadByApp("document.querySelector('#dialog-root [data-d=\"1\"]').click(); return true");
    t('8 upgrade (v2): a new profile on the upgraded browser starts empty', (await C.eval(TITLE)) === 'Good afternoon, Kim' && JSON.stringify(await C.eval(ATTEMPTS)) === JSON.stringify({ 'ab-650': 0, 'sc-300': 0, 'md-102': 0 }) && !(await C.eval("return !!PrepWise.store.certs['my-cert']")));
    await C.close();

    // 8. Existing users upgrading from the original v1 AB-650 tracker.
    const D = await newPage(br.cdp);
    await D.goto(`${URL0}manifest.json`);
    const v1 = fs.readFileSync(path.join(__dirname, 'legacy_v1_state.json'), 'utf8');
    await D.eval(`localStorage.clear(); localStorage.setItem('m365-study-tracker:v1', ${JSON.stringify(v1)}); return true`);
    await D.goto(URL0); await D.ready();
    const v1obj = JSON.parse(v1);
    t('8 upgrade (v1): AB-650 user keeps name and greeting', (await D.eval(TITLE)) === `Good afternoon, ${v1obj.settings.name}`);
    t('8 upgrade (v1): AB-650 sessions, notes and quiz attempts preserved', await D.eval(`const p = PrepWise.store.progress['ab-650']; return p.sessions.filter((s) => s.status === 'completed').length === ${v1obj.sessions.filter((s) => s.status === 'completed').length} && p.sessions[0].notes === ${JSON.stringify(v1obj.sessions[0].notes)} && p.quiz.attempts.length === ${v1obj.quiz.attempts.length}`));
    t('8 upgrade (v1): original v1 data untouched and backed up', (await D.eval("return localStorage.getItem('m365-study-tracker:v1')")) === v1 && (await D.eval("return localStorage.getItem('prepwise:backup:v1')")) === v1);
    await D.eval("PrepWise.navigate('settings'); document.querySelector('[data-action=\"profile-new\"]').click(); return true");
    await nameDialog(D, 'Kim');
    await D.reloadByApp("document.querySelector('#dialog-root [data-d=\"1\"]').click(); return true");
    t('8 upgrade (v1): a new profile does NOT inherit the v1 AB-650 data', (await D.eval(TITLE)) === 'Good afternoon, Kim' && (await D.eval("const p = PrepWise.store.progress['ab-650']; return p.quiz === null || !p.quiz.attempts || p.quiz.attempts.length === 0")) && (await D.eval("return PrepWise.store.progress['ab-650'].sessions.every((s) => s.status === 'pending')")));
    await D.eval("PrepWise.navigate('settings'); return true");
    t('8 upgrade (v1): the new profile is not offered the original v1 data download', !(await D.eval("return !!document.querySelector('[data-action=\"export-v1\"]')")));
    // Other profiles' names appear only in the profile switcher (by design: same browser = shared device).
    t('10 no personal data: Kim\'s settings show the other profile only in the switcher', await D.eval(`const main = document.querySelector('main').cloneNode(true); main.querySelectorAll('.profile-list').forEach((n) => n.remove()); return !main.innerText.includes(${JSON.stringify(v1obj.settings.name)})`));
    t('10 no personal data: Kim\'s study pages and stored data contain nothing of the v1 user', await (async () => {
      for (const v of ['home', 'plan', 'quiz', 'analytics', 'revision']) { await D.eval(`PrepWise.navigate('${v}'); return true`); await sleep(120); if ((await D.eval("return document.querySelector('main').innerText")).includes(v1obj.settings.name)) return false; }
      return !(await D.eval('return localStorage.getItem(PrepWise.STORE_KEY)')).includes(v1obj.settings.name);
    })());
    await D.close();

    // 9. PWA installation and offline use (browser A).
    await A.eval("PrepWise.navigate('home'); return true");
    await A.waitFor("return navigator.serviceWorker.ready.then(() => true)");
    await A.reload();
    await A.waitFor('return !!navigator.serviceWorker.controller');
    const sw = await A.eval("const ks = await caches.keys(); const c = await caches.open(ks.find((k) => k.startsWith('prepwise-'))); const r = await c.match('./js/profiles.js'); const m = await (await fetch('manifest.json')).json(); return { ks, profiles: !!r, manifest: m.display, icons: m.icons.length }");
    t('9 PWA: service worker controls the page and caches js/profiles.js', sw.profiles && sw.ks.some((k) => /^prepwise-v2\.2\.0$/.test(k)), JSON.stringify(sw));
    t('9 PWA: manifest is installable (standalone, icons)', sw.manifest === 'standalone' && sw.icons >= 2, JSON.stringify(sw));
    await srv.stop();
    await A.reload();
    t('9 offline: app boots from the cache with the server stopped', (await A.eval(TITLE)) === 'Good afternoon, Bruno');
    t('9 offline: the profile and its progress are available offline', (await A.eval('return JSON.stringify(PrepWise.store.progress)')) === brunoProgress);
    await A.eval(SWITCH_CERT('md-102')); await A.eval(QUIZ('quick'));
    t('9 offline: a quiz runs offline and is saved to the right profile', (await A.eval(ATTEMPTS))['md-102'] === 2 && (await A.eval('return PrepWise.profile.name')) === 'Bruno');
    await A.close();
  } catch (e) {
    t('test run completed without errors', false, e.stack || e.message);
  } finally {
    await br.close();
    try { await srv.stop(); } catch (e) { /* already stopped */ }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} profile tests passed`);
  process.exit(failed.length ? 1 : 0);
})();
