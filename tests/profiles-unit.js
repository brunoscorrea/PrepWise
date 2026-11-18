/* Unit tests for js/profiles.js (storage layer) and a scan of the shipped app
   for hard-coded personal information.   node tests/profiles-unit.js */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const P = require('../js/profiles.js');

class Mem { // minimal localStorage
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  snapshot() { return Object.fromEntries(this.m); }
}

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok - ${name}`); };
const v2 = (name) => JSON.stringify({ schema: 2, settings: { name }, certs: {}, progress: { 'ab-650': { quiz: { attempts: [1, 2, 3] } } } });

test('fresh browser: no profiles, nothing written', () => {
  const ls = new Mem();
  const r = P.init(ls);
  assert.strictEqual(r.reg.profiles.length, 0);
  assert.strictEqual(r.reg.active, null);
  assert.strictEqual(ls.length, 0);
});

test('upgrade from prepwise:v2 adopts the data in place (no copy, no delete)', () => {
  const before = { 'prepwise:v2': v2('Bruno'), 'prepwise:bank:x': '[1]', 'prepwise:snapshots': '[]', 'prepwise:backup:v1': '{}', 'm365-study-tracker:v1': '{}' };
  const ls = new Mem(before);
  const r = P.init(ls);
  assert.strictEqual(r.migrated, true);
  assert.strictEqual(r.reg.profiles.length, 1);
  const p = r.reg.profiles[0];
  assert.strictEqual(p.ns, 'legacy'); assert.strictEqual(p.name, 'Bruno'); assert.strictEqual(r.reg.active, p.id);
  Object.entries(before).forEach(([k, v]) => assert.strictEqual(ls.getItem(k), v, k));
  assert.strictEqual(P.keys(p).store, 'prepwise:v2');
  assert.strictEqual(r.reg.migration.from, 'prepwise:v2');
});

test('upgrade from the v1 tracker only: legacy profile named from v1', () => {
  const ls = new Mem({ 'm365-study-tracker:v1': JSON.stringify({ settings: { name: 'Pat' }, sessions: [] }) });
  const r = P.init(ls);
  assert.strictEqual(r.reg.profiles[0].ns, 'legacy');
  assert.strictEqual(r.reg.profiles[0].name, 'Pat');
  assert.strictEqual(r.reg.migration.from, 'm365-study-tracker:v1');
});

test('second init is stable (no second migration)', () => {
  const ls = new Mem({ 'prepwise:v2': v2('Bruno') });
  const a = P.init(ls).reg; const b = P.init(ls);
  assert.strictEqual(b.migrated, false);
  assert.deepStrictEqual(b.reg, a);
});

test('new profiles get their own namespace and unique ids', () => {
  const ls = new Mem({ 'prepwise:v2': v2('Bruno') });
  const { reg } = P.init(ls);
  const a = P.create(ls, reg, 'Alex'); const b = P.create(ls, reg, 'Sam');
  assert.notStrictEqual(a.id, b.id);
  assert.match(P.keys(a).store, new RegExp(`^prepwise:p:${a.id}:store$`));
  assert.ok(P.keys(a).bankPrefix.startsWith(`prepwise:p:${a.id}:`));
  assert.strictEqual(P.keys(a).v1, null, 'a new profile can never read the v1 data');
  assert.strictEqual(reg.active, b.id);
  assert.strictEqual(P.readRegistry(ls).profiles.length, 3);
});

test('names are cleaned and kept distinct', () => {
  const ls = new Mem(); const { reg } = P.init(ls);
  P.create(ls, reg, '  Alex   Smith ');
  assert.strictEqual(reg.profiles[0].name, 'Alex Smith');
  assert.strictEqual(P.create(ls, reg, 'alex smith').name, 'alex smith (2)');
  assert.strictEqual(P.cleanName('x'.repeat(80)).length, P.NAME_MAX);
  assert.strictEqual(P.initials('Alex Smith'), 'AS'); assert.strictEqual(P.initials(''), '?');
});

test('removing a new profile deletes only its own keys', () => {
  const ls = new Mem({ 'prepwise:v2': v2('Bruno'), 'prepwise:bank:c': '[]' });
  const { reg } = P.init(ls);
  const a = P.create(ls, reg, 'Alex'); const b = P.create(ls, reg, 'Sam');
  P.writeData(ls, a, { settings: { name: '' } }, { 'my-cert': [{ id: 'q' }] });
  P.writeData(ls, b, { settings: { name: '' } }, { 'my-cert': [{ id: 'q' }] });
  const before = ls.snapshot();
  P.remove(ls, reg, a.id);
  const after = ls.snapshot();
  Object.keys(before).filter((k) => !k.includes(a.id) && k !== P.REG_KEY).forEach((k) => assert.strictEqual(after[k], before[k], k));
  assert.ok(!Object.keys(after).some((k) => k.includes(a.id)));
});

test('removing the legacy profile never touches namespaced profiles', () => {
  const ls = new Mem({ 'prepwise:v2': v2('Bruno'), 'prepwise:bank:c': '[]', 'prepwise:snapshots': '[]', 'prepwise:corrupt:1': 'x' });
  const { reg } = P.init(ls);
  const legacy = reg.profiles[0];
  const a = P.create(ls, reg, 'Alex'); P.writeData(ls, a, { settings: {} }, { c: [] });
  const aKeys = Object.fromEntries(Object.entries(ls.snapshot()).filter(([k]) => k.includes(a.id)));
  P.remove(ls, reg, legacy.id);
  Object.entries(aKeys).forEach(([k, v]) => assert.strictEqual(ls.getItem(k), v));
  ['prepwise:v2', 'prepwise:bank:c', 'prepwise:snapshots', 'prepwise:corrupt:1'].forEach((k) => assert.strictEqual(ls.getItem(k), null, k));
  assert.strictEqual(reg.active, a.id);
});

test('a lost or corrupt registry is rebuilt from the profile stores', () => {
  const ls = new Mem({ 'prepwise:v2': v2('Bruno') });
  const { reg } = P.init(ls);
  const a = P.create(ls, reg, 'Alex'); P.writeData(ls, a, { settings: { name: 'Alex' } });
  ls.setItem(P.REG_KEY, '{not json');
  const r = P.init(ls);
  assert.deepStrictEqual(r.reg.profiles.map((p) => p.name).sort(), ['Alex', 'Bruno']);
  assert.ok(r.reg.profiles.find((p) => p.name === 'Alex').id === a.id, 'same id, so the same keys');
});

test('registry ignores malformed entries and duplicate legacy profiles', () => {
  const reg = P.normaliseRegistry({ active: 'nope', profiles: [{ id: 'pgoodid0001', name: 'A', ns: 'legacy' }, { id: 'pgoodid0002', name: 'B', ns: 'legacy' }, { id: 'bad id', name: 'C' }, { id: 'pgoodid0001', name: 'dup' }] });
  assert.deepStrictEqual(reg.profiles.map((p) => p.name), ['A']);
  assert.strictEqual(reg.active, 'pgoodid0001');
});

// ---------------------------------------------------------------- personal data scan
test('no hard-coded personal information in the shipped app', () => {
  const ROOT = path.resolve(__dirname, '..');
  const shipped = ['index.html', 'manifest.json', 'app.js', 'quiz-centre.js', 'service-worker.js', 'styles.css'];
  const walk = (d) => fs.readdirSync(path.join(ROOT, d)).flatMap((f) => { const rel = path.join(d, f); return fs.statSync(path.join(ROOT, rel)).isDirectory() ? walk(rel) : [rel]; });
  shipped.push(...walk('js'), ...walk('certifications'));
  const bad = /\bbruno\b|\bcorrea\b|b\.correa|gmail\.com|@hotmail|@outlook\.com|\+\d{2}\s\d{3}\s\d{3}\s\d{3}/i;
  const hits = [];
  shipped.forEach((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((line, i) => {
    // Gmail as an identity provider in an SC-300 question is product content, not personal data.
    if (bad.test(line) && !/Google|Gmail address|gmail\.com'|for gmail/i.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
  }));
  assert.deepStrictEqual(hits, []);
  // Built-in profiles carry no default user name.
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert.ok(/name: '', theme:/.test(app), 'default settings name is empty');
});

console.log(`\n${n} profile unit tests passed`);
