/* =========================================================
   PrepWise — My Certifications, Learning Resources, question manager and
   certification import/export. Uses the documented formats in js/schema.js.
   ========================================================= */
'use strict';

(() => {
  const A = window.PrepWise;
  const S = window.PrepWiseSchema;
  if (!A || !S) return;
  const { icon, esc, toast, confirmDialog, openSheet, closeSheet, bar, plural, fmtDate, relDay, todayISO, uid, clone, download, pickFile } = A;

  const PROVIDERS = ['Microsoft', 'AWS', 'CompTIA', 'Google Cloud', 'Cisco', 'ISC2', 'ISACA', 'Linux Foundation', 'Oracle', 'Salesforce', 'Other'];
  const RTYPE = { course: 'Course', documentation: 'Documentation', 'study-guide': 'Study guide', video: 'Video', lab: 'Lab', 'practice-test': 'Practice test', book: 'Book', other: 'Other' };
  const store = () => A.store;
  const fileDate = () => todayISO();

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  // Turn a certification's current (possibly customised) study plan into a shareable template.
  function derivePlan(id) {
    const p = store().progress[id];
    const c = store().certs[id];
    if (!p) return clone(c.plan);
    return {
      dailyTargets: [...p.settings.dailyTargets],
      studyDays: [...p.settings.studyDays],
      weeks: p.weeks.map((w) => ({
        title: w.title,
        objectives: w.objectives.map((o) => o.text),
        sessions: p.sessions.filter((s) => s.week === w.week).sort((a, b) => a.day - b.day || a.order - b.order)
          .map((s) => ({ day: s.day, topic: s.topic, kind: s.kind, plannedMin: s.plannedMin })),
      })),
    };
  }
  function contentOf(id) {
    const r = store().certs[id];
    return { ...S.normaliseCertification(r), plan: derivePlan(id) };
  }
  const takenIds = () => new Set([...Object.keys(store().certs), ...A.BUILTINS.keys()]);

  function choiceDialog({ title, html = '', choices }) {
    return new Promise((resolve) => {
      const root = document.getElementById('dialog-root');
      root.innerHTML = `<div class="dialog wide" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"><h3 id="dlg-t">${esc(title)}</h3>${html}
        <div class="btn-col">${choices.map((c) => `<button class="btn ${c.cls || ''}" data-c="${esc(c.id)}">${c.icon ? icon(c.icon) : ''}${esc(c.label)}${c.hint ? `<span class="btn-hint">${esc(c.hint)}</span>` : ''}</button>`).join('')}
        <button class="btn btn-ghost" data-c="">Cancel</button></div></div>`;
      root.hidden = false;
      const done = (v) => { root.hidden = true; root.innerHTML = ''; root.onclick = null; root.onkeydown = null; resolve(v); };
      root.onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) done(b.dataset.c || null); else if (e.target === root) done(null); };
      root.onkeydown = (e) => { if (e.key === 'Escape') done(null); };
      root.querySelector('[data-c]').focus();
    });
  }
  const list = (items) => `<ul class="dlg-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  function showErrors(title, errors, warnings = []) {
    return confirmDialog({
      title, ok: '', cancel: 'Close',
      html: `<div class="callout bad">${icon('x')}<div><strong>The file wasn't imported.</strong> Nothing on this device was changed.</div></div>${list(errors)}${warnings.length ? `<div class="tiny muted" style="margin-top:8px">Warnings</div>${list(warnings)}` : ''}`,
    });
  }
  const warnBlock = (w) => (w && w.length ? `<details class="dlg-warn"><summary>${plural(w.length, 'warning')}</summary>${list(w)}</details>` : '');

  function certSummaryHTML(sum) {
    return `<div class="preview">
      <div class="pv-head"><span class="cert-badge">${esc(sum.code)}</span><div><strong>${esc(sum.name)}</strong><div class="tiny muted">${esc(sum.provider)} · id <code>${esc(sum.id)}</code></div></div></div>
      <div class="pv-grid">
        <div><span class="k">Domains</span><span class="v num">${sum.domains}</span></div>
        <div><span class="k">Objectives</span><span class="v num">${sum.objectives}</span></div>
        <div><span class="k">Plan</span><span class="v num">${plural(sum.weeks, 'week')}</span></div>
        <div><span class="k">Sessions</span><span class="v num">${sum.sessions}</span></div>
        <div><span class="k">Resources</span><span class="v num">${sum.resources}</span></div>
        <div><span class="k">Questions</span><span class="v num">${sum.questions}</span></div>
      </div>
      <div class="tiny muted">Certification content only. Imports never include anyone's personal progress or quiz history.</div>
    </div>`;
  }

  // ---------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------
  function exportCert(id) {
    const c = contentOf(id);
    download(`prepwise-${id}-profile-${fileDate()}.json`, S.certificationFile(c, A.getQuestions(id)));
    toast(`${c.code} profile exported (no personal data)`, { icon: 'download' });
  }
  function exportPlan(id) {
    const c = contentOf(id);
    download(`prepwise-${id}-study-plan-${fileDate()}.json`, S.studyPlanFile(c, c.plan));
    toast(`${c.code} study plan exported`, { icon: 'download' });
  }
  function exportBank(id) {
    const c = contentOf(id);
    const qs = A.getQuestions(id);
    if (!qs.length) return toast(`${c.code} has no questions to export.`, { icon: 'x' });
    download(`prepwise-${id}-questions-${fileDate()}.json`, S.questionBankFile(c, qs));
    toast(`${plural(qs.length, 'question')} exported`, { icon: 'download' });
  }
  function exportProgress(id) {
    const p = clone(store().progress[id]);
    if (p.timer && p.timer.running) { p.timer.accMs += Date.now() - p.timer.startedAt; p.timer.running = false; p.timer.startedAt = null; }
    download(`prepwise-${id}-my-progress-${fileDate()}.json`, S.progressFile(id, p));
    toast('Personal progress exported. Keep this file private.', { icon: 'shield' });
  }
  function exportAll() {
    const banks = {};
    Object.values(store().certs).forEach((c) => { if (c.bankSource === 'local') banks[c.id] = A.getQuestions(c.id).map(S.stripQuestion); });
    download(`prepwise-backup-${fileDate()}.json`, S.backupFile(store(), banks));
    toast('Backup exported', { icon: 'download' });
  }

  // ---------------------------------------------------------------
  // Imports (validate → preview → explicit confirmation)
  // ---------------------------------------------------------------
  async function importAny(expect = null) {
    const f = await pickFile();
    if (!f) return;
    const res = S.parseImport(f.text);
    if (!res.ok) return showErrors(`Can't import “${f.name}”`, res.errors, res.warnings);
    if (expect && !expect.includes(res.kind)) return showErrors(`Can't import “${f.name}”`, [`This is a ${res.label.toLowerCase()} file. Expected: ${expect.map((k) => S.FORMAT_LABEL[k].toLowerCase()).join(' or ')}.`]);
    const handlers = { certification: importCertification, questionBank: importBank, studyPlan: importPlan, progress: importProgress, backup: importBackup, legacy: importLegacy };
    return handlers[res.kind](res, f.name);
  }

  async function importCertification(res) {
    const { certification: c, questions } = res.data;
    const exists = store().certs[c.id];
    const html = `${certSummaryHTML(res.summary)}${warnBlock(res.warnings)}
      ${exists ? `<div class="callout">${icon('info')}<div><strong>${esc(exists.code)} is already on this device</strong> (id <code>${esc(c.id)}</code>). Your progress for it is never changed by a profile import.</div></div>` : ''}`;
    const choices = exists
      ? [{ id: 'copy', label: 'Import as a new certification', hint: 'Keeps both. The import gets its own id and empty progress.', cls: 'btn-primary', icon: 'plus' },
        { id: 'replace', label: `Replace ${exists.code} content`, hint: 'Updates details, domains, resources, plan template and questions. Keeps your progress.', cls: 'btn-danger', icon: 'refresh' }]
      : [{ id: 'new', label: 'Import certification', cls: 'btn-primary', icon: 'upload' }];
    const pick = await choiceDialog({ title: 'Import certification profile?', html, choices });
    if (!pick) return;
    if (pick === 'replace') {
      const ok = await confirmDialog({ title: `Replace ${exists.code} content?`, body: `The certification details, exam domains, resources and ${questions.length ? `question bank (${plural(questions.length, 'question')})` : 'plan template'} will be replaced. Your study sessions, quiz history and notes for ${exists.code} stay. A snapshot is kept on this device.`, ok: 'Replace content', danger: true });
      if (!ok) return;
      A.snapshot(`Before replacing ${exists.code} content`);
      const keep = { builtin: exists.builtin, archived: exists.archived, createdAt: exists.createdAt };
      store().certs[c.id] = A.certRecord(c, { ...keep, examSource: 'local', bankSource: exists.bankSource });
      if (questions.length) A.setQuestions(c.id, questions);
      A.save(true);
      if (A.cert && A.cert.id === c.id) A.switchCert(c.id, { toast: false });
      toast(`${c.code} content replaced`, { icon: 'refresh' });
      return;
    }
    let id = c.id;
    if (pick === 'copy') id = S.uniqueId(c.id, takenIds());
    const content = { ...c, id };
    store().certs[id] = A.certRecord(content);
    store().progress[id] = A.defaultProgress(store().certs[id]);
    if (questions.length) A.setQuestions(id, questions);
    A.save(true);
    toast(`${c.code} imported`, { icon: 'upload' });
    A.switchCert(id, { toast: false, view: 'home' });
  }

  async function importBank(res, name, forcedTarget = null) {
    const d = res.data;
    let target = forcedTarget || (store().certs[d.certificationId] ? d.certificationId : null);
    if (!target) {
      // The dialog element is removed on close, so read the value inside a custom flow.
      const certs = A.listCerts({ archived: true });
      if (!certs.length) return toast('Create a certification first.', { icon: 'x' });
      const pre = A.cert ? A.cert.id : certs[0].id;
      let chosen = pre;
      const p = confirmDialog({ title: 'Which certification is this question bank for?', ok: 'Continue',
        html: `<p class="small muted">The file is for <code>${esc(d.certificationId)}</code>, which isn't on this device. Questions are only ever added to the certification you choose.</p><label class="field"><span class="label">Certification</span><select class="select" id="dlg-target">${certs.map((c) => `<option value="${esc(c.id)}" ${c.id === pre ? 'selected' : ''}>${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select></label>` });
      setTimeout(() => { const sel = document.getElementById('dlg-target'); if (sel) sel.addEventListener('change', () => { chosen = sel.value; }); }, 0);
      if (!(await p)) return;
      target = chosen;
    }
    const rec = store().certs[target];
    const useBankExam = !rec.exam.domains.length && d.exam && d.exam.domains.length;
    const exam = useBankExam ? d.exam : rec.exam;
    const existing = A.getQuestions(target);
    const existingIds = new Set(existing.map((q) => q.id));
    const v = S.validateQuestions(d.questions, exam, { existingIds });
    if (v.errors.length) return showErrors(`Can't import this question bank into ${rec.code}`, v.errors, v.warnings);
    const incoming = d.questions.map((q) => S.normaliseQuestion(q, exam));
    const fresh = incoming.filter((q) => !existingIds.has(q.id));
    const byDomain = {};
    incoming.forEach((q) => { byDomain[q.domain] = (byDomain[q.domain] || 0) + 1; });
    const domName = (id) => (exam.domains.find((x) => x.id === id) || {}).short || id;
    const html = `<div class="preview">
      <div class="pv-head"><span class="cert-badge">${esc(rec.code)}</span><div><strong>${plural(incoming.length, 'question')} for ${esc(rec.name)}</strong><div class="tiny muted">${existing.length ? `${plural(existing.length, 'question')} already in this bank · ${plural(v.clashes.length, 'ID')} in common` : 'The bank is currently empty'}</div></div></div>
      <div class="pv-grid">${Object.entries(byDomain).map(([k, n]) => `<div><span class="k">${esc(domName(k))}</span><span class="v num">${n}</span></div>`).join('')}</div>
      ${useBankExam ? `<div class="tiny muted">${esc(rec.code)} has no exam domains yet, so the file's ${plural(d.exam.domains.length, 'domain')} will be added.</div>` : ''}
      ${rec.bankSource === 'builtin' ? `<div class="tiny muted">${esc(rec.code)} currently uses the built-in question bank. After this import it uses its own copy, which app updates won't change.</div>` : ''}
    </div>${warnBlock(v.warnings)}`;
    const choices = [];
    if (existing.length) {
      choices.push({ id: 'merge', label: `Add ${plural(fresh.length, 'new question')}`, hint: v.clashes.length ? `Skips ${plural(v.clashes.length, 'question')} whose ID is already in the bank.` : 'Keeps every existing question.', cls: 'btn-primary', icon: 'plus' });
      choices.push({ id: 'replace', label: 'Replace the whole bank', hint: 'Removes the current questions. Your quiz history is kept.', cls: 'btn-danger', icon: 'refresh' });
    } else choices.push({ id: 'replace', label: 'Import questions', cls: 'btn-primary', icon: 'upload' });
    const pick = await choiceDialog({ title: `Import question bank into ${rec.code}?`, html, choices });
    if (!pick) return;
    if (pick === 'merge' && !fresh.length) return toast('No new questions to add — every ID is already in the bank.', { icon: 'info' });
    if (pick === 'replace' && existing.length) {
      const ok = await confirmDialog({ title: `Replace all ${existing.length} ${rec.code} questions?`, body: 'Quiz history stays, but questions that no longer exist drop out of quizzes and statistics.', ok: 'Replace bank', danger: true });
      if (!ok) return;
    }
    if (useBankExam) { rec.exam = clone(d.exam); rec.examSource = 'local'; }
    const next = pick === 'merge' ? [...existing, ...fresh] : incoming;
    if (A.setQuestions(target, next)) {
      toast(pick === 'merge' ? `Added ${plural(fresh.length, 'question')} to ${rec.code}` : `${rec.code} bank now has ${plural(next.length, 'question')}`, { icon: 'upload' });
      A.renderCurrent();
    }
  }

  async function importPlan(res) {
    const d = res.data;
    let target = store().certs[d.certificationId] ? d.certificationId : null;
    if (!target) target = A.cert ? A.cert.id : null;
    if (!target) return toast('Create a certification first.', { icon: 'x' });
    const rec = store().certs[target];
    const p = store().progress[target];
    const logged = p.sessions.some((s) => s.actualSec > 0 || s.status !== 'pending');
    const html = `<div class="preview"><div class="pv-head"><span class="cert-badge">${esc(rec.code)}</span><div><strong>${plural(res.summary.weeks, 'week')} · ${plural(res.summary.sessions, 'session')}</strong><div class="tiny muted">${d.certificationId === target ? 'Matches this certification' : `Written for <code>${esc(d.certificationId)}</code>, importing into ${esc(rec.code)}`}</div></div></div>
      <ol class="dlg-weeks">${d.plan.weeks.slice(0, 12).map((w) => `<li>${esc(w.title)} <span class="muted">· ${w.sessions.length} sessions</span></li>`).join('')}</ol></div>
      ${logged ? `<div class="callout">${icon('info')}<div>${esc(rec.code)} already has logged study time or session statuses. Replacing the plan replaces those sessions. Quiz history, notes and bookmarks stay.</div></div>` : ''}`;
    const pick = await choiceDialog({ title: `Replace the ${rec.code} study plan?`, html, choices: [{ id: 'replace', label: 'Replace study plan', cls: logged ? 'btn-danger' : 'btn-primary', icon: 'plan' }] });
    if (!pick) return;
    if (logged) {
      const ok = await confirmDialog({ title: 'Replace sessions with logged time?', body: `Logged time and statuses on the current ${rec.code} sessions will be removed. A snapshot is kept on this device.`, ok: 'Replace plan', danger: true, requireText: rec.code });
      if (!ok) return;
    }
    A.snapshot(`Before replacing ${rec.code} study plan`);
    rec.plan = clone(d.plan);
    if (d.resources && d.resources.length) rec.resources = clone(d.resources);
    rec.updatedAt = new Date().toISOString();
    const fresh = A.defaultProgress(rec);
    if (p.timer) p.timer = null;
    Object.assign(p, { weeks: fresh.weeks, sessions: fresh.sessions });
    p.settings.dailyTargets = fresh.settings.dailyTargets; p.settings.studyDays = fresh.settings.studyDays;
    p.ui.planWeek = null;
    A.save(true);
    if (A.cert && A.cert.id === target) A.switchCert(target, { toast: false, view: 'plan' });
    toast(`${rec.code} study plan replaced`, { icon: 'plan' });
  }

  async function importProgress(res) {
    const d = res.data;
    const rec = store().certs[d.certificationId];
    if (!rec) return showErrors('Can\'t import this progress file', [`It belongs to certification "${d.certificationId}", which isn't on this device. Import that certification profile first.`]);
    const s = res.summary;
    const ok = await confirmDialog({
      title: `Replace your ${rec.code} progress?`, ok: 'Replace progress', danger: true, requireText: rec.code,
      html: `<div class="preview"><div class="pv-grid"><div><span class="k">Sessions</span><span class="v num">${s.sessions}</span></div><div><span class="k">Quiz attempts</span><span class="v num">${s.attempts}</span></div></div></div>
        <p class="small muted">Your current ${esc(rec.code)} progress is replaced by the file. Other certifications aren't affected. A snapshot is kept on this device.</p>`,
    });
    if (!ok) return;
    A.snapshot(`Before importing ${rec.code} progress`);
    store().progress[rec.id] = A.normaliseProgress(d.progress, rec);
    A.save(true);
    A.switchCert(rec.id, { toast: false, view: 'home' });
    toast(`${rec.code} progress imported`, { icon: 'upload' });
  }

  async function importBackup(res) {
    const n = res.summary.certifications;
    const ok = await confirmDialog({ title: 'Restore a full backup?', body: `This replaces everything on this device with the backup (${plural(n, 'certification')}). A snapshot of the current data is kept first.`, ok: 'Restore backup', danger: true, requireText: 'RESTORE' });
    if (!ok) return;
    A.snapshot('Before restoring a backup');
    A.replaceStore(res.data.store, res.data.banks);
    toast('Backup restored', { icon: 'upload' });
  }

  async function importLegacy(res) {
    const hasAB = !!store().certs['ab-650'];
    const ok = await confirmDialog({
      title: 'Import a Study Tracker v1 backup?', ok: 'Import into AB-650', danger: hasAB, requireText: hasAB ? 'AB-650' : '',
      html: `<div class="preview"><div class="pv-grid"><div><span class="k">Sessions</span><span class="v num">${res.summary.sessions}</span></div><div><span class="k">Quiz attempts</span><span class="v num">${res.summary.attempts}</span></div></div></div>
        <p class="small muted">v1 backups belong to the AB-650 programme. ${hasAB ? 'Your current AB-650 progress will be replaced (a snapshot is kept). ' : ''}Other certifications aren't affected.</p>`,
    });
    if (!ok) return;
    A.snapshot('Before importing a v1 backup');
    if (!store().certs['ab-650']) A.installBuiltin('ab-650');
    store().progress['ab-650'] = A.normaliseProgress(res.data, store().certs['ab-650']);
    if (res.data.settings && res.data.settings.name && !store().settings.name) store().settings.name = res.data.settings.name;
    A.save(true);
    A.switchCert('ab-650', { toast: false, view: 'home' });
    toast('v1 backup imported into AB-650', { icon: 'upload' });
  }

  // ---------------------------------------------------------------
  // Create / edit / duplicate / archive / delete
  // ---------------------------------------------------------------
  function domainRowsEditor(domains, readOnly) {
    return domains.map((d, i) => `<div class="dom-edit" data-i="${i}">
      <input class="input" value="${esc(d.short)}" placeholder="Short name" data-de="short" maxlength="40" aria-label="Domain ${i + 1} short name" ${readOnly ? 'disabled' : ''}>
      <input class="input" value="${esc(d.title)}" placeholder="Full title" data-de="title" maxlength="200" aria-label="Domain ${i + 1} title" ${readOnly ? 'disabled' : ''}>
      <div class="dom-w">${A.numField({ value: d.weight ? d.weight[0] : '', min: 0, max: 100, unit: '%', label: 'Minimum weight', placeholder: 'min' }).replace('class="num-input', `data-de="w0" ${readOnly ? 'disabled' : ''} class="num-input`)}
        <span class="muted">–</span>${A.numField({ value: d.weight ? d.weight[1] : '', min: 0, max: 100, unit: '%', label: 'Maximum weight', placeholder: 'max' }).replace('class="num-input', `data-de="w1" ${readOnly ? 'disabled' : ''} class="num-input`)}</div>
      ${readOnly ? '' : `<button class="mini-btn" data-action="dom-remove" data-i="${i}" aria-label="Remove domain">${icon('trash')}</button>`}
    </div>`).join('');
  }

  let editing = null; // { id|null, domains }
  function openEditor(id = null) {
    const rec = id ? store().certs[id] : null;
    const readOnlyExam = rec && rec.examSource === 'builtin';
    editing = { id, domains: rec ? clone(rec.exam.domains) : [{ id: '1', short: 'General', title: 'General knowledge', weight: null }] };
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${rec ? 'Edit certification' : 'New certification'}</div><h2>${rec ? esc(rec.code) : 'Create a certification profile'}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <form id="cert-form" novalidate>
        <div class="form-grid">
          <label class="field"><span class="label">Certification name *</span><input class="input" name="name" required maxlength="140" value="${esc(rec ? rec.name : '')}" placeholder="e.g. Microsoft Azure Administrator"></label>
          <label class="field"><span class="label">Certification code *</span><input class="input" name="code" required maxlength="24" value="${esc(rec ? rec.code : '')}" placeholder="e.g. AZ-104" autocapitalize="characters"></label>
          <label class="field"><span class="label">Provider</span><input class="input" name="provider" list="providers" maxlength="60" value="${esc(rec ? rec.provider : '')}" placeholder="e.g. Microsoft"><datalist id="providers">${PROVIDERS.map((p) => `<option value="${esc(p)}">`).join('')}</datalist></label>
          ${rec ? `<div class="field"><span class="label">Certification ID</span><div class="static-val"><code>${esc(rec.id)}</code><span class="tiny muted">Stable ID used to link progress. It can't change.</span></div></div>`
            : `<label class="field"><span class="label">Certification ID</span><input class="input" name="id" maxlength="48" placeholder="Created from the code" pattern="[a-z0-9-]+" autocapitalize="off"><span class="hint">Lowercase letters, numbers and hyphens. Used to match shared files.</span></label>`}
        </div>
        <label class="field"><span class="label">Description</span><textarea class="textarea" name="description" maxlength="2000" placeholder="What the certification covers">${esc(rec ? rec.description : '')}</textarea></label>
        <div class="form-grid">
          <label class="field"><span class="label">Official certification website</span><input class="input" type="url" inputmode="url" name="website" value="${esc(rec ? rec.website : '')}" placeholder="https://"></label>
          <label class="field"><span class="label">Official study guide URL</span><input class="input" type="url" inputmode="url" name="studyGuideUrl" value="${esc(rec ? rec.studyGuideUrl : '')}" placeholder="https://"></label>
        </div>
        ${rec ? '' : `<div class="form-grid">
          <label class="field"><span class="label">Programme length</span>${A.numField({ name: 'weeks', value: 4, min: 1, max: S.MAX_WEEKS, unit: 'weeks', label: 'Programme length in weeks' })}</label>
          <label class="field"><span class="label">Daily study time</span>${A.numField({ name: 'daily', value: 60, min: 0, max: 720, step: 5, unit: 'min', label: 'Minutes per study day' })}<span class="hint">One session per day, Monday to Friday. Adjust in Settings later.</span></label>
          <label class="field"><span class="label">Exam preparation target</span>${A.numField({ name: 'mastery', value: 85, min: 1, max: 100, unit: '%', label: 'Target score' })}</label>
        </div>`}
        <div class="group-label">Exam domains &amp; weighting</div>
        ${readOnlyExam ? `<div class="callout info">${icon('info')}<div>${esc(rec.code)} uses the built-in exam outline, which stays in step with app updates. Duplicate the profile to customise its domains.</div></div>`
          : `<div class="small muted" style="margin:4px 0 10px">Add each domain from the official exam outline with its weighting. Only use objectives and weightings you've checked against the official source.</div>`}
        <div id="dom-editor">${domainRowsEditor(editing.domains, readOnlyExam)}</div>
        ${readOnlyExam ? '' : `<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="dom-add">${icon('plus')} Add domain</button>`}
        <div class="btn-row" style="margin-top:22px">
          <button type="button" class="btn btn-ghost" data-action="close-sheet">Cancel</button>
          <button type="submit" class="btn btn-primary">${rec ? 'Save changes' : 'Create certification'}</button>
        </div>
      </form>`, { wide: true });
    const form = document.getElementById('cert-form');
    if (!rec) form.code.addEventListener('input', () => { if (!form.id.dataset.touched) form.id.value = S.uniqueId(form.code.value || form.name.value, takenIds()); });
    if (!rec) form.id.addEventListener('input', () => { form.id.dataset.touched = '1'; });
    form.addEventListener('input', (e) => {
      const row = e.target.closest('.dom-edit');
      if (!row || !e.target.dataset.de) return;
      const d = editing.domains[Number(row.dataset.i)];
      const k = e.target.dataset.de;
      if (k === 'short' || k === 'title') d[k] = e.target.value;
      else { const w = d.weight ? [...d.weight] : [null, null]; w[k === 'w0' ? 0 : 1] = e.target.value === '' ? null : Number(e.target.value); d.weight = w; }
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); saveEditor(form, rec, readOnlyExam); });
  }

  function saveEditor(form, rec, readOnlyExam) {
    const v = (n) => (form[n] ? form[n].value.trim() : '');
    const errs = [];
    if (!v('name')) errs.push('Enter the certification name.');
    if (!v('code')) errs.push('Enter the certification code.');
    ['website', 'studyGuideUrl'].forEach((k) => { if (v(k) && !S.isUrl(v(k))) errs.push(`${k === 'website' ? 'The website' : 'The study guide URL'} must start with https://`); });
    let id = rec ? rec.id : (v('id') || S.uniqueId(v('code') || v('name'), takenIds()));
    if (!rec) {
      if (!S.isValidCertId(id)) errs.push('The ID can only use lowercase letters, numbers and hyphens.');
      else if (takenIds().has(id)) errs.push(`The ID “${id}” is already used. Choose another.`);
    }
    let domains = editing.domains;
    if (!readOnlyExam) {
      domains = domains.filter((d) => (d.short || '').trim() || (d.title || '').trim()).map((d, i) => {
        const w = d.weight && d.weight[0] != null && d.weight[1] != null && d.weight[0] !== '' && d.weight[1] !== '' ? [Number(d.weight[0]), Number(d.weight[1])] : null;
        if (d.weight && (d.weight[0] != null || d.weight[1] != null) && !w) errs.push(`Domain ${i + 1}: enter both the minimum and maximum weighting, or leave both blank.`);
        if (w && (w.some((x) => !(x >= 0 && x <= 100)) || w[0] > w[1])) errs.push(`Domain ${i + 1}: weighting must be between 0 and 100, with the minimum first.`);
        return { id: d.id || String(i + 1), short: (d.short || d.title).trim().slice(0, 40), title: (d.title || d.short).trim(), weight: w };
      });
      const ids = new Set();
      domains.forEach((d, i) => { if (ids.has(d.id)) d.id = `d${i + 1}-${uid().slice(0, 4)}`; ids.add(d.id); });
      if (rec) {
        const used = new Set(A.getQuestions(rec.id).map((q) => q.domain));
        const removed = rec.exam.domains.filter((d) => used.has(d.id) && !domains.some((x) => x.id === d.id));
        if (removed.length) errs.push(`You can't remove ${removed.map((d) => `“${d.short}”`).join(', ')} because questions use ${removed.length > 1 ? 'them' : 'it'}.`);
      }
    }
    if (errs.length) { toast(errs[0], { icon: 'x', ms: 4500 }); return; }
    const base = {
      code: v('code'),
      name: v('name'), provider: v('provider') || 'Other', description: form.description.value.trim(),
      website: v('website'), studyGuideUrl: v('studyGuideUrl'),
    };
    if (rec) {
      Object.assign(rec, base, { updatedAt: new Date().toISOString() });
      if (!readOnlyExam) rec.exam = { ...rec.exam, domains };
      if (A.state && A.cert && A.cert.id === rec.id && !A.state.settings.programmeTitle) A.state.settings.programmeTitle = rec.name;
      A.save(true);
      closeSheet();
      A.hooks.certChange.forEach((fn) => fn(A.cert, A.state));
      A.renderCurrent();
      toast(`${rec.code} saved`);
      return;
    }
    const weeks = A.clamp(Math.round(A.num(form.weeks.value, 4)), 1, S.MAX_WEEKS);
    const daily = A.clamp(Math.round(A.num(form.daily.value, 60)), 0, 720);
    const content = {
      id, ...base, contentVersion: '1.0.0',
      exam: { masteryTarget: A.clamp(Math.round(A.num(form.mastery.value, 85)), 1, 100), domains },
      plan: { dailyTargets: [daily, daily, daily, daily, daily, 0, 0], studyDays: [true, true, true, true, true, false, false], weeks: Array.from({ length: weeks }, (_, i) => ({ title: `Week ${i + 1}`, objectives: [], sessions: [] })) },
      resources: [
        ...(base.studyGuideUrl ? [{ id: 'study-guide', title: `Official ${base.code} study guide`, url: base.studyGuideUrl, type: 'study-guide' }] : []),
        ...(base.website ? [{ id: 'website', title: `${base.code} certification page`, url: base.website, type: 'documentation' }] : []),
      ],
    };
    const recNew = A.certRecord(content);
    store().certs[id] = recNew;
    store().progress[id] = A.defaultProgress(recNew); // empty plan → one session per study day
    A.save(true);
    closeSheet();
    toast(`${base.code} created`, { icon: 'plus' });
    A.switchCert(id, { toast: false, view: 'home' });
  }

  async function duplicateCert(id) {
    const rec = store().certs[id];
    const newId = S.uniqueId(`${rec.id}-copy`, takenIds());
    const ok = await confirmDialog({ title: `Duplicate ${rec.code}?`, body: `Creates “${rec.name} (copy)” with the same details, domains, study plan, resources and ${plural(A.getQuestions(id).length, 'question')}. The copy starts with empty progress, and its questions can be edited.`, ok: 'Duplicate' });
    if (!ok) return;
    const c = contentOf(id);
    const copy = A.certRecord({ ...c, id: newId, name: `${c.name} (copy)`.slice(0, 140) });
    store().certs[newId] = copy;
    store().progress[newId] = A.defaultProgress(copy);
    const qs = A.getQuestions(id);
    if (qs.length) A.setQuestions(newId, qs);
    A.save(true);
    toast(`Duplicated as ${copy.name}`, { icon: 'copy' });
    A.renderCurrent();
  }

  async function archiveCert(id, on) {
    const rec = store().certs[id];
    if (on) {
      const ok = await confirmDialog({ title: `Archive ${rec.code}?`, body: 'It disappears from the certification selector. Progress and content are kept, and you can unarchive it any time from My Certifications.', ok: 'Archive' });
      if (!ok) return;
    }
    rec.archived = on;
    if (on && store().settings.defaultCert === id) store().settings.defaultCert = null;
    A.save(true);
    if (on && A.cert && A.cert.id === id) {
      const next = A.firstCertId();
      if (next) A.switchCert(next, { toast: false, view: 'certs' }); else { A.activate(null); A.hooks.certChange.forEach((fn) => fn(null, null)); A.navigate('certs'); }
    } else A.renderCurrent();
    toast(on ? `${rec.code} archived` : `${rec.code} restored from the archive`, { icon: 'archive' });
  }

  async function deleteCert(id) {
    const rec = store().certs[id];
    const sum = A.progressSummary(id);
    const ok = await confirmDialog({
      title: `Delete ${rec.code}?`, ok: 'Delete permanently', danger: true, requireText: rec.code,
      body: `“${rec.name}” and everything in it will be deleted from this device: ${Math.round(sum.pct)}% study progress, ${A.fmtHours(sum.hours * 3600)}h logged, quiz history, notes${rec.bankSource === 'local' ? ' and its question bank' : ''}. Other certifications aren't affected. Export it first if you might want it back.`,
    });
    if (!ok) return;
    A.snapshot(`Before deleting ${rec.code}`);
    delete store().certs[id];
    delete store().progress[id];
    A.removeBank(id);
    if (rec.builtin && !store().deletedBuiltins.includes(rec.builtin)) store().deletedBuiltins.push(rec.builtin);
    if (store().settings.defaultCert === id) store().settings.defaultCert = A.firstCertId();
    A.save(true);
    if (A.cert && A.cert.id === id) {
      const next = A.firstCertId();
      if (next) A.switchCert(next, { toast: false, view: 'certs' }); else { A.activate(null); A.hooks.certChange.forEach((fn) => fn(null, null)); A.navigate('certs'); }
    } else A.renderCurrent();
    toast(`${rec.code} deleted`, { icon: 'trash' });
  }

  // ---------------------------------------------------------------
  // My Certifications (library)
  // ---------------------------------------------------------------
  const lib = { q: '', filter: 'active' };
  function renderCerts() {
    const el = document.getElementById('view-certs');
    const all = A.listCerts({ archived: true });
    const term = lib.q.trim().toLowerCase();
    const shown = all.filter((c) => (lib.filter === 'all' || (lib.filter === 'archived' ? c.archived : !c.archived)))
      .filter((c) => !term || [c.code, c.name, c.provider, c.description].join(' ').toLowerCase().includes(term));
    const archivedN = all.filter((c) => c.archived).length;
    el.innerHTML = `
      <div class="lib-toolbar">
        <label class="search">${icon('search')}<input class="input" type="search" placeholder="Search certifications" value="${esc(lib.q)}" id="lib-search" aria-label="Search certifications"></label>
        <div class="seg-pills" role="group" aria-label="Filter">
          ${[['active', 'Active'], ['archived', `Archived${archivedN ? ` (${archivedN})` : ''}`], ['all', 'All']].map(([k, l]) => `<button class="${lib.filter === k ? 'active' : ''}" data-action="lib-filter" data-f="${k}" aria-pressed="${lib.filter === k}">${l}</button>`).join('')}
        </div>
        <div class="btn-row tb-actions">
          <button class="btn" data-action="import-any">${icon('upload')} Import</button>
          <button class="btn btn-primary" data-action="new-cert">${icon('plus')} New certification</button>
        </div>
      </div>
      ${shown.length ? `<div class="cert-grid">${shown.map(certCard).join('')}</div>`
        : `<div class="panel">${all.length ? A.emptyState('search', 'No certifications match', 'Try a different search or filter.') : A.emptyState('cert', 'No certifications yet', 'Create your first certification profile, or import one a friend shared.', `<button class="btn btn-primary" data-action="new-cert">${icon('plus')} New certification</button><button class="btn" data-action="import-any">${icon('upload')} Import profile</button>`)}</div>`}
      <div class="panel help-panel">
        <div class="panel-head"><h3>Sharing with friends</h3></div>
        <p class="small muted">Export a certification profile to share its study plan, resources and questions. Friends import the file on their own device. Your progress, quiz answers and notes are never included unless you export them separately with <strong>Export my progress</strong>.</p>
      </div>`;
    const s = document.getElementById('lib-search');
    s.addEventListener('input', () => { lib.q = s.value; const pos = s.selectionStart; renderCerts(); const n = document.getElementById('lib-search'); n.focus(); n.setSelectionRange(pos, pos); });
  }

  function certCard(c) {
    const sum = A.progressSummary(c.id);
    const qn = A.getQuestions(c.id).length;
    const active = A.cert && A.cert.id === c.id;
    return `<article class="cert-card ${active ? 'active' : ''} ${c.archived ? 'archived' : ''}">
      <div class="cc-top">
        <span class="cert-badge lg">${esc(c.code)}</span>
        <div class="cc-chips">${active ? `<span class="chip teal">${icon('check')}Active</span>` : ''}${c.archived ? '<span class="chip">Archived</span>' : ''}${c.builtin ? '<span class="chip blue">Built-in</span>' : ''}</div>
      </div>
      <div class="cc-prov">${esc(c.provider)}</div>
      <h3 class="cc-name" title="${esc(c.name)}">${esc(c.name)}</h3>
      ${c.description ? `<p class="cc-desc small muted" title="${esc(c.description)}">${esc(c.description)}</p>` : ''}
      <div class="cc-progress"><span class="num">${Math.round(sum.pct)}%</span>${bar(sum.pct, sum.pct >= 100 ? 'teal' : '')}</div>
      <div class="cc-meta"><span>${icon('clock')}${A.fmtHours(sum.hours * 3600)}h</span><span>${icon('book')}${plural(qn, 'question')}</span><span>${icon('target')}${plural((c.exam && c.exam.domains || []).length, 'domain')}</span><span>${icon('check')}${sum.quizPct == null ? 'No quiz answers yet' : `Quiz ${Math.round(sum.quizPct)}% · ${sum.quizAnswered} answered`}</span><span>${icon('calendar')}${sum.last ? `Studied ${esc(relDay(sum.last.slice(0, 10)))}` : 'Not studied yet'}</span></div>
      <div class="cc-actions">
        ${c.archived ? `<button class="btn btn-sm" data-action="cert-unarchive" data-id="${esc(c.id)}">${icon('archive')} Unarchive</button>`
          : active ? `<button class="btn btn-sm btn-primary" data-nav="home">${icon('home')} Open dashboard</button>` : `<button class="btn btn-sm btn-primary" data-action="switch-cert" data-id="${esc(c.id)}">${icon('switch')} Switch to</button>`}
        <button class="btn btn-sm" data-action="cert-details" data-id="${esc(c.id)}">${icon('info')} Details</button>
      </div>
    </article>`;
  }

  function certDetails(id) {
    const c = store().certs[id];
    if (!c) return;
    const qn = A.getQuestions(id).length;
    const sum = A.progressSummary(id);
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${esc(c.provider)} · ${esc(c.code)}</div><h2>${esc(c.name)}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      ${c.description ? `<p class="small" style="margin-top:0">${esc(c.description)}</p>` : ''}
      <div class="pv-grid">
        <div><span class="k">Progress</span><span class="v num">${Math.round(sum.pct)}%</span></div>
        <div><span class="k">Logged</span><span class="v num">${A.fmtHours(sum.hours * 3600)}h</span></div>
        <div><span class="k">Questions</span><span class="v num">${qn}</span></div>
        <div><span class="k">Domains</span><span class="v num">${c.exam.domains.length}</span></div>
      </div>
      ${c.exam.domains.length ? `<div class="group-label">Exam domains</div><ul class="dom-sum">${c.exam.domains.map((d, i) => `<li><span>${i + 1}. ${esc(d.title)}</span>${d.weight ? `<span class="num muted">${d.weight[0]}–${d.weight[1]}%</span>` : ''}</li>`).join('')}</ul>` : ''}
      <div class="btn-row" style="margin-top:10px">
        ${c.website ? `<a class="btn btn-sm" href="${esc(c.website)}" target="_blank" rel="noopener">${icon('globe')} Certification website</a>` : ''}
        ${c.studyGuideUrl ? `<a class="btn btn-sm" href="${esc(c.studyGuideUrl)}" target="_blank" rel="noopener">${icon('book')} Study guide</a>` : ''}
      </div>
      <div class="tiny muted" style="margin-top:10px">ID <code>${esc(c.id)}</code> · ${c.builtin ? 'Built-in profile' : 'Created on this device'} · question bank ${c.bankSource === 'builtin' ? 'built in' : 'stored on this device'}</div>
      <div class="group-label">Manage</div>
      <div class="action-grid">
        <button class="btn" data-action="cert-edit" data-id="${esc(id)}">${icon('edit')} Edit details</button>
        <button class="btn" data-action="manage-questions" data-id="${esc(id)}">${icon('book')} Questions</button>
        <button class="btn" data-action="cert-duplicate" data-id="${esc(id)}">${icon('copy')} Duplicate</button>
        <button class="btn" data-action="${c.archived ? 'cert-unarchive' : 'cert-archive'}" data-id="${esc(id)}">${icon('archive')} ${c.archived ? 'Unarchive' : 'Archive'}</button>
      </div>
      <div class="group-label">Share &amp; back up</div>
      <div class="action-grid">
        <button class="btn" data-action="export-cert" data-id="${esc(id)}">${icon('download')} Export profile</button>
        <button class="btn" data-action="export-plan" data-id="${esc(id)}">${icon('download')} Export study plan</button>
        <button class="btn" data-action="export-bank" data-id="${esc(id)}" ${qn ? '' : 'disabled'}>${icon('download')} Export questions</button>
        <button class="btn" data-action="export-progress" data-id="${esc(id)}">${icon('shield')} Export my progress</button>
        <button class="btn" data-action="import-bank" data-id="${esc(id)}">${icon('upload')} Import questions</button>
      </div>
      <div class="tiny muted" style="margin-top:8px">Profile, plan and question exports contain no personal data. “Export my progress” is private to you.</div>
      <div class="btn-row" style="margin-top:20px"><button class="btn btn-danger" data-action="cert-delete" data-id="${esc(id)}">${icon('trash')} Delete certification</button></div>`, { wide: true });
  }

  // ---------------------------------------------------------------
  // Learning Resources (certification content)
  // ---------------------------------------------------------------
  function renderResources() {
    const el = document.getElementById('view-resources');
    const c = A.cert;
    if (!c) { el.innerHTML = `<div class="panel">${A.emptyState('cert', 'No active certification')}</div>`; return; }
    const groups = {};
    c.resources.forEach((r) => (groups[r.type] = groups[r.type] || []).push(r));
    const bm = A.ext.revision;
    el.innerHTML = `
      <div class="lib-toolbar">
        <div class="small muted" style="flex:1">Courses, documentation and labs for <strong>${esc(c.code)}</strong>. Resources are part of the certification profile, so they're included when you share it.</div>
        <button class="btn btn-primary" data-action="resource-edit">${icon('plus')} Add resource</button>
      </div>
      ${c.website || c.studyGuideUrl ? `<div class="official-links">
        ${c.studyGuideUrl ? `<a class="official" href="${esc(c.studyGuideUrl)}" target="_blank" rel="noopener">${icon('book')}<span><strong>Official study guide</strong><span class="tiny muted">${esc(host(c.studyGuideUrl))}</span></span>${icon('external', 'muted')}</a>` : ''}
        ${c.website ? `<a class="official" href="${esc(c.website)}" target="_blank" rel="noopener">${icon('globe')}<span><strong>Certification website</strong><span class="tiny muted">${esc(host(c.website))}</span></span>${icon('external', 'muted')}</a>` : ''}
      </div>` : ''}
      ${c.resources.length ? Object.entries(RTYPE).filter(([k]) => groups[k]).map(([k, label]) => `
        <section class="panel">
          <div class="panel-head"><h3>${label}</h3><span class="tiny muted">${groups[k].length}</span></div>
          <div class="res-list">${groups[k].map((r) => `<div class="res-item">
            <div class="res-ic">${icon(k === 'course' || k === 'video' ? 'play' : k === 'lab' ? 'layers' : k === 'practice-test' ? 'target' : 'book')}</div>
            <div class="res-body"><div class="res-t">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</div>
              <div class="tiny muted">${r.url ? esc(host(r.url)) : 'No link'}${r.notes ? ` · ${esc(r.notes)}` : ''}</div></div>
            <div class="row-actions">${bm ? bm.resourceBookmarkBtn(r.id) : ''}<button class="mini-btn" data-action="resource-edit" data-id="${esc(r.id)}" aria-label="Edit resource">${icon('edit')}</button></div>
          </div>`).join('')}</div>
        </section>`).join('') : `<div class="panel">${A.emptyState('resources', 'No learning resources yet', 'Add the courses, documentation and labs you use for this certification.')}</div>`}`;
  }
  const host = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return u; } };

  function resourceSheet(id) {
    const c = A.cert;
    const r = id ? c.resources.find((x) => x.id === id) : null;
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${esc(c.code)} · Learning resources</div><h2>${r ? 'Edit resource' : 'Add resource'}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <form id="res-form" novalidate>
        <label class="field" style="margin-top:0"><span class="label">Title *</span><input class="input" name="title" maxlength="160" value="${esc(r ? r.title : '')}" required></label>
        <div class="form-grid">
          <label class="field"><span class="label">Link</span><input class="input" type="url" inputmode="url" name="url" value="${esc(r ? r.url : '')}" placeholder="https://"></label>
          <label class="field"><span class="label">Type</span><select class="select" name="type">${Object.entries(RTYPE).map(([k, l]) => `<option value="${k}" ${(r ? r.type : 'documentation') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span class="label">Notes</span><textarea class="textarea" name="notes" maxlength="1000">${esc(r ? r.notes : '')}</textarea></label>
        <div class="btn-row" style="margin-top:20px">
          ${r ? `<button type="button" class="btn btn-danger" data-action="resource-delete" data-id="${esc(r.id)}">${icon('trash')} Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${r ? 'Save' : 'Add resource'}</button>
        </div>
      </form>`);
    const form = document.getElementById('res-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = form.title.value.trim(), url = form.url.value.trim();
      if (!title) return toast('Give the resource a title.', { icon: 'x' });
      if (url && !S.isUrl(url)) return toast('Links must start with https://', { icon: 'x' });
      const data = { title, url, type: form.type.value, notes: form.notes.value.trim() };
      if (r) Object.assign(r, data); else c.resources.push({ id: `r-${uid()}`, ...data });
      c.updatedAt = new Date().toISOString();
      A.save(true); closeSheet();
      toast(r ? 'Resource saved' : 'Resource added');
    });
  }

  // ---------------------------------------------------------------
  // Question manager (per certification)
  // ---------------------------------------------------------------
  const qm = { id: null, q: '', domain: 'all' };
  function manageQuestions(id) {
    qm.id = id || (A.cert && A.cert.id);
    renderQM();
  }
  function renderQM() {
    const c = store().certs[qm.id];
    if (!c) return;
    const all = A.getQuestions(qm.id);
    const ro = c.bankSource === 'builtin';
    const term = qm.q.trim().toLowerCase();
    const shown = all.filter((q) => (qm.domain === 'all' || q.domain === qm.domain) && (!term || `${q.id} ${q.q} ${q.topic}`.toLowerCase().includes(term)));
    const dn = (id) => { const i = c.exam.domains.findIndex((d) => d.id === id); return i >= 0 ? `D${i + 1}` : id; };
    const html = `
      <div class="sheet-title"><div><div class="eyebrow">${esc(c.code)} · Question bank</div><h2>${plural(all.length, 'question')}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      ${ro ? `<div class="callout info">${icon('info')}<div>This is the built-in ${esc(c.code)} bank. It's read-only so app updates can keep it current. Duplicate the certification to edit questions, or import a bank to replace it.</div></div>` : ''}
      <div class="qm-tools">
        <label class="search">${icon('search')}<input class="input" type="search" id="qm-search" placeholder="Search questions" value="${esc(qm.q)}" aria-label="Search questions"></label>
        <select class="select" id="qm-domain" aria-label="Filter by domain"><option value="all">All domains</option>${c.exam.domains.map((d, i) => `<option value="${esc(d.id)}" ${qm.domain === d.id ? 'selected' : ''}>D${i + 1} · ${esc(d.short)}</option>`).join('')}</select>
      </div>
      <div class="btn-row" style="margin:12px 0">
        ${ro ? '' : `<button class="btn btn-primary btn-sm" data-action="add-question" data-id="${esc(c.id)}">${icon('plus')} Add question</button>`}
        <button class="btn btn-sm" data-action="import-bank" data-id="${esc(c.id)}">${icon('upload')} Import</button>
        <button class="btn btn-sm" data-action="export-bank" data-id="${esc(c.id)}" ${all.length ? '' : 'disabled'}>${icon('download')} Export</button>
        <button class="btn btn-sm btn-ghost" data-action="bank-template" data-id="${esc(c.id)}">${icon('download')} Template</button>
      </div>
      <div class="qm-list">${shown.slice(0, 200).map((q) => `<div class="qm-item">
          <span class="chip blue">${esc(dn(q.domain))}</span>
          <div class="qm-body"><div class="qm-q">${esc(q.q)}</div><div class="tiny muted">${esc(q.id)} · ${esc(q.topic)} · ${esc(q.type)} · ${esc(q.diff)}</div></div>
          ${ro ? '' : `<button class="mini-btn" data-action="edit-question" data-id="${esc(c.id)}" data-q="${esc(q.id)}" aria-label="Edit question">${icon('edit')}</button>`}
        </div>`).join('') || `<div class="small muted" style="padding:12px 0">${all.length ? 'No questions match.' : 'No questions yet.'}</div>`}
        ${shown.length > 200 ? `<div class="tiny muted">Showing the first 200 of ${shown.length}. Search to narrow down.</div>` : ''}
      </div>`;
    if (A.isSheetOpen() && document.getElementById('qm-search')) { document.getElementById('sheet-body').innerHTML = html; }
    else openSheet(html, { wide: true });
    const s = document.getElementById('qm-search');
    s.addEventListener('input', () => { qm.q = s.value; const pos = s.selectionStart; renderQM(); const n = document.getElementById('qm-search'); n.focus(); n.setSelectionRange(pos, pos); });
    document.getElementById('qm-domain').addEventListener('change', (e) => { qm.domain = e.target.value; renderQM(); });
  }

  function questionForm(certId, qid = null) {
    const c = store().certs[certId];
    if (!c) return;
    if (c.bankSource === 'builtin') return toast(`The built-in ${c.code} bank is read-only. Duplicate the certification to edit questions.`, { icon: 'info', ms: 4500 });
    if (!c.exam.domains.length) return toast(`Add an exam domain to ${c.code} first (Edit details).`, { icon: 'x', ms: 4000 });
    const all = A.getQuestions(certId);
    const q = qid ? all.find((x) => x.id === qid) : null;
    const type = q && q.type === 'multi' ? 'multi' : 'single';
    if (q && (q.type === 'order' || q.type === 'match')) return toast('Ordering and matching questions are edited in JSON. Export the bank, edit it and import it again.', { icon: 'info', ms: 5000 });
    const opts = q ? q.opts : ['', '', '', ''];
    const ans = q ? q.ans : [];
    const objs = Object.entries(c.exam.objectives);
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${esc(c.code)} · ${q ? esc(q.id) : 'New question'}</div><h2>${q ? 'Edit question' : 'Add question'}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <form id="q-form" novalidate>
        <div class="form-grid">
          <label class="field" style="margin-top:0"><span class="label">Domain *</span><select class="select" name="domain">${c.exam.domains.map((d, i) => `<option value="${esc(d.id)}" ${q && q.domain === d.id ? 'selected' : ''}>D${i + 1} · ${esc(d.short)}</option>`).join('')}</select></label>
          <label class="field" style="margin-top:0"><span class="label">Answer type</span><select class="select" name="type"><option value="single" ${type === 'single' ? 'selected' : ''}>Single answer</option><option value="multi" ${type === 'multi' ? 'selected' : ''}>Multiple answers</option></select></label>
          <label class="field"><span class="label">Topic</span><input class="input" name="topic" maxlength="80" value="${esc(q ? q.topic : '')}" placeholder="e.g. Virtual networks"></label>
          <label class="field"><span class="label">Exam objective</span>${objs.length
            ? `<select class="select" name="obj"><option value="">None</option>${objs.map(([k, v]) => `<option value="${esc(k)}" ${q && q.obj === k ? 'selected' : ''}>${esc(k)} · ${esc(v.slice(0, 70))}</option>`).join('')}</select>`
            : `<input class="input" name="obj" maxlength="20" value="${esc(q ? q.obj : '')}" placeholder="e.g. 2.1">`}</label>
          <label class="field"><span class="label">Difficulty</span><select class="select" name="diff">${S.DIFFS.map((d) => `<option value="${d}" ${(q ? q.diff : 'intermediate') === d ? 'selected' : ''}>${d[0].toUpperCase() + d.slice(1)}</option>`).join('')}</select></label>
          <label class="field check-field"><input type="checkbox" name="scenario" ${q && q.scenario ? 'checked' : ''}><span>Scenario-based question</span></label>
        </div>
        <label class="field"><span class="label">Question *</span><textarea class="textarea" name="q" maxlength="2000" required>${esc(q ? q.q : '')}</textarea></label>
        <div class="field"><span class="label">Options * <span class="muted">(tick the correct answer${type === 'multi' ? 's' : ''})</span></span>
          <div id="q-opts">${opts.map((o, i) => optRow(o, ans.includes(i), i)).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm" data-action="q-add-opt" style="margin-top:6px">${icon('plus')} Add option</button></div>
        <label class="field"><span class="label">Explanation</span><textarea class="textarea" name="exp" maxlength="3000" placeholder="Why the correct answer is right">${esc(q ? q.exp : '')}</textarea></label>
        <div class="form-grid">
          <label class="field"><span class="label">Reference link</span><input class="input" type="url" name="refUrl" value="${esc(q ? q.refUrl || (q.ref && c.exam.refs[q.ref] ? c.exam.refs[q.ref][0] : '') : '')}" placeholder="https://"></label>
          <label class="field"><span class="label">Reference title</span><input class="input" name="refTitle" maxlength="160" value="${esc(q ? q.refTitle || (q.ref && c.exam.refs[q.ref] ? c.exam.refs[q.ref][1] : '') : '')}"></label>
        </div>
        <div class="btn-row" style="margin-top:20px">
          ${q ? `<button type="button" class="btn btn-danger" data-action="delete-question" data-id="${esc(certId)}" data-q="${esc(q.id)}">${icon('trash')} Delete</button>` : ''}
          <button type="button" class="btn btn-ghost" data-action="manage-questions" data-id="${esc(certId)}">Back to list</button>
          <button type="submit" class="btn btn-primary">${q ? 'Save question' : 'Add question'}</button>
        </div>
      </form>`, { wide: true });
    const form = document.getElementById('q-form');
    form.type.addEventListener('change', () => $$('#q-opts input[type=checkbox]').forEach((b) => { b.dataset.t = form.type.value; }));
    form.addEventListener('change', (e) => {
      if (e.target.matches('#q-opts input[type=checkbox]') && form.type.value === 'single' && e.target.checked) $$('#q-opts input[type=checkbox]').forEach((b) => { if (b !== e.target) b.checked = false; });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const rows = $$('#q-opts .opt-row');
      const kept = rows.map((r) => ({ t: r.querySelector('textarea').value.trim(), ok: r.querySelector('input').checked })).filter((x) => x.t);
      const obj = { id: q ? q.id : `Q-${uid()}`, domain: form.domain.value, obj: form.obj.value.trim(), topic: form.topic.value.trim(), diff: form.diff.value, type: form.type.value,
        scenario: form.scenario.checked, q: form.q.value.trim(), opts: kept.map((x) => x.t), ans: kept.map((x, i) => (x.ok ? i : -1)).filter((i) => i >= 0), exp: form.exp.value.trim() };
      const ru = form.refUrl.value.trim();
      if (ru) { obj.refUrl = ru; obj.refTitle = form.refTitle.value.trim() || host(ru); }
      const ex = S.normaliseExam(c.exam);
      const v = S.validateQuestion(obj, 0, { domainIds: new Set(ex.domains.map((d) => d.id)), refs: ex.refs });
      if (v.errs.length) return toast(v.errs[0].replace(/^Question 1( \([^)]*\))?:? ?/, ''), { icon: 'x', ms: 4500 });
      const next = q ? all.map((x) => (x.id === q.id ? obj : x)) : [...all, obj];
      if (A.setQuestions(certId, next)) { toast(q ? 'Question saved' : 'Question added'); manageQuestions(certId); }
    });
  }
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const optRow = (text, ok, i) => `<div class="opt-row"><label class="opt-ok" title="Correct answer"><input type="checkbox" ${ok ? 'checked' : ''} aria-label="Option ${i + 1} is correct"><span>${icon('check')}</span></label>
    <textarea class="textarea opt-t" rows="1" maxlength="600" placeholder="Option ${i + 1}" aria-label="Option ${i + 1}">${esc(text)}</textarea>
    <button type="button" class="mini-btn" data-action="q-del-opt" aria-label="Remove option">${icon('x')}</button></div>`;

  function bankTemplate(id) {
    const c = store().certs[id || (A.cert && A.cert.id)];
    if (!c) return;
    const d = c.exam.domains.length ? c.exam : { domains: [{ id: '1', short: 'Domain 1', title: 'Replace with the official domain title', weight: [20, 30] }] };
    const tmpl = {
      format: S.FORMATS.questionBank, schemaVersion: S.FILE_VERSION, certificationId: c.id,
      exam: { domains: d.domains },
      questions: [
        { id: `${c.code.replace(/[^A-Za-z0-9]/g, '')}-001`, domain: d.domains[0].id, topic: 'Example topic', diff: 'easy', type: 'single', scenario: false,
          q: 'Replace with your question text. This is an example, delete it before sharing.', opts: ['Correct option', 'Wrong option', 'Wrong option', 'Wrong option'], ans: [0],
          exp: 'Explain why the correct option is right.', why: ['', 'Why this is wrong', 'Why this is wrong', 'Why this is wrong'], refUrl: c.studyGuideUrl || 'https://example.com', refTitle: 'Reference title' },
        { id: `${c.code.replace(/[^A-Za-z0-9]/g, '')}-002`, domain: d.domains[0].id, topic: 'Example topic', diff: 'intermediate', type: 'multi', scenario: true,
          q: 'Example multiple-answer question. Select two.', opts: ['Correct', 'Correct', 'Wrong', 'Wrong'], ans: [0, 1], exp: 'Both correct options are required.' },
      ],
    };
    download(`prepwise-${c.id}-question-template.json`, tmpl);
    toast('Template downloaded. See docs/CERTIFICATION-PROFILES.md for every field.', { icon: 'download', ms: 4500 });
  }

  // ---------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------
  A.registerView('certs', { label: 'My Certifications', short: 'Certifications', icon: 'cert', scope: 'app', order: 5, render: renderCerts, eyebrow: () => `${plural(A.listCerts().length, 'certification')} on this device` });
  A.registerView('resources', { label: 'Learning Resources', short: 'Resources', icon: 'resources', scope: 'cert', order: 30, render: renderResources });

  const R = A.registerAction;
  R('new-cert', () => openEditor(null));
  R('cert-edit', (el) => openEditor(el.dataset.id));
  R('cert-details', (el) => certDetails(el.dataset.id));
  R('cert-duplicate', (el) => { closeSheet(); duplicateCert(el.dataset.id); });
  R('cert-archive', (el) => { closeSheet(); archiveCert(el.dataset.id, true); });
  R('cert-unarchive', (el) => { if (A.isSheetOpen()) closeSheet(); archiveCert(el.dataset.id, false); });
  R('cert-delete', (el) => { closeSheet(); deleteCert(el.dataset.id); });
  R('lib-filter', (el) => { lib.filter = el.dataset.f; renderCerts(); });
  R('export-cert', (el) => exportCert(el.dataset.id || A.cert.id));
  R('export-plan', (el) => exportPlan(el.dataset.id || A.cert.id));
  R('export-bank', (el) => exportBank(el.dataset.id || A.cert.id));
  R('export-progress', (el) => exportProgress(el.dataset.id || A.cert.id));
  R('export-all', () => exportAll());
  R('import-any', () => { if (A.isSheetOpen()) closeSheet(); importAny(); });
  R('import-bank', async (el) => {
    const target = el.dataset.id || (A.cert && A.cert.id);
    if (A.isSheetOpen()) closeSheet();
    const f = await pickFile();
    if (!f) return;
    const res = S.parseImport(f.text);
    if (!res.ok) return showErrors(`Can't import “${f.name}”`, res.errors, res.warnings);
    if (res.kind === 'questionBank') return importBank(res, f.name, target);
    if (res.kind === 'certification') {
      if (!res.data.questions.length) return showErrors(`Can't import “${f.name}”`, ['This certification profile has no questions.']);
      return importBank({ data: { certificationId: res.data.certification.id, exam: res.data.certification.exam, questions: res.data.questions.map(S.stripQuestion) } }, f.name, target);
    }
    return showErrors(`Can't import “${f.name}”`, [`This is a ${res.label.toLowerCase()} file, not a question bank.`]);
  });
  R('bank-template', (el) => bankTemplate(el.dataset.id));
  R('manage-questions', (el) => manageQuestions(el.dataset.id));
  R('add-question', (el) => questionForm(el.dataset.id || (A.cert && A.cert.id)));
  R('edit-question', (el) => questionForm(el.dataset.id, el.dataset.q));
  R('delete-question', async (el) => {
    const ok = await confirmDialog({ title: 'Delete this question?', body: 'It is removed from the bank. Past quiz results keep their score.', ok: 'Delete', danger: true });
    if (!ok) return;
    const list = A.getQuestions(el.dataset.id).filter((q) => q.id !== el.dataset.q);
    if (A.setQuestions(el.dataset.id, list)) { toast('Question deleted', { icon: 'trash' }); manageQuestions(el.dataset.id); }
  });
  R('q-add-opt', () => { const box = document.getElementById('q-opts'); const n = box.children.length; if (n >= 8) return toast('Up to 8 options.', { icon: 'info' }); box.insertAdjacentHTML('beforeend', optRow('', false, n)); box.lastElementChild.querySelector('textarea').focus(); });
  R('q-del-opt', (el) => { const box = document.getElementById('q-opts'); if (box.children.length <= 2) return toast('A question needs at least 2 options.', { icon: 'info' }); el.closest('.opt-row').remove(); });
  R('dom-add', () => { editing.domains.push({ id: `d${Date.now().toString(36)}`, short: '', title: '', weight: null }); document.getElementById('dom-editor').innerHTML = domainRowsEditor(editing.domains, false); });
  R('dom-remove', (el) => { editing.domains.splice(Number(el.dataset.i), 1); document.getElementById('dom-editor').innerHTML = domainRowsEditor(editing.domains, false); });
  R('resource-edit', (el) => resourceSheet(el.dataset.id || null));
  R('resource-delete', async (el) => {
    const ok = await confirmDialog({ title: 'Delete this resource?', ok: 'Delete', danger: true });
    if (!ok) return;
    A.cert.resources = A.cert.resources.filter((r) => r.id !== el.dataset.id);
    A.save(true); closeSheet(); toast('Resource deleted', { icon: 'trash' });
  });

  A.hooks.settingsData.push({
    slot: 'main',
    render: () => (A.cert ? `<div class="data-card">
      <h4>${icon('book')} ${esc(A.cert.code)} study content</h4>
      <p>Export or replace just the study plan or the question bank.</p>
      <div class="btn-row"><button class="btn" data-action="export-plan" data-id="${esc(A.cert.id)}">${icon('download')} Export plan</button><button class="btn" data-action="export-bank" data-id="${esc(A.cert.id)}">${icon('download')} Export questions</button><button class="btn" data-action="import-bank" data-id="${esc(A.cert.id)}">${icon('upload')} Import questions</button></div>
    </div>` : ''),
  });

  A.ext.certs = { derivePlan, contentOf, exportCert, exportBank, exportPlan, exportProgress, exportAll, importAny, openEditor, duplicateCert, deleteCert, archiveCert };
})();
