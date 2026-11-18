/* =========================================================
   PrepWise — Study notes, bookmarks, the Revision area and the
   certification readiness indicator. Everything here belongs to the
   active certification's personal progress.
   ========================================================= */
'use strict';

(() => {
  const A = window.PrepWise;
  if (!A) return;
  const { icon, esc, toast, confirmDialog, openSheet, closeSheet, plural, fmtDate, uid } = A;
  const st = () => A.state;
  const Q = () => A.ext.quiz;

  // ---------------------------------------------------------------
  // Readiness indicator (transparent, not an official prediction)
  // ---------------------------------------------------------------
  const WEIGHTS = { study: 25, quiz: 20, mastery: 35, recent: 20 };
  function readiness(o) {
    if (!st() || !o) return null;
    const q = Q();
    const hasBank = !!(q && q.QS.length);
    const os = hasBank ? q.overallStats() : null;
    const rd = hasBank ? q.readiness() : null;
    // Recent assessments: the last 3 results with 10+ questions, from the Quiz Centre or recorded practice tests.
    const quizAttempts = hasBank ? q.qs().attempts.filter((t) => t.total >= 10).map((t) => ({ date: t.date.slice(0, 10), pct: t.pct, title: t.title })) : [];
    const manual = st().quizzes.filter((t) => A.num(t.questions) >= 10).map((t) => ({ date: t.date, pct: (A.num(t.correct) / A.num(t.questions)) * 100, title: t.name }));
    const recentList = [...quizAttempts, ...manual].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(-3);
    const parts = [
      { key: 'study', label: 'Study completion', value: o.pct, available: o.total + o.weeks.reduce((a, w) => a + w.objTotal, 0) > 0, desc: 'Sessions completed (partial counts half) and weekly objectives ticked.' },
      { key: 'quiz', label: 'Quiz performance', value: os ? os.accuracy : 0, available: hasBank, desc: os && os.answers ? `Accuracy across ${plural(os.answers, 'answer')} in the Quiz Centre.` : 'Accuracy across all Quiz Centre answers. No answers yet, so this counts as 0%.' },
      { key: 'mastery', label: 'Exam domain mastery', value: rd ? rd.score : 0, available: hasBank, desc: rd ? `Weighted by the exam domains. ${rd.masteredCount} of ${rd.ds.length} domains at your ${st().settings.masteryTarget}% target.` : '' },
      { key: 'recent', label: 'Recent assessment results', value: recentList.length ? recentList.reduce((a, t) => a + t.pct, 0) / recentList.length : 0, available: hasBank || manual.length > 0, desc: recentList.length ? `Average of your last ${plural(recentList.length, 'result')} with 10 or more questions.` : 'Average of your last 3 results with 10+ questions. None yet, so this counts as 0%.' },
    ];
    const live = parts.filter((p) => p.available);
    const wsum = live.reduce((a, p) => a + WEIGHTS[p.key], 0) || 1;
    parts.forEach((p) => { p.weight = p.available ? (WEIGHTS[p.key] / wsum) * 100 : 0; p.contribution = p.available ? (p.value * WEIGHTS[p.key]) / wsum : 0; });
    const score = parts.reduce((a, p) => a + p.contribution, 0);
    return { score, parts, hasBank, recentList, note: hasBank ? '' : 'This certification has no question bank, so quiz performance and domain mastery are left out and the other parts are re-weighted.' };
  }

  function readinessPanel(o) {
    const R = readiness(o);
    if (!R) return '';
    const c = A.cert;
    return `<section class="panel span-3" id="readiness">
      <div class="panel-head"><h3>Certification readiness</h3><span class="tiny muted">How the score is calculated</span></div>
      <div class="readiness">
        <div class="ring-wrap">${A.ring(R.score, 128, 11, 'rdGrad')}<div class="ring-label"><span class="ring-value num">${Math.round(R.score)}%</span><span class="ring-caption">readiness</span></div></div>
        <div class="rd-table" role="table" aria-label="Readiness calculation">
          <div class="rd-row head" role="row"><span role="columnheader">Component</span><span role="columnheader">Score</span><span role="columnheader">Weight</span><span role="columnheader">Adds</span></div>
          ${R.parts.map((p) => `<div class="rd-row ${p.available ? '' : 'off'}" role="row">
            <span role="cell"><strong>${esc(p.label)}</strong><span class="tiny muted">${p.available ? esc(p.desc) : 'Not available for this certification'}</span></span>
            <span class="num" role="cell">${p.available ? `${Math.round(p.value)}%` : '—'}</span>
            <span class="num" role="cell">${p.available ? `${Math.round(p.weight)}%` : '—'}</span>
            <span class="num" role="cell">${p.available ? `${p.contribution.toFixed(1)}` : '—'}</span>
          </div>`).join('')}
          <div class="rd-row total" role="row"><span role="cell">Readiness</span><span></span><span class="num" role="cell">100%</span><span class="num" role="cell">${R.score.toFixed(1)}</span></div>
        </div>
      </div>
      ${R.note ? `<div class="tiny muted" style="margin-top:8px">${esc(R.note)}</div>` : ''}
      <div class="callout info" style="margin-top:12px">${icon('info')}<div>This indicator only reflects your own study activity and practice results in ${esc(A.APP_NAME)}. It isn't an official ${esc(c.provider)} prediction of passing ${esc(c.code)}.</div></div>
    </section>`;
  }

  // ---------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------
  const SCOPES = { cert: 'Certification', week: 'Study week', topic: 'Topic', objective: 'Exam objective' };
  function scopeLabel(n) {
    const s = n.scope || { type: 'cert' };
    if (s.type === 'week') return `Week ${s.week}${st().weeks[s.week - 1] ? ` · ${st().weeks[s.week - 1].title}` : ''}`;
    if (s.type === 'topic') return `Topic · ${s.topic}`;
    if (s.type === 'objective') { const t = A.cert.exam.objectives[s.obj]; return `Objective ${s.obj}${t ? ` · ${t}` : ''}`; }
    return A.cert.code;
  }
  function topicsList() {
    const set = new Set();
    if (Q()) Q().QS.forEach((q) => q.topic && set.add(q.topic));
    st().bookmarks.topics.forEach((t) => set.add(t));
    return [...set].sort();
  }

  function noteSheet(id, preset = {}) {
    const n = id ? st().notes.find((x) => x.id === id) : null;
    const scope = n ? n.scope || { type: 'cert' } : { type: preset.type || 'cert', week: preset.week, topic: preset.topic, obj: preset.obj };
    const objs = Object.entries(A.cert.exam.objectives);
    const important = n ? st().bookmarks.notes.includes(n.id) : false;
    openSheet(`
      <div class="sheet-title"><div><div class="eyebrow">${esc(A.cert.code)} · Study notes</div><h2>${n ? 'Edit note' : 'New note'}</h2></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Close">${icon('x')}</button></div>
      <form id="note-form" novalidate>
        <label class="field" style="margin-top:0"><span class="label">Title</span><input class="input" name="title" maxlength="120" value="${esc(n ? n.title : '')}" placeholder="e.g. Conditional Access gotchas"></label>
        <div class="form-grid">
          <label class="field"><span class="label">Linked to</span><select class="select" name="type">${Object.entries(SCOPES).filter(([k]) => k !== 'objective' || objs.length).map(([k, l]) => `<option value="${k}" ${scope.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field" data-scope="week" ${scope.type === 'week' ? '' : 'hidden'}><span class="label">Week</span><select class="select" name="week">${A.weekNums().map((w) => `<option value="${w}" ${Number(scope.week) === w ? 'selected' : ''}>Week ${w} · ${esc(st().weeks[w - 1].title)}</option>`).join('')}</select></label>
          <label class="field" data-scope="topic" ${scope.type === 'topic' ? '' : 'hidden'}><span class="label">Topic</span><input class="input" name="topic" list="note-topics" maxlength="80" value="${esc(scope.topic || '')}"><datalist id="note-topics">${topicsList().map((t) => `<option value="${esc(t)}">`).join('')}</datalist></label>
          ${objs.length ? `<label class="field" data-scope="objective" ${scope.type === 'objective' ? '' : 'hidden'}><span class="label">Exam objective</span><select class="select" name="obj">${objs.map(([k, v]) => `<option value="${esc(k)}" ${scope.obj === k ? 'selected' : ''}>${esc(k)} · ${esc(v.slice(0, 80))}</option>`).join('')}</select></label>` : ''}
        </div>
        <label class="field"><span class="label">Note</span><textarea class="textarea tall" name="body" maxlength="20000" placeholder="Write anything that helps you remember">${esc(n ? n.body : '')}</textarea></label>
        <label class="field check-field"><input type="checkbox" name="important" ${important ? 'checked' : ''}><span>Bookmark as an important note</span></label>
        <div class="btn-row" style="margin-top:20px">
          ${n ? `<button type="button" class="btn btn-danger" data-action="note-delete" data-id="${esc(n.id)}">${icon('trash')} Delete</button>` : ''}
          <button type="submit" class="btn btn-primary">${n ? 'Save note' : 'Add note'}</button>
        </div>
      </form>`, { wide: true });
    const form = document.getElementById('note-form');
    form.type.addEventListener('change', () => form.querySelectorAll('[data-scope]').forEach((f) => { f.hidden = f.dataset.scope !== form.type.value; }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const body = form.body.value.trim(), title = form.title.value.trim();
      if (!body && !title) return toast('Write something first.', { icon: 'x' });
      const type = form.type.value;
      const sc = { type };
      if (type === 'week') sc.week = Number(form.week.value);
      if (type === 'topic') { sc.topic = form.topic.value.trim(); if (!sc.topic) return toast('Enter the topic this note is about.', { icon: 'x' }); }
      if (type === 'objective') sc.obj = form.obj.value;
      const now = new Date().toISOString();
      let note = n;
      if (n) Object.assign(n, { title, body, scope: sc, updatedAt: now });
      else { note = { id: `n-${uid()}`, title, body, scope: sc, createdAt: now, updatedAt: now }; st().notes.push(note); }
      const bm = st().bookmarks.notes;
      if (form.important.checked && !bm.includes(note.id)) bm.push(note.id);
      if (!form.important.checked) st().bookmarks.notes = bm.filter((x) => x !== note.id);
      A.logActivity({});
      A.save(true); closeSheet();
      toast(n ? 'Note saved' : 'Note added', { icon: 'note' });
    });
  }

  function noteCard(n) {
    const imp = st().bookmarks.notes.includes(n.id);
    return `<button class="note-card" data-action="note-edit" data-id="${esc(n.id)}">
      <div class="nc-top"><span class="chip ${n.scope && n.scope.type !== 'cert' ? 'violet' : 'blue'}">${esc(SCOPES[(n.scope || {}).type || 'cert'])}</span>${imp ? `<span class="nc-bm">${icon('bookmark')}</span>` : ''}</div>
      <div class="nc-title">${esc(n.title || (n.body || '').split('\n')[0].slice(0, 80) || 'Untitled note')}</div>
      <div class="nc-body">${esc((n.body || '').slice(0, 220))}</div>
      <div class="nc-meta tiny muted">${esc(scopeLabel(n))} · ${fmtDate((n.updatedAt || n.createdAt).slice(0, 10), { day: 'numeric', month: 'short' })}</div>
    </button>`;
  }

  // ---------------------------------------------------------------
  // Revision view: bookmarks + notes
  // ---------------------------------------------------------------
  const ui = { notesFilter: 'all', notesQ: '' };
  function renderRevision() {
    const el = document.getElementById('view-revision');
    if (!A.cert) { el.innerHTML = `<div class="panel">${A.emptyState('cert', 'No active certification')}</div>`; return; }
    const tab = st().ui.revisionTab === 'notes' ? 'notes' : 'bookmarks';
    const counts = bookmarkCounts();
    el.innerHTML = `
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="${tab === 'bookmarks'}" class="${tab === 'bookmarks' ? 'active' : ''}" data-action="rev-tab" data-t="bookmarks">${icon('bookmark')} Bookmarks <span class="count">${counts.total}</span></button>
        <button role="tab" aria-selected="${tab === 'notes'}" class="${tab === 'notes' ? 'active' : ''}" data-action="rev-tab" data-t="notes">${icon('note')} Notes <span class="count">${st().notes.length}</span></button>
        <span class="tabs-spacer"></span>
        <button class="btn btn-primary btn-sm" data-action="note-new">${icon('plus')} New note</button>
      </div>
      ${tab === 'bookmarks' ? bookmarksHTML(counts) : notesHTML()}`;
    const s = document.getElementById('notes-search');
    if (s) s.addEventListener('input', () => { ui.notesQ = s.value; const pos = s.selectionStart; renderRevision(); const n = document.getElementById('notes-search'); n.focus(); n.setSelectionRange(pos, pos); });
    const f = document.getElementById('notes-filter');
    if (f) f.addEventListener('change', () => { ui.notesFilter = f.value; renderRevision(); });
  }

  function bookmarkCounts() {
    const q = Q();
    const questions = q ? q.qs().flagged.filter((id) => q.QMAP.has(id)) : [];
    const resources = st().bookmarks.resources.filter((id) => A.cert.resources.some((r) => r.id === id));
    const notes = st().bookmarks.notes.filter((id) => st().notes.some((n) => n.id === id));
    const topics = st().bookmarks.topics;
    return { questions, resources, notes, topics, total: questions.length + resources.length + notes.length + topics.length };
  }

  function bookmarksHTML(c) {
    const q = Q();
    const ts = q ? Object.fromEntries((q.weakTopics(999) || []).map((t) => [t.topic, t])) : {};
    return `<div class="rev-grid">
      <section class="panel span-2">
        <div class="panel-head"><h3>Questions</h3>${c.questions.length ? `<button class="btn btn-sm btn-teal" data-qc="start" data-mode="flagged">${icon('play')} Practise ${c.questions.length}</button>` : ''}</div>
        ${c.questions.length ? `<div class="bm-qs">${c.questions.map((id) => {
          const qq = q.QMAP.get(id);
          const r = qq.type === 'single' || qq.type === 'multi' ? qq.ans : qq.type === 'order' ? qq.opts.map((_, i) => i) : qq.pairs.map((_, i) => i);
          return `<details class="qx-review ok"><summary><span class="qx-rv">${icon('bookmark')}</span><span class="qx-rq">${esc(qq.q)}</span></summary>
            <div class="qx-rbody"><div class="qx-rtools">${q.chipRow(qq)}<button class="mini-btn flag-on" data-action="bm-question" data-q="${esc(id)}" aria-label="Remove bookmark">${icon('bookmark')}</button></div>
            ${q.optionsHTML(qq, null, r, true, true)}${q.explanationHTML(qq, r)}</div></details>`;
        }).join('')}</div>`
          : '<div class="small muted">Bookmark questions while you take a quiz (the bookmark button below each question) or when reviewing results.</div>'}
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Difficult topics</h3></div>
        ${c.topics.length ? `<div class="list-gap">${c.topics.map((t) => { const s = ts[t]; return `<div class="qx-rec"><div style="min-width:0"><div class="t">${esc(t)}</div><div class="tiny muted">${s ? `${s.c}/${s.n} correct on latest attempt` : 'No recent mistakes'}</div></div>
          <div class="row-actions"><button class="mini-btn" data-action="note-new" data-type="topic" data-topic="${esc(t)}" aria-label="Add a note">${icon('note')}</button><button class="mini-btn flag-on" data-action="bm-topic" data-topic="${esc(t)}" aria-label="Remove bookmark">${icon('bookmark')}</button></div></div>`; }).join('')}</div>`
          : '<div class="small muted">Bookmark topics from the Quiz Centre’s “Topics to revise”, or add one here.</div>'}
        <div class="inline-add"><input class="input" id="bm-topic-input" list="bm-topics" placeholder="Add a topic" data-enter="bm-topic-add" aria-label="Topic to bookmark"><datalist id="bm-topics">${topicsList().map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
          <button class="btn" data-action="bm-topic-add" aria-label="Bookmark topic">${icon('plus')}</button></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Learning resources</h3><button class="link-btn" data-nav="resources">All resources ${icon('chevron')}</button></div>
        ${c.resources.length ? `<div class="list-gap">${c.resources.map((id) => { const r = A.cert.resources.find((x) => x.id === id); return `<div class="qx-rec"><div style="min-width:0"><div class="t">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</div>${r.notes ? `<div class="tiny muted">${esc(r.notes)}</div>` : ''}</div>${resourceBookmarkBtn(id)}</div>`; }).join('')}</div>`
          : '<div class="small muted">Bookmark resources from the Learning Resources page.</div>'}
      </section>
      <section class="panel span-2">
        <div class="panel-head"><h3>Important notes</h3></div>
        ${c.notes.length ? `<div class="note-grid">${c.notes.map((id) => noteCard(st().notes.find((n) => n.id === id))).join('')}</div>` : '<div class="small muted">Tick “Bookmark as an important note” when you write a note.</div>'}
      </section>
    </div>`;
  }

  function notesHTML() {
    const term = ui.notesQ.trim().toLowerCase();
    const f = ui.notesFilter;
    const notes = st().notes.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .filter((n) => f === 'all' || (f.startsWith('week:') ? n.scope && n.scope.type === 'week' && String(n.scope.week) === f.slice(5) : (n.scope || { type: 'cert' }).type === f))
      .filter((n) => !term || `${n.title} ${n.body} ${scopeLabel(n)}`.toLowerCase().includes(term));
    return `<div class="lib-toolbar">
        <label class="search">${icon('search')}<input class="input" type="search" id="notes-search" placeholder="Search notes" value="${esc(ui.notesQ)}" aria-label="Search notes"></label>
        <select class="select w-auto" id="notes-filter" aria-label="Filter notes">
          <option value="all">All notes</option>${Object.entries(SCOPES).map(([k, l]) => `<option value="${k}" ${f === k ? 'selected' : ''}>${l} notes</option>`).join('')}
          ${A.weekNums().map((w) => `<option value="week:${w}" ${f === `week:${w}` ? 'selected' : ''}>Week ${w}</option>`).join('')}
        </select>
      </div>
      ${notes.length ? `<div class="note-grid">${notes.map(noteCard).join('')}</div>` : `<div class="panel">${A.emptyState('note', st().notes.length ? 'No notes match' : 'No notes yet', st().notes.length ? '' : 'Notes can be linked to this certification, a study week, a topic or an exam objective.', st().notes.length ? '' : `<button class="btn btn-primary" data-action="note-new">${icon('plus')} New note</button>`)}</div>`}`;
  }

  function topicBookmarkBtn(topic) {
    const on = st() && st().bookmarks.topics.includes(topic);
    return `<button class="mini-btn ${on ? 'flag-on' : ''}" data-action="bm-topic" data-topic="${esc(topic)}" aria-label="${on ? 'Remove topic bookmark' : 'Bookmark topic'}" aria-pressed="${on}">${icon('bookmark')}</button>`;
  }
  function resourceBookmarkBtn(id) {
    const on = st() && st().bookmarks.resources.includes(id);
    return `<button class="mini-btn ${on ? 'flag-on' : ''}" data-action="bm-resource" data-id="${esc(id)}" aria-label="${on ? 'Remove resource bookmark' : 'Bookmark resource'}" aria-pressed="${on}">${icon('bookmark')}</button>`;
  }
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // ---------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------
  A.registerView('revision', { label: 'Revision & Notes', short: 'Revision', icon: 'revision', scope: 'cert', order: 35, render: renderRevision });
  const R = A.registerAction;
  R('rev-tab', (el) => { st().ui.revisionTab = el.dataset.t; A.save(); renderRevision(); });
  R('note-new', (el) => noteSheet(null, { type: el.dataset.type, week: Number(el.dataset.week) || undefined, topic: el.dataset.topic }));
  R('note-edit', (el) => noteSheet(el.dataset.id));
  R('note-delete', async (el) => {
    const ok = await confirmDialog({ title: 'Delete this note?', ok: 'Delete', danger: true });
    if (!ok) return;
    st().notes = st().notes.filter((n) => n.id !== el.dataset.id);
    st().bookmarks.notes = st().bookmarks.notes.filter((x) => x !== el.dataset.id);
    A.save(true); closeSheet(); toast('Note deleted', { icon: 'trash' });
  });
  R('bm-topic', (el) => { st().bookmarks.topics = toggleIn(st().bookmarks.topics, el.dataset.topic); A.save(); toast(st().bookmarks.topics.includes(el.dataset.topic) ? 'Topic bookmarked' : 'Topic bookmark removed', { icon: 'bookmark', ms: 1200 }); A.renderCurrent(); });
  R('bm-topic-add', () => {
    const i = document.getElementById('bm-topic-input');
    const t = i && i.value.trim();
    if (!t) return i && i.focus();
    if (!st().bookmarks.topics.includes(t)) st().bookmarks.topics.push(t);
    A.save(); A.renderCurrent();
  });
  R('bm-resource', (el) => { st().bookmarks.resources = toggleIn(st().bookmarks.resources, el.dataset.id); A.save(); A.renderCurrent(); });
  R('bm-question', (el) => { Q().toggleBookmark(el.dataset.q); A.renderCurrent(); });

  A.hooks.analytics.push({ slot: 'main', order: 0, render: (o) => readinessPanel(o) });
  A.hooks.planWeek.push({
    slot: 'main',
    render: ({ week }) => {
      const notes = st().notes.filter((n) => n.scope && n.scope.type === 'week' && n.scope.week === week);
      return `<div class="group-label">Week notes</div>
        ${notes.length ? `<div class="list-gap">${notes.map((n) => `<button class="row-card" data-action="note-edit" data-id="${esc(n.id)}"><span>${icon('note')}</span><span style="flex:1;min-width:0;text-align:left"><strong>${esc(n.title || 'Untitled note')}</strong><span class="tiny muted block">${esc((n.body || '').slice(0, 90))}</span></span></button>`).join('')}</div>` : ''}
        <button class="btn btn-sm btn-ghost btn-block" style="margin-top:8px" data-action="note-new" data-type="week" data-week="${week}">${icon('plus')} Add a note for week ${week}</button>`;
    },
  });
  A.hooks.home.push({
    slot: 'side', order: 3,
    render: () => {
      const c = bookmarkCounts();
      return `<section class="panel">
        <div class="panel-head"><h3>Revision</h3><button class="link-btn" data-nav="revision">Open ${icon('chevron')}</button></div>
        <div class="stat-row">
          <div class="mini-stat"><div class="k">Questions</div><div class="v num">${c.questions.length}</div></div>
          <div class="mini-stat"><div class="k">Topics</div><div class="v num">${c.topics.length}</div></div>
          <div class="mini-stat"><div class="k">Notes</div><div class="v num">${st().notes.length}</div></div>
        </div>
      </section>`;
    },
  });

  A.ext.revision = { readiness, topicBookmarkBtn, resourceBookmarkBtn, noteSheet };
})();
