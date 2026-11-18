/* Builds the GitHub Pages site for PrepWise.

     node scripts/build-pages.js            → validates, then writes _site/
     node scripts/build-pages.js --check    → validates only
     node scripts/build-pages.js --out DIR  → writes to DIR

   What it does:
   1. Validates the app shell: every file the service worker precaches exists,
      and every script, stylesheet, manifest, icon and certification file the app
      uses is precached (so nothing is missing offline).
   2. Checks that APP_VERSION (app.js) and CACHE_VERSION (service-worker.js) match.
   3. Copies ONLY the app files into the output: no tests, docs or fixtures.
   4. Stamps CACHE_VERSION as "v<APP_VERSION>-<hash of the app files>", so every
      deployment that changes an app file gets a new cache automatically, and a
      deployment that changes nothing in the app doesn't prompt users to update. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function appShell(sw) {
  const m = /const APP_SHELL = (\[[\s\S]*?\]);/.exec(sw);
  if (!m) throw new Error('APP_SHELL not found in service-worker.js');
  return Function(`return ${m[1]}`)().map((p) => p.replace(/^\.\//, ''));
}

function validate() {
  const errors = [];
  const sw = read('service-worker.js');
  const app = read('app.js');
  const html = read('index.html');
  const manifest = JSON.parse(read('manifest.json'));
  const shell = appShell(sw);
  const files = shell.map((p) => (p === '' ? 'index.html' : p));
  const inShell = new Set(files);

  files.forEach((f) => { if (!fs.existsSync(path.join(ROOT, f))) errors.push(`Precached file is missing: ${f}`); });
  // Everything index.html loads must be precached.
  const refs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g), ...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:)?\/\//.test(u));
  refs.forEach((r) => { if (!inShell.has(r.replace(/^\.\//, ''))) errors.push(`index.html loads ${r}, but the service worker doesn't precache it`); });
  // Every certification file and manifest icon must be precached.
  fs.readdirSync(path.join(ROOT, 'certifications'), { withFileTypes: true }).filter((d) => d.isDirectory()).forEach((d) => {
    fs.readdirSync(path.join(ROOT, 'certifications', d.name)).filter((f) => f.endsWith('.js')).forEach((f) => {
      const rel = `certifications/${d.name}/${f}`;
      if (!inShell.has(rel)) errors.push(`${rel} isn't precached (offline quizzes would break)`);
      if (!refs.includes(rel)) errors.push(`${rel} isn't loaded by index.html`);
    });
  });
  [...manifest.icons, ...(manifest.shortcuts || []).flatMap((s) => s.icons || [])].forEach((i) => { if (!inShell.has(i.src)) errors.push(`Manifest icon ${i.src} isn't precached`); });
  // Paths must be relative so the app works under /PrepWise/.
  ['start_url', 'scope', 'id'].forEach((k) => { if (/^\//.test(manifest[k] || '')) errors.push(`manifest.${k} must be relative, not "${manifest[k]}"`); });
  refs.forEach((r) => { if (r.startsWith('/')) errors.push(`index.html uses an absolute path: ${r}`); });
  if (!/register\('\.\/service-worker\.js'\)/.test(app)) errors.push("app.js must register './service-worker.js' (relative)");

  const appVersion = (/const APP_VERSION = '([^']+)'/.exec(app) || [])[1];
  const cacheVersion = (/const CACHE_VERSION = '([^']+)'/.exec(sw) || [])[1];
  if (!appVersion) errors.push('APP_VERSION not found in app.js');
  if (cacheVersion !== `v${appVersion}`) errors.push(`CACHE_VERSION (${cacheVersion}) must be "v${appVersion}" to match APP_VERSION in app.js`);
  return { errors, files, appVersion };
}

function contentHash(files) {
  const h = crypto.createHash('sha256');
  [...files, 'service-worker.js'].sort().forEach((f) => { h.update(f); h.update('\0'); h.update(fs.readFileSync(path.join(ROOT, f))); });
  return h.digest('hex').slice(0, 10);
}

function build(outDir) {
  const { errors, files, appVersion } = validate();
  if (errors.length) { const e = new Error(`Build checks failed:\n - ${errors.join('\n - ')}`); e.errors = errors; throw e; }
  const version = `v${appVersion}-${contentHash(files)}`;
  if (outDir) {
    fs.rmSync(outDir, { recursive: true, force: true });
    files.forEach((f) => { const to = path.join(outDir, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), to); });
    const sw = read('service-worker.js').replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`);
    fs.writeFileSync(path.join(outDir, 'service-worker.js'), sw);
    fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  }
  return { version, files: files.length + 1, outDir };
}

module.exports = { build, validate, contentHash };

if (require.main === module) {
  const args = process.argv.slice(2);
  const out = args.includes('--check') ? null : path.resolve(ROOT, args[args.indexOf('--out') + 1] && args.includes('--out') ? args[args.indexOf('--out') + 1] : '_site');
  try {
    const r = build(out);
    console.log(`${out ? `Built ${r.files} files into ${path.relative(ROOT, out) || out}` : 'Checks passed'} · CACHE_VERSION ${r.version}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `cache_version=${r.version}\n`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
