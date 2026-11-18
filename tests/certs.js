// Validates the built-in AB-650, SC-300, MD-102 and AI-103 profiles and writes docs/COVERAGE.md.
// Usage: node tests/certs.js            (Node 18+, no network needed)
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const ROOT = path.join(__dirname, '..');
const S = require(path.join(ROOT, 'js', 'schema.js'));

global.window = {};
const load = (id, files) => { try { files.forEach((f) => require(path.join(ROOT, 'certifications', id, f + '.js'))); } catch (e) { console.log(`FAIL - could not load ${id}: ${e.message}`); } };
load('ab-650', ['meta', 'questions-d1', 'questions-d2', 'questions-d3', 'profile']);
load('sc-300', ['meta', 'questions-d1', 'questions-d2', 'questions-d3', 'questions-d4', 'profile']);
load('md-102', ['meta', 'questions-d1', 'questions-d2', 'questions-d3', 'questions-d4', 'questions-d5', 'profile']);
load('ai-103', ['meta', 'questions-d1', 'questions-d2', 'questions-d3', 'questions-d4', 'questions-d5', 'profile']);
const builtins = Object.fromEntries(window.PrepWiseBuiltins.map((b) => [b.certification.id, b]));

// Official values from the study guides (checked 18 Nov 2026)
const OFFICIAL = {
  'ab-650': { weights: { 1: [20, 25], 2: [40, 45], 3: [35, 40] }, objectives: 58, files: 3, skillsAsOf: '2026-07-27' },
  'ai-103': { weights: { 1: [25, 30], 2: [30, 35], 3: [10, 15], 4: [10, 15], 5: [10, 15] }, objectives: 64, files: 5, skillsAsOf: '2026-04-16' },
  'sc-300': { weights: { 1: [20, 25], 2: [25, 30], 3: [20, 25], 4: [20, 25] }, objectives: 98, files: 4 },
  'md-102': { weights: { 1: [20, 25], 2: [25, 30], 3: [15, 20], 4: [15, 20], 5: [10, 15] }, objectives: 83, files: 5 },
};

let n = 0; let failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('ok -', name); } catch (e) { failed++; console.log('FAIL -', name, '\n   ', e.message); } };
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const ab = builtins['ab-650'];
const abQs = ab.questions();
const abIds = new Set(abQs.map((q) => q.id));
const abTexts = new Set(abQs.map((q) => norm(q.q)));
const report = [];

