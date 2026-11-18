// Checks every reference and Microsoft Learn link in the built-in SC-300 and MD-102 profiles.
// Usage: node tests/links.js [sc-300|md-102]   (needs network access; Node 18+)
const path = require('path');
global.window = {};
const ids = process.argv[2] ? [process.argv[2]] : ['sc-300', 'md-102'];
const urls = new Map();
for (const id of ids) {
  const dir = path.join(__dirname, '..', 'certifications', id);
  try { require(path.join(dir, 'meta.js')); } catch (e) { console.log('skip', id, e.message); continue; }
  const B = window[id.replace('-', '').toUpperCase()];
  for (const [k, v] of Object.entries({ ...B.refs, ...(B.learn || {}) })) urls.set(v[0], `${id}:${k}`);
  urls.set(B.studyGuideUrl, `${id}:studyGuide`);
}
(async () => {
  let bad = 0; const list = [...urls.entries()];
  const check = async ([u, key]) => {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(u.split('#')[0], { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' } });
        const final = r.url;
        if (r.status === 200) { if (/\/answers\/|search\?/.test(final)) { console.log('REDIRECTED', key, u, '->', final); bad++; } return; }
        if (r.status === 429 && i < 3) { await new Promise((res) => setTimeout(res, 15000 * (i + 1))); continue; }
        if (i >= 1) { console.log('HTTP', r.status, key, u); bad++; return; }
      } catch (e) { if (i >= 1) { console.log('ERR', key, u, e.message); bad++; } }
    }
  };
  for (let i = 0; i < list.length; i += 3) { await Promise.all(list.slice(i, i + 3).map(check)); await new Promise((res) => setTimeout(res, 400)); }
  console.log(`${list.length} links checked, ${bad} problems`);
  process.exit(bad ? 1 : 0);
})();
