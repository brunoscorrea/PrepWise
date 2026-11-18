/* =========================================================
   PrepWise — data schema, validation and import/export formats.
   Pure functions with no DOM access, so they also run in Node for tests.
   The file formats are documented in docs/CERTIFICATION-PROFILES.md.
   ========================================================= */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PrepWiseSchema = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Version of the on-device store (localStorage). v1 was the single-exam "M365 Study Tracker".
  const STORE_VERSION = 2;
  // Version of shareable exchange files. Bump when a breaking change is made to a format.
  const FILE_VERSION = 1;
  const SUPPORTED_FILE_VERSIONS = [1];

  const FORMATS = {
    certification: 'prepwise.certification',
    questionBank: 'prepwise.questionbank',
    studyPlan: 'prepwise.studyplan',
    progress: 'prepwise.progress',
    backup: 'prepwise.backup',
  };
  const FORMAT_LABEL = {
    certification: 'Certification profile',
    questionBank: 'Question bank',
    studyPlan: 'Study plan',
    progress: 'Personal progress',
    backup: 'Full application backup',
    legacy: 'Study Tracker v1 backup',
  };

  const CERT_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
  const Q_TYPES = ['single', 'multi', 'order', 'match'];
  const DIFFS = ['easy', 'intermediate', 'advanced'];
  const KINDS = ['study', 'practical', 'revision', 'assessment'];
  const RESOURCE_TYPES = ['course', 'documentation', 'study-guide', 'video', 'lab', 'practice-test', 'book', 'other'];
  const MAX_WEEKS = 52;

  const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
  const isStr = (v) => typeof v === 'string';
  const nonEmpty = (v) => isStr(v) && v.trim().length > 0;
  const isUrl = (v) => isStr(v) && /^https?:\/\/[^\s]+$/i.test(v.trim());
  const isInt = (v) => Number.isInteger(v);

  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/g, '');
  }
  function isValidCertId(id) { return isStr(id) && CERT_ID_RE.test(id); }
  // Make an id unique against a set of existing ids: "az-104", "az-104-2", ...
  function uniqueId(base, taken) {
    let id = slugify(base) || 'certification';
    if (!CERT_ID_RE.test(id)) id = 'certification';
    if (!taken.has(id)) return id;
    let n = 2;
    while (taken.has(`${id.slice(0, 44)}-${n}`)) n++;
    return `${id.slice(0, 44)}-${n}`;
  }

  // -------------------------------------------------------------
  // Exam configuration (domains, objectives, references, quiz modes)
  // -------------------------------------------------------------
  function normaliseExam(exam) {
    const e = isObj(exam) ? exam : {};
    const domains = Array.isArray(e.domains) ? e.domains.filter(isObj).map((d, i) => ({
      id: String(d.id != null && String(d.id).trim() !== '' ? d.id : i + 1),
      short: String(d.short || d.title || `Domain ${i + 1}`).slice(0, 40),
      title: String(d.title || d.short || `Domain ${i + 1}`).slice(0, 200),
      weight: Array.isArray(d.weight) && d.weight.length === 2 && d.weight.every((w) => typeof w === 'number' && w >= 0 && w <= 100)
        ? [Math.min(d.weight[0], d.weight[1]), Math.max(d.weight[0], d.weight[1])] : null,
    })) : [];
    const strMap = (m) => (isObj(m) ? Object.fromEntries(Object.entries(m).filter(([, v]) => isStr(v)).map(([k, v]) => [String(k), v])) : {});
    const refs = isObj(e.refs) ? Object.fromEntries(Object.entries(e.refs)
      .filter(([, v]) => Array.isArray(v) && isUrl(v[0]))
      .map(([k, v]) => [String(k), [String(v[0]).trim(), String(v[1] || v[0])]])) : {};
    const mode = (m, count, minutes) => ({
      count: clampInt(isObj(m) ? m.count : null, 5, 200, count),
      minutes: clampInt(isObj(m) ? m.minutes : null, 5, 400, minutes),
    });
    const modes = isObj(e.modes) ? e.modes : {};
    return {
      masteryTarget: clampInt(e.masteryTarget, 1, 100, 85),
      minCoverage: typeof e.minCoverage === 'number' && e.minCoverage > 0 && e.minCoverage <= 1 ? e.minCoverage : 0.6,
      passingScore: e.passingScore == null || e.passingScore === '' ? null : clampInt(e.passingScore, 1, 1000, null),
      passingScoreNote: isStr(e.passingScoreNote) ? e.passingScoreNote : '',
      domains,
      sections: strMap(e.sections),
      objectives: strMap(e.objectives),
      refs,
      weekSections: isObj(e.weekSections) ? Object.fromEntries(Object.entries(e.weekSections)
        .filter(([k, v]) => /^\d+$/.test(k) && Array.isArray(v)).map(([k, v]) => [k, v.map(String)])) : {},
      modes: { mock: mode(modes.mock, 50, 100), final: mode(modes.final, 60, 120) },
      seed: isStr(e.seed) && e.seed ? e.seed : '',
      disclaimer: isStr(e.disclaimer) ? e.disclaimer : '',
      // Question IDs taken out of the bank, mapped to their replacement ('' = removed without one).
      // History stays stored; bookmarks move to the replacement (quiz-centre.js).
      // Only stored when present, so certifications without retired questions keep their exact shape.
      ...(isObj(e.retired) && Object.keys(e.retired).length ? { retired: Object.fromEntries(Object.entries(e.retired).filter(([, v]) => typeof v === 'string').map(([k, v]) => [String(k), v])) } : {}),
    };
  }

  // Where a certification's content comes from (shown in My Certifications, used for maintenance).
  const isDate = (s) => isStr(s) && /^\d{4}-\d{2}-\d{2}$/.test(s);
  function normaliseSource(s) {
    if (!isObj(s)) return null;
    const out = {
      studyGuide: isUrl(s.studyGuide) ? s.studyGuide.trim() : '',
      certification: isUrl(s.certification) ? s.certification.trim() : '',
      skillsAsOf: isDate(s.skillsAsOf) ? s.skillsAsOf : '',
      verifiedOn: isDate(s.verifiedOn) ? s.verifiedOn : '',
      bankVersion: isStr(s.bankVersion) ? s.bankVersion.slice(0, 20) : '',
      learningPaths: Array.isArray(s.learningPaths) ? s.learningPaths.filter((p) => isObj(p) && isUrl(p.url)).slice(0, 20).map((p) => ({ title: String(p.title || p.url).slice(0, 140), url: p.url.trim() })) : [],
      notes: isStr(s.notes) ? s.notes.slice(0, 1000) : '',
    };
    return Object.values(out).some((v) => (Array.isArray(v) ? v.length : v)) ? out : null;
  }
  function clampInt(v, lo, hi, fallback) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, Math.round(n)));
  }

  function validateExam(exam, errors, warnings, path = 'exam') {
    if (exam == null) return;
    if (!isObj(exam)) { errors.push(`${path} must be an object.`); return; }
    if (exam.domains != null && !Array.isArray(exam.domains)) errors.push(`${path}.domains must be a list.`);
    if (Array.isArray(exam.domains)) {
      const seen = new Set();
      exam.domains.forEach((d, i) => {
        if (!isObj(d)) { errors.push(`${path}.domains[${i}] must be an object.`); return; }
        if (d.id == null || String(d.id).trim() === '') errors.push(`${path}.domains[${i}] is missing "id".`);
        else if (seen.has(String(d.id))) errors.push(`Duplicate domain id "${d.id}".`);
        else seen.add(String(d.id));
        if (!nonEmpty(d.title)) errors.push(`${path}.domains[${i}] is missing "title".`);
        if (d.weight != null && !(Array.isArray(d.weight) && d.weight.length === 2 && d.weight.every((w) => typeof w === 'number' && w >= 0 && w <= 100))) {
          errors.push(`${path}.domains[${i}].weight must be [min, max] percentages.`);
        }
      });
    }
    if (exam.refs != null && !isObj(exam.refs)) errors.push(`${path}.refs must be an object of key: [url, title].`);
    if (isObj(exam.refs)) Object.entries(exam.refs).forEach(([k, v]) => { if (!Array.isArray(v) || !isUrl(v[0])) warnings.push(`Reference "${k}" has no valid https URL and will be ignored.`); });
  }

  // -------------------------------------------------------------
  // Questions
  // -------------------------------------------------------------
  // Fill in derived fields without changing authored content.
  function normaliseQuestion(q, exam) {
    const out = { ...q };
    out.id = String(q.id);
    if (out.domain == null && isStr(q.obj) && exam && exam.domains.some((d) => d.id === q.obj.split('.')[0])) out.domain = q.obj.split('.')[0];
    out.domain = out.domain != null ? String(out.domain) : '';
    if (!DIFFS.includes(out.diff)) out.diff = 'intermediate';
    out.obj = isStr(q.obj) ? q.obj : '';
    out.topic = isStr(q.topic) && q.topic.trim() ? q.topic : (out.obj || 'General');
    out.scenario = !!q.scenario;
    out.exp = isStr(q.exp) ? q.exp : '';
    out.feat = isStr(q.feat) ? q.feat : '';
    return out;
  }

  function validateQuestion(q, i, ctx) {
    const errs = [], warns = [];
    const where = `Question ${i + 1}${q && q.id != null ? ` (${q.id})` : ''}`;
    if (!isObj(q)) return { errs: [`${where} is not an object.`], warns };
    if (q.id == null || String(q.id).trim() === '') errs.push(`${where} is missing "id".`);
    else if (String(q.id).length > 64) errs.push(`${where}: id is longer than 64 characters.`);
    if (!Q_TYPES.includes(q.type)) errs.push(`${where}: "type" must be one of ${Q_TYPES.join(', ')}.`);
    if (!nonEmpty(q.q)) errs.push(`${where} is missing the question text "q".`);
    const domainId = q.domain != null ? String(q.domain) : (isStr(q.obj) ? q.obj.split('.')[0] : '');
    if (ctx.domainIds) {
      if (!domainId) errs.push(`${where} has no "domain".`);
      else if (!ctx.domainIds.has(domainId)) errs.push(`${where} refers to domain "${domainId}", which this certification doesn't have.`);
    }
    if (q.type === 'single' || q.type === 'multi') {
      if (!Array.isArray(q.opts) || q.opts.length < 2 || q.opts.length > 8 || !q.opts.every(nonEmpty)) errs.push(`${where}: "opts" must be a list of 2–8 answer options.`);
      if (!Array.isArray(q.ans) || !q.ans.length) errs.push(`${where}: "ans" must list the correct option index(es).`);
      else {
        const n = Array.isArray(q.opts) ? q.opts.length : 0;
        if (!q.ans.every((a) => isInt(a) && a >= 0 && a < n)) errs.push(`${where}: "ans" refers to an option that doesn't exist (indexes start at 0).`);
        if (new Set(q.ans).size !== q.ans.length) errs.push(`${where}: "ans" lists the same option twice.`);
        if (q.type === 'single' && q.ans.length !== 1) errs.push(`${where}: a single-answer question needs exactly one index in "ans".`);
        if (q.type === 'multi' && Array.isArray(q.opts) && q.ans.length >= q.opts.length) errs.push(`${where}: a multiple-answer question can't have every option correct.`);
      }
      if (q.why != null && (!Array.isArray(q.why) || (Array.isArray(q.opts) && q.why.length !== q.opts.length))) warns.push(`${where}: "why" should have one entry per option.`);
    } else if (q.type === 'order') {
      if (!Array.isArray(q.opts) || q.opts.length < 2 || q.opts.length > 10 || !q.opts.every(nonEmpty)) errs.push(`${where}: ordering questions need 2–10 steps in "opts", listed in the correct order.`);
    } else if (q.type === 'match') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.length > 10 || !q.pairs.every((p) => Array.isArray(p) && p.length === 2 && nonEmpty(p[0]) && nonEmpty(p[1]))) {
        errs.push(`${where}: matching questions need 2–10 "pairs" of ["left", "right"].`);
      }
    }
    if (q.diff != null && !DIFFS.includes(q.diff)) warns.push(`${where}: unknown difficulty "${q.diff}", it will be treated as intermediate.`);
    if (!nonEmpty(q.exp)) warns.push(`${where} has no explanation ("exp").`);
    if (q.ref != null && ctx.refs && !ctx.refs[q.ref]) warns.push(`${where}: reference "${q.ref}" isn't defined in exam.refs.`);
    if (q.refUrl != null && !isUrl(q.refUrl)) errs.push(`${where}: "refUrl" must be an http(s) link.`);
    if (q.hint != null && !isStr(q.hint)) warns.push(`${where}: "hint" should be text.`);
    if (q.verified != null && !(isStr(q.verified) && /^\d{4}-\d{2}-\d{2}$/.test(q.verified))) warns.push(`${where}: "verified" should be a date (YYYY-MM-DD).`);
    return { errs, warns };
  }

  // Validate a list of questions against an exam config. existingIds lets a merge flag clashes.
  function validateQuestions(list, exam, opts = {}) {
    const errors = [], warnings = [];
    if (!Array.isArray(list)) return { errors: ['"questions" must be a list.'], warnings, duplicates: [] };
    const ex = normaliseExam(exam);
    const ctx = { domainIds: new Set(ex.domains.map((d) => d.id)), refs: ex.refs };
    if (!ex.domains.length && list.length) errors.push('Questions need at least one exam domain to belong to.');
    const seen = new Set(), dup = new Set();
    list.forEach((q, i) => {
      const r = validateQuestion(q, i, ex.domains.length ? ctx : { refs: ex.refs });
      errors.push(...r.errs); warnings.push(...r.warns);
      if (isObj(q) && q.id != null) { const id = String(q.id); if (seen.has(id)) dup.add(id); seen.add(id); }
    });
    dup.forEach((id) => errors.push(`Duplicate question id "${id}".`));
    const clashes = opts.existingIds ? [...seen].filter((id) => opts.existingIds.has(id)) : [];
    return { errors: cap(errors), warnings: cap(warnings), duplicates: [...dup], clashes };
  }
  function cap(list, n = 25) { return list.length > n ? [...list.slice(0, n), `…and ${list.length - n} more.`] : list; }

  // -------------------------------------------------------------
  // Certification content (shareable)
  // -------------------------------------------------------------
  function normalisePlan(plan) {
    const p = isObj(plan) ? plan : {};
    const weeks = Array.isArray(p.weeks) ? p.weeks.slice(0, MAX_WEEKS).filter(isObj).map((w, i) => ({
      title: String(w.title || `Week ${i + 1}`).slice(0, 80),
      objectives: Array.isArray(w.objectives) ? w.objectives.map((o) => String(isObj(o) ? o.text || '' : o)).filter(Boolean).slice(0, 40) : [],
      sessions: Array.isArray(w.sessions) ? w.sessions.filter(isObj).slice(0, 60).map((s) => {
        const out = {
          day: clampInt(s.day, 0, 6, 0),
          topic: String(s.topic || 'Study session').slice(0, 140),
          kind: KINDS.includes(s.kind) ? s.kind : 'study',
          plannedMin: clampInt(s.plannedMin, 0, 1440, 60),
        };
        // Optional study guide for the session (added in content v1.1; older files simply omit it).
        if (Array.isArray(s.objs) && s.objs.length) out.objs = s.objs.filter(isStr).slice(0, 30);
        if (Array.isArray(s.links) && s.links.length) {
          out.links = s.links.filter((l) => isObj(l) && isUrl(l.url)).slice(0, 12)
            .map((l) => ({ title: String(l.title || l.url).slice(0, 160), url: String(l.url).trim(), type: isStr(l.type) ? l.type.slice(0, 20) : 'learn' }));
        }
        if (isStr(s.exercise) && s.exercise.trim()) out.exercise = s.exercise.slice(0, 2000);
        return out;
      }) : [],
    })) : [];
    const targets = Array.isArray(p.dailyTargets) && p.dailyTargets.length === 7 ? p.dailyTargets.map((v) => clampInt(v, 0, 720, 60)) : null;
    const studyDays = Array.isArray(p.studyDays) && p.studyDays.length === 7 ? p.studyDays.map(Boolean) : null;
    return { weeks, dailyTargets: targets, studyDays };
  }
  function normaliseResources(list) {
    return Array.isArray(list) ? list.filter((r) => isObj(r) && nonEmpty(r.title)).slice(0, 200).map((r, i) => ({
      id: isStr(r.id) && r.id ? r.id.slice(0, 40) : `r${i + 1}`,
      title: String(r.title).slice(0, 160),
      url: isUrl(r.url) ? r.url.trim() : '',
      type: RESOURCE_TYPES.includes(r.type) ? r.type : 'other',
      notes: isStr(r.notes) ? r.notes.slice(0, 1000) : '',
    })) : [];
  }

  function normaliseCertification(c) {
    return {
      id: c.id,
      code: String(c.code || '').trim().slice(0, 24),
      name: String(c.name || '').trim().slice(0, 140),
      provider: String(c.provider || 'Other').trim().slice(0, 60) || 'Other',
      description: isStr(c.description) ? c.description.slice(0, 2000) : '',
      website: isUrl(c.website) ? c.website.trim() : '',
      studyGuideUrl: isUrl(c.studyGuideUrl) ? c.studyGuideUrl.trim() : '',
      contentVersion: isStr(c.contentVersion) ? c.contentVersion.slice(0, 20) : '1.0.0',
      ...(normaliseSource(c.source) ? { source: normaliseSource(c.source) } : {}),
      exam: normaliseExam(c.exam),
      plan: normalisePlan(c.plan),
      resources: normaliseResources(c.resources),
    };
  }

  function validateCertification(c, errors, warnings) {
    if (!isObj(c)) { errors.push('"certification" must be an object.'); return; }
    if (!isValidCertId(c.id)) errors.push(`Certification id "${c.id == null ? '' : c.id}" is invalid. Use 1–48 lowercase letters, numbers and hyphens, e.g. "az-104".`);
    if (!nonEmpty(c.name)) errors.push('Certification "name" is missing.');
    if (!nonEmpty(c.code)) errors.push('Certification "code" is missing.');
    if (c.website != null && c.website !== '' && !isUrl(c.website)) warnings.push('"website" isn\'t a valid https link and will be ignored.');
    if (c.studyGuideUrl != null && c.studyGuideUrl !== '' && !isUrl(c.studyGuideUrl)) warnings.push('"studyGuideUrl" isn\'t a valid https link and will be ignored.');
    validateExam(c.exam, errors, warnings, 'certification.exam');
    if (c.plan != null && !isObj(c.plan)) errors.push('certification.plan must be an object.');
    if (isObj(c.plan) && c.plan.weeks != null && !Array.isArray(c.plan.weeks)) errors.push('certification.plan.weeks must be a list.');
    if (isObj(c.plan) && Array.isArray(c.plan.weeks) && c.plan.weeks.length > MAX_WEEKS) warnings.push(`Only the first ${MAX_WEEKS} weeks of the plan will be used.`);
    if (c.resources != null && !Array.isArray(c.resources)) errors.push('certification.resources must be a list.');
  }

  // -------------------------------------------------------------
  // Parsing an imported file
  // -------------------------------------------------------------
  function detectKind(obj) {
    if (!isObj(obj)) return null;
    const f = obj.format;
    const hit = Object.entries(FORMATS).find(([, v]) => v === f);
    if (hit) return hit[0];
    if (obj.app === 'm365-study-tracker' && isObj(obj.data)) return 'legacy';
    if (Array.isArray(obj.sessions) && isObj(obj.settings) && Array.isArray(obj.weeks)) return 'legacy';
    return null;
  }

  /**
   * Parse and validate the text of an imported file.
   * Returns { ok, kind, label, data, errors, warnings, summary }.
   */
  function parseImport(text) {
    const res = { ok: false, kind: null, label: '', data: null, errors: [], warnings: [], summary: {} };
    let obj;
    try { obj = JSON.parse(text); } catch (e) {
      res.errors.push(`The file isn't valid JSON (${String(e.message).replace(/^JSON\.parse: /, '').slice(0, 120)}).`);
      return res;
    }
    const kind = detectKind(obj);
    if (!kind) {
      res.errors.push(isObj(obj) && isStr(obj.format)
        ? `Unknown file format "${obj.format}".`
        : 'This isn\'t a PrepWise file. Expected a "format" such as "prepwise.certification".');
      return res;
    }
    res.kind = kind; res.label = FORMAT_LABEL[kind];
    if (kind === 'legacy') {
      const data = obj.data && isObj(obj.data) ? obj.data : obj;
      if (!Array.isArray(data.sessions) || !isObj(data.settings)) res.errors.push('The Study Tracker backup is incomplete (sessions or settings are missing).');
      res.data = data;
      res.summary = { sessions: Array.isArray(data.sessions) ? data.sessions.length : 0, attempts: isObj(data.quiz) && Array.isArray(data.quiz.attempts) ? data.quiz.attempts.length : 0 };
      res.ok = !res.errors.length;
      return res;
    }
    const v = obj.schemaVersion;
    if (v == null) { res.errors.push('The file has no "schemaVersion".'); return res; }
    if (kind === 'backup' ? v !== STORE_VERSION : !SUPPORTED_FILE_VERSIONS.includes(v)) {
      res.errors.push(`Schema version ${v} isn't supported by this version of PrepWise (supported: ${kind === 'backup' ? STORE_VERSION : SUPPORTED_FILE_VERSIONS.join(', ')}). ${typeof v === 'number' && v > FILE_VERSION ? 'Update the app and try again.' : ''}`.trim());
      return res;
    }
    const errors = res.errors, warnings = res.warnings;
    if (kind === 'certification') {
      validateCertification(obj.certification, errors, warnings);
      if (obj.questions != null) {
        const r = validateQuestions(obj.questions, isObj(obj.certification) ? obj.certification.exam : null);
        errors.push(...r.errors); warnings.push(...r.warnings);
      }
      if (!errors.length) {
        const cert = normaliseCertification(obj.certification);
        const questions = Array.isArray(obj.questions) ? obj.questions.map((q) => normaliseQuestion(q, cert.exam)) : [];
        res.data = { certification: cert, questions };
        res.summary = summariseCert(cert, questions);
      }
    } else if (kind === 'questionBank') {
      if (!isValidCertId(obj.certificationId)) errors.push(`"certificationId" ${obj.certificationId == null ? 'is missing' : `"${obj.certificationId}" is invalid`}.`);
      if (obj.exam != null) validateExam(obj.exam, errors, warnings);
      if (!Array.isArray(obj.questions)) errors.push('"questions" must be a list.');
      else if (!obj.questions.length) errors.push('The question bank is empty.');
      res.data = { certificationId: obj.certificationId, exam: obj.exam != null ? normaliseExam(obj.exam) : null, questions: Array.isArray(obj.questions) ? obj.questions : [] };
      res.summary = { questions: Array.isArray(obj.questions) ? obj.questions.length : 0, certificationId: obj.certificationId };
      // Question-level validation needs the target certification's domains: done in validateBankFor().
    } else if (kind === 'studyPlan') {
      if (!isValidCertId(obj.certificationId)) errors.push(`"certificationId" ${obj.certificationId == null ? 'is missing' : `"${obj.certificationId}" is invalid`}.`);
      if (!isObj(obj.plan) || !Array.isArray(obj.plan.weeks) || !obj.plan.weeks.length) errors.push('"plan.weeks" must be a list with at least one week.');
      if (!errors.length) {
        res.data = { certificationId: obj.certificationId, plan: normalisePlan(obj.plan), resources: normaliseResources(obj.resources) };
        res.summary = { weeks: res.data.plan.weeks.length, sessions: res.data.plan.weeks.reduce((a, w) => a + w.sessions.length, 0), certificationId: obj.certificationId };
      }
    } else if (kind === 'progress') {
      if (!isValidCertId(obj.certificationId)) errors.push(`"certificationId" ${obj.certificationId == null ? 'is missing' : `"${obj.certificationId}" is invalid`}.`);
      if (!isObj(obj.progress) || !Array.isArray(obj.progress.sessions) || !isObj(obj.progress.settings)) errors.push('"progress" is missing its sessions or settings.');
      if (!errors.length) {
        res.data = { certificationId: obj.certificationId, progress: obj.progress };
        const p = obj.progress;
        res.summary = { certificationId: obj.certificationId, sessions: p.sessions.length, attempts: isObj(p.quiz) && Array.isArray(p.quiz.attempts) ? p.quiz.attempts.length : 0 };
      }
    } else if (kind === 'backup') {
      const st = obj.store;
      if (!isObj(st) || !isObj(st.certs) || !isObj(st.progress)) errors.push('The backup is missing its certifications or progress.');
      else {
        Object.keys(st.certs).forEach((id) => { if (!isValidCertId(id)) errors.push(`Invalid certification id "${id}" in backup.`); });
        if (obj.banks != null && !isObj(obj.banks)) errors.push('"banks" must be an object.');
        if (isObj(obj.banks)) Object.entries(obj.banks).forEach(([id, list]) => {
          const c = st.certs[id];
          if (!c) { warnings.push(`Question bank for unknown certification "${id}" will be ignored.`); return; }
          const r = validateQuestions(list, c.exam);
          r.errors.forEach((e) => errors.push(`${id}: ${e}`));
        });
      }
      if (!errors.length) {
        res.data = { store: st, banks: isObj(obj.banks) ? obj.banks : {} };
        const name = isObj(obj.profile) && isStr(obj.profile.name) ? obj.profile.name : (isObj(st.settings) && isStr(st.settings.name) ? st.settings.name : '');
        const attempts = Object.values(st.progress).reduce((a, p) => a + (isObj(p) && isObj(p.quiz) && Array.isArray(p.quiz.attempts) ? p.quiz.attempts.length : 0), 0);
        res.summary = { certifications: Object.keys(st.certs).length, profileName: name.replace(/\s+/g, ' ').trim().slice(0, 40), attempts, exportedAt: isStr(obj.exportedAt) ? obj.exportedAt : null };
      }
    }
    res.errors = cap(errors); res.warnings = cap(warnings);
    res.ok = !res.errors.length;
    return res;
  }

  // Validate a parsed question bank against the certification it will go into.
  function validateBankFor(bankData, cert, existingIds) {
    const exam = bankData.exam && bankData.exam.domains.length ? bankData.exam : cert.exam;
    const r = validateQuestions(bankData.questions, exam, { existingIds });
    return { ...r, exam, questions: r.errors.length ? [] : bankData.questions.map((q) => normaliseQuestion(q, exam)) };
  }

  function summariseCert(cert, questions) {
    const byDomain = {};
    questions.forEach((q) => { byDomain[q.domain] = (byDomain[q.domain] || 0) + 1; });
    return {
      id: cert.id, code: cert.code, name: cert.name, provider: cert.provider,
      domains: cert.exam.domains.length, objectives: Object.keys(cert.exam.objectives).length,
      weeks: cert.plan.weeks.length, sessions: cert.plan.weeks.reduce((a, w) => a + w.sessions.length, 0),
      resources: cert.resources.length, questions: questions.length, byDomain,
    };
  }

  // -------------------------------------------------------------
  // Building export files
  // -------------------------------------------------------------
  const stamp = () => new Date().toISOString();
  function certificationFile(cert, questions, { includeQuestions = true } = {}) {
    const c = normaliseCertification(cert);
    const out = { format: FORMATS.certification, schemaVersion: FILE_VERSION, exportedAt: stamp(), generator: 'PrepWise', certification: c };
    if (includeQuestions) out.questions = questions.map(stripQuestion);
    return out;
  }
  function questionBankFile(cert, questions) {
    return { format: FORMATS.questionBank, schemaVersion: FILE_VERSION, exportedAt: stamp(), generator: 'PrepWise', certificationId: cert.id, exam: normaliseExam(cert.exam), questions: questions.map(stripQuestion) };
  }
  function studyPlanFile(cert, plan) {
    return { format: FORMATS.studyPlan, schemaVersion: FILE_VERSION, exportedAt: stamp(), generator: 'PrepWise', certificationId: cert.id, plan: normalisePlan(plan), resources: normaliseResources(cert.resources) };
  }
  function progressFile(certId, progress) {
    return { format: FORMATS.progress, schemaVersion: FILE_VERSION, exportedAt: stamp(), generator: 'PrepWise', certificationId: certId, progress };
  }
  // A backup is one local profile: its store, its own question banks and (since v2.2) its name.
  function backupFile(store, banks, profile = null) {
    const out = { format: FORMATS.backup, schemaVersion: STORE_VERSION, exportedAt: stamp(), generator: 'PrepWise', store, banks };
    if (profile && isStr(profile.name) && profile.name.trim()) out.profile = { name: profile.name.trim().slice(0, 40) };
    return out;
  }
  // Drop runtime-only fields so exports contain authored content only.
  function stripQuestion(q) {
    const out = {};
    ['id', 'cert', 'domain', 'obj', 'topic', 'diff', 'type', 'scenario', 'q', 'opts', 'ans', 'pairs', 'exp', 'why', 'hint', 'feat', 'ref', 'refUrl', 'refTitle', 'verified'].forEach((k) => {
      if (q[k] !== undefined && q[k] !== '') out[k] = q[k];
    });
    return out;
  }

  return {
    STORE_VERSION, FILE_VERSION, SUPPORTED_FILE_VERSIONS, FORMATS, FORMAT_LABEL, CERT_ID_RE, Q_TYPES, DIFFS, KINDS, RESOURCE_TYPES, MAX_WEEKS,
    slugify, isValidCertId, uniqueId, isUrl,
    normaliseExam, normaliseQuestion, normalisePlan, normaliseResources, normaliseCertification,
    validateQuestion, validateQuestions, validateCertification, validateBankFor, parseImport, summariseCert,
    certificationFile, questionBankFile, studyPlanFile, progressFile, backupFile, stripQuestion,
  };
});