const ALL = ['ab-650', 'sc-300', 'md-102', 'ai-103'];
for (const id of ALL) {
  const b = builtins[id];
  const O = OFFICIAL[id];
  t(`${id}: profile registered and normalises`, () => {
    assert.ok(b, 'profile not registered');
    const c = S.normaliseCertification(b.certification);
    assert.equal(c.id, id);
    assert.ok(c.code && c.name && c.studyGuideUrl.includes(id));
  });
  if (!b) continue;
  const cert = S.normaliseCertification(b.certification);
  const exam = cert.exam;
  const raw = b.questions();
  const qs = raw.map((q) => S.normaliseQuestion(q, exam));
  const C = id.toUpperCase();

  t(`${id}: domain weightings match the official study guide`, () => {
    assert.equal(exam.domains.length, Object.keys(O.weights).length);
    exam.domains.forEach((d) => assert.deepEqual(d.weight, O.weights[d.id], `domain ${d.id}`));
  });
  t(`${id}: ${O.objectives} official objectives, each mapped to a defined section and domain`, () => {
    const objs = Object.keys(exam.objectives);
    assert.equal(objs.length, O.objectives);
    objs.forEach((o) => { assert.ok(exam.sections[o.split('.').slice(0, 2).join('.')], `section for ${o}`); assert.ok(exam.domains.some((d) => d.id === o.split('.')[0])); });
  });
  t(`${id}: at least 120 questions`, () => assert.ok(qs.length >= 120, `${qs.length}`));
  t(`${id}: schema validation passes with no errors or warnings`, () => {
    const r = S.validateQuestions(raw, exam);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings || [], []);
  });
  t(`${id}: every question carries all required metadata`, () => {
    raw.forEach((q, i) => {
      const w = `${q.id || i}`;
      // AB-650 keeps its original IDs (D1-001…) so existing quiz history stays linked.
      assert.ok(q.id && (id === 'ab-650' ? /^D\d-\d{3}$/.test(q.id) : q.id.startsWith(C.replace('-', '') + '-')), `${w} id prefix`);
      assert.equal(q.cert, id, `${w} cert`);
      assert.ok(exam.objectives[q.obj], `${w} obj ${q.obj}`);
      assert.ok(q.topic && q.topic.length > 2, `${w} topic`);
      assert.ok(['easy', 'intermediate', 'advanced'].includes(q.diff), `${w} diff`);
      assert.ok(['single', 'multi', 'order', 'match'].includes(q.type), `${w} type`);
      assert.ok(typeof q.scenario === 'boolean', `${w} scenario flag`);
      assert.ok(q.q && q.q.length > 20, `${w} text`);
      assert.ok(q.exp && q.exp.length > 40, `${w} explanation`);
      assert.ok(q.ref && exam.refs[q.ref], `${w} ref ${q.ref}`);
      assert.ok(/^https:\/\/learn\.microsoft\.com\//.test(exam.refs[q.ref][0]), `${w} ref is Microsoft Learn`);
    });
  });
  t(`${id}: answer keys are valid and incorrect options are explained`, () => {
    raw.forEach((q) => {
      if (q.type === 'single' || q.type === 'multi') {
        assert.ok(q.opts.length >= 3 && q.opts.length <= 8, `${q.id} options`);
        const a = q.ans;
        assert.ok(a.every((x) => Number.isInteger(x) && x >= 0 && x < q.opts.length), `${q.id} ans range`);
        assert.equal(new Set(a).size, a.length, `${q.id} duplicate ans`);
        if (q.type === 'single') assert.equal(a.length, 1, `${q.id} single needs 1`);
        else {
          assert.ok(a.length >= 2 && a.length < q.opts.length, `${q.id} multi needs 2..n-1`);
          const word = { 2: 'TWO', 3: 'THREE', 4: 'FOUR' }[a.length];
          assert.ok(q.q.includes(word), `${q.id} multi stem should say "${word}"`);
        }
        assert.equal(new Set(q.opts.map(norm)).size, q.opts.length, `${q.id} duplicate options`);
        assert.ok(Array.isArray(q.why) && q.why.length === q.opts.length, `${q.id} why length`);
        q.why.forEach((w, i) => { if (a.includes(i)) assert.equal(w, '', `${q.id} why[${i}] should be empty for a correct option`); else assert.ok(w.length > 15, `${q.id} why[${i}] missing`); });
      } else if (q.type === 'order') {
        assert.ok(q.opts.length >= 3 && q.opts.length <= 10, `${q.id} steps`);
        assert.equal(new Set(q.opts.map(norm)).size, q.opts.length);
      } else {
        assert.ok(q.pairs.length >= 3 && q.pairs.length <= 10, `${q.id} pairs`);
        assert.equal(new Set(q.pairs.map((p) => norm(p[1]))).size, q.pairs.length, `${q.id} ambiguous match targets`);
      }
    });
  });
  t(`${id}: multiple-select scoring is all-or-nothing (engine rule: exact set)`, () => {
    // Mirrors quiz-centre.js isCorrect for single/multi: sameSet(response, ans)
    const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    raw.filter((q) => q.type === 'multi').forEach((q) => {
      assert.ok(sameSet([...q.ans].reverse(), q.ans), `${q.id} full answer (any order)`);
      assert.ok(!sameSet(q.ans.slice(1), q.ans), `${q.id} partial answer must fail`);
      const wrong = q.opts.map((_, i) => i).find((i) => !q.ans.includes(i));
      assert.ok(!sameSet([...q.ans, wrong], q.ans), `${q.id} extra option must fail`);
    });
  });
  t(`${id}: no duplicate IDs or question texts`, () => {
    assert.equal(new Set(raw.map((q) => q.id)).size, raw.length);
    assert.equal(new Set(raw.map((q) => norm(q.q))).size, raw.length);
  });
  t(`${id}: no question IDs or texts shared with any other certification`, () => {
    ALL.filter((o) => o !== id && builtins[o]).forEach((o) => {
      const oq = builtins[o].questions();
      const oIds = new Set(oq.map((q) => q.id)); const oTexts = new Set(oq.map((q) => norm(q.q)));
      raw.forEach((q) => { assert.ok(!oIds.has(q.id), `${q.id} shared with ${o}`); assert.ok(!oTexts.has(norm(q.q)), `${q.id} text shared with ${o}`); });
    });
  });
  t(`${id}: at least 40% scenario-based`, () => { const p = qs.filter((q) => q.scenario).length / qs.length; assert.ok(p >= 0.4, (p * 100).toFixed(1) + '%'); });
  t(`${id}: all difficulty levels and question types used`, () => {
    ['easy', 'intermediate', 'advanced'].forEach((d) => assert.ok(qs.some((q) => q.diff === d), d));
    ['single', 'multi', 'order', 'match'].forEach((ty) => assert.ok(qs.some((q) => q.type === ty), ty));
  });
  const perObj = {}; Object.keys(exam.objectives).forEach((o) => { perObj[o] = 0; });
  qs.forEach((q) => { perObj[q.obj]++; });
  t(`${id}: every official objective has at least one question`, () => {
    const missing = Object.entries(perObj).filter(([, c]) => c === 0).map(([o]) => o);
    assert.deepEqual(missing, []);
  });
  const perDom = {}; exam.domains.forEach((d) => { perDom[d.id] = 0; }); qs.forEach((q) => { perDom[q.domain]++; });
  t(`${id}: question share per domain is within 5 points of the weighting range`, () => {
    exam.domains.forEach((d) => { const p = (perDom[d.id] / qs.length) * 100; assert.ok(p >= d.weight[0] - 5 && p <= d.weight[1] + 5, `domain ${d.id}: ${p.toFixed(1)}%`); });
  });
  t(`${id}: weighted 50-question mock exam respects the weightings`, () => {
    const W = Object.fromEntries(exam.domains.map((d) => [d.id, (d.weight[0] + d.weight[1]) / 2]));
    const sum = Object.values(W).reduce((a, x) => a + x, 0);
    const counts = Object.fromEntries(Object.entries(W).map(([k, v]) => [k, Math.round((50 * v) / sum)]));
    Object.entries(counts).forEach(([k, c]) => assert.ok(perDom[k] >= c, `domain ${k} has ${perDom[k]} questions, mock needs ${c}`));
  });
  // Study plan
  const plan = cert.plan;
  const minByDom = {}; exam.domains.forEach((d) => { minByDom[d.id] = 0; });
  t(`${id}: 4-week plan, 10.5 h a week, Mon–Fri 60 / Sat 180 / Sun 150`, () => {
    assert.equal(plan.weeks.length, 4);
    assert.deepEqual(plan.dailyTargets, [60, 60, 60, 60, 60, 180, 150]);
    plan.weeks.forEach((w, i) => assert.equal(w.sessions.reduce((a, s) => a + s.plannedMin, 0), 630, `week ${i + 1}`));
  });
  t(`${id}: every session has objectives, Microsoft Learn links and an exercise; weekly assessment and final mock present`, () => {
    plan.weeks.forEach((w, wi) => {
      w.sessions.forEach((s) => {
        assert.ok(s.objs && s.objs.length, `w${wi + 1} d${s.day} objs`);
        s.objs.forEach((o) => assert.ok(exam.objectives[o] || exam.sections[o], `w${wi + 1} obj ${o}`));
        assert.ok(s.links && s.links.length && s.links.every((l) => /^https:\/\/learn\.microsoft\.com\//.test(l.url)), `w${wi + 1} d${s.day} links`);
        assert.ok(s.exercise && s.exercise.length > 40, `w${wi + 1} d${s.day} exercise`);
      });
      assert.ok(w.sessions.some((s) => s.kind === 'assessment'), `week ${wi + 1} assessment`);
      assert.ok(w.sessions.some((s) => s.kind === 'practical'), `week ${wi + 1} practical`);
    });
    assert.ok(/mock/i.test(plan.weeks[3].sessions.find((s) => s.day === 6).topic), 'final mock');
  });
  t(`${id}: every official objective is scheduled in a study or practical session`, () => {
    const covered = new Set();
    plan.weeks.forEach((w) => w.sessions.filter((s) => s.kind !== 'assessment').forEach((s) => s.objs.forEach((o) => {
      if (exam.objectives[o]) covered.add(o); else Object.keys(exam.objectives).filter((k) => k.startsWith(o + '.')).forEach((k) => covered.add(k));
    })));
    const missing = Object.keys(exam.objectives).filter((o) => !covered.has(o));
    assert.deepEqual(missing, []);
  });
  // Study time per domain (new-content sessions only; a session's time is split across its objectives' domains)
  plan.weeks.forEach((w) => w.sessions.filter((s) => s.kind !== 'assessment').forEach((s) => {
    const doms = s.objs.map((o) => o.split('.')[0]);
    doms.forEach((d) => { minByDom[d] += s.plannedMin / doms.length; });
  }));
  const totalStudy = Object.values(minByDom).reduce((a, x) => a + x, 0);
  t(`${id}: study time per domain follows the weightings (within 6 points)`, () => {
    exam.domains.forEach((d) => { const p = (minByDom[d.id] / totalStudy) * 100; assert.ok(p >= d.weight[0] - 6 && p <= d.weight[1] + 6, `domain ${d.id}: ${p.toFixed(1)}%`); });
  });
  t(`${id}: round-trip export/import of the profile keeps all questions and the plan guide`, () => {
    const f = S.certificationFile(cert, qs);
    const r = S.parseImport(JSON.stringify(f));
    assert.ok(r.ok, (r.errors || []).join('; '));
    assert.equal(r.summary.questions, qs.length);
    assert.equal(r.data.certification.id, id);
    assert.ok(!('progress' in f));
    const s0 = r.data.certification.plan.weeks[0].sessions[0];
    assert.ok(s0.links.length && s0.exercise && s0.objs.length, 'plan guide lost on round trip');
  });

  // ---- coverage report section ----
  const types = {}; const diffs = {}; qs.forEach((q) => { types[q.type] = (types[q.type] || 0) + 1; diffs[q.diff] = (diffs[q.diff] || 0) + 1; });
  const scen = qs.filter((q) => q.scenario).length;
  const lines = [];
  lines.push(`## ${cert.code} — ${cert.name}`, '');
  lines.push(`- Official study guide: ${cert.studyGuideUrl}`);
  const meta = window[id.replace('-', '').toUpperCase()].outline;
  if (meta) lines.push(`- Outline version: ${meta.label} (checked ${meta.checkedOn})`);
  if (cert.source) lines.push(`- Skills measured as of: ${cert.source.skillsAsOf} · content verified: ${cert.source.verifiedOn} · question bank version: ${cert.source.bankVersion}`);
  lines.push(`- Questions: **${qs.length}** · scenario-based: **${scen} (${((scen / qs.length) * 100).toFixed(0)}%)**`);
  lines.push(`- Types: ${Object.entries(types).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  lines.push(`- Difficulty: ${['easy', 'intermediate', 'advanced'].map((k) => `${k} ${diffs[k] || 0}`).join(' · ')}`, '');
  lines.push('| Domain | Official weight | Questions | Share | Study time (new content) |', '|---|---|---|---|---|');
  exam.domains.forEach((d) => lines.push(`| ${d.id}. ${d.title} | ${d.weight[0]}–${d.weight[1]}% | ${perDom[d.id]} | ${((perDom[d.id] / qs.length) * 100).toFixed(1)}% | ${(minByDom[d.id] / 60).toFixed(1)} h (${((minByDom[d.id] / totalStudy) * 100).toFixed(0)}%) |`));
  lines.push('', '| Objective | Description | Questions |', '|---|---|---|');
  Object.entries(exam.objectives).forEach(([o, txt]) => lines.push(`| ${o} | ${txt.replace(/\|/g, '/')} | ${perObj[o]}${perObj[o] < 2 ? ' ⚠' : ''} |`));
  const thin = Object.entries(perObj).filter(([, c]) => c < 2).map(([o]) => o);
  lines.push('', thin.length ? `**Objectives with only one question (⚠):** ${thin.join(', ')}. Each is still covered, but consider adding questions for these first.` : '**Every objective has at least two questions.**', '');
  report.push(lines.join('\n'));
}

// ---- Source of truth, traceability and the AB-650 audit ----
for (const id of ['ab-650', 'ai-103']) {
  const c = S.normaliseCertification(builtins[id].certification);
  t(`${id}: source of truth recorded (study guide, certification, skills date, verified date, bank version, learning paths)`, () => {
    const src = c.source;
    assert.ok(src, 'no source block');
    assert.ok(/^https:\/\/learn\.microsoft\.com\/en-us\/credentials\/certifications\/resources\/study-guides\//.test(src.studyGuide), 'study guide');
    assert.ok(/^https:\/\/learn\.microsoft\.com\/en-us\/credentials\/certifications\//.test(src.certification), 'certification page');
    assert.equal(src.skillsAsOf, OFFICIAL[id].skillsAsOf);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(src.verifiedOn), 'verified date');
    assert.ok(src.bankVersion, 'bank version');
    assert.ok(src.learningPaths.length >= 3 && src.learningPaths.every((l) => l.url.startsWith('https://learn.microsoft.com/en-us/training/paths/')), 'learning paths');
  });
  t(`${id}: every question has a last-verified date`, () => builtins[id].questions().forEach((q) => assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(q.verified || ''), q.id)));
  t(`${id}: only free Microsoft Learn resources and links (no paid course providers)`, () => {
    const all = JSON.stringify({ r: c.resources, p: c.plan, refs: c.exam.refs });
    assert.ok(!/udemy|coursera|pluralsight|linkedin\.com\/learning/i.test(all), 'paid provider link found');
    c.resources.forEach((r) => assert.ok(/^https:\/\/(learn\.microsoft\.com|aka\.ms)\//.test(r.url), r.url));
  });
}
t('ai-103: every question has a hint', () => builtins['ai-103'].questions().forEach((q) => assert.ok(q.hint && q.hint.length > 5, q.id)));
t('ab-650: audited bank — 169 questions, validates, retired IDs mapped to existing replacements', () => {
  assert.equal(abQs.length, 169);
  const c = S.normaliseCertification(ab.certification);
  assert.deepEqual(S.validateQuestions(abQs, c.exam).errors, []);
  const ret = c.exam.retired;
  assert.equal(Object.keys(ret).length, 6);
  Object.entries(ret).forEach(([old, nu]) => { assert.ok(!abIds.has(old), `${old} still in bank`); assert.ok(abIds.has(nu), `${nu} missing`); });
});
t('ab-650: no Udemy or lecture wording anywhere in the AB-650 experience (plan, resources, questions)', () => {
  const c = S.normaliseCertification(ab.certification);
  const txt = JSON.stringify({ plan: c.plan, res: c.resources, desc: c.description, q: abQs, refs: c.exam.refs });
  assert.ok(!/udemy|lecture/i.test(txt), (txt.match(/.{0,60}(udemy|lecture).{0,60}/i) || [''])[0]);
});
t('ab-650: upgrade migration defined for content 1.x (Udemy host, course link pattern, old topics)', () => {
  const m = ab.migrate;
  assert.ok(m && m.removeResourceHosts.includes('udemy.com') && new RegExp(m.courseUrlPattern).test('https://www.udemy.com/course/ms100course/learn/lecture/57913107#content'));
  assert.equal(m.oldWeeks.length, 4); m.oldWeeks.forEach((w) => assert.equal(w.topics.length, 7));
});

const out = ['# Question bank coverage report', '', `Generated by \`node tests/certs.js\` on ${new Date().toISOString().slice(0, 10)}. ⚠ marks objectives with a single question.`, '', ...report].join('\n');
fs.writeFileSync(path.join(ROOT, 'docs', 'COVERAGE.md'), out + '\n');
console.log(`${n} passed, ${failed} failed. Coverage report: docs/COVERAGE.md`);
process.exitCode = failed ? 1 : 0;
