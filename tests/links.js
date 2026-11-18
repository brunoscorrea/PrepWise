// Checks every link in the built-in certification profiles: references, Microsoft Learn courses,
// learning paths and modules, study guides, plan resources and session guides.
// Usage: node tests/links.js [ab-650|ai-103|sc-300|md-102]   (needs network access; Node 18+)
const fs = require('fs');
const path = require('path');
const ids = process.argv[2] ? [process.argv[2]] : ['ab-650', 'ai-103', 'sc-300', 'md-102'];
const urls = new Map();
for (const id of ids) {
  const dir = path.join(__dirname, '..', 'certifications', id);
  if (!fs.existsSync(dir)) { console.log('skip', id, '(no such certification)'); continue; }
  // Every https URL in any file of the profile, so nothing a learner can click is missed.
  // References and Learn links as the app builds them (some are a base constant plus a path).
  global.window = global.window || {};
  try {
    require(path.join(dir, 'meta.js'));
    const B = window[id.replace('-', '').toUpperCase()];
    for (const [k, v] of Object.entries({ ...B.refs, ...(B.learn || {}) })) { const u = Array.isArray(v) ? v[0] : v && v.url; if (u && !urls.has(u)) urls.set(u, `${id}:${k}`); }
    if (B.studyGuideUrl) urls.set(B.studyGuideUrl, `${id}:studyGuide`);
  } catch (e) { console.log('meta not loaded for', id, e.message); }
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/https:\/\/[^\s'"`<>)\]]+/g)) {
      const u = m[0].replace(/[.,;]+$/, '');
      if (/\$\{|<res>|<p>|example\.com/.test(u)) continue; // templates and placeholders
      // Question text quotes token scopes and API endpoints (not links); only its Learn links are clickable.
      if (f.startsWith('questions') && !u.startsWith('https://learn.microsoft.com/')) continue;
      // A base URL kept in a constant (const AN = 'https://…/') is only a prefix for the real links.
      if (new RegExp(`const \\w+ = '${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(src)) continue;
      if (!urls.has(u)) urls.set(u, `${id}/${f}`);
    }
  }
}
(async () => {
  let bad = 0; const list = [...urls.entries()];
  const check = async ([u, key]) => {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(u.split('#')[0], { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' } });
        const final = r.url;
        if (r.status === 200) { if (/\/answers\/|search\?|\/training\/browse/.test(final) && !/\/answers\/|search\?|\/training\/browse/.test(u)) { console.log('REDIRECTED', key, u, '->', final); bad++; } return; }
        if (r.status === 429 && i < 3) { await new Promise((res) => setTimeout(res, 15000 * (i + 1))); continue; }
        if (i >= 1) { console.log('HTTP', r.status, key, u); bad++; return; }
      } catch (e) { if (i >= 1) { console.log('ERR', key, u, e.message); bad++; } }
    }
  };
  for (let i = 0; i < list.length; i += 3) { await Promise.all(list.slice(i, i + 3).map(check)); await new Promise((res) => setTimeout(res, 400)); }
  console.log(`${list.length} links checked, ${bad} problems`);
  process.exit(bad ? 1 : 0);
})();
