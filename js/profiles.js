/* =========================================================
   PrepWise — js/profiles.js
   Local user profiles. Every person who uses PrepWise in this browser
   gets a profile with its own namespace in localStorage. Nothing here
   talks to a server: profiles are a local convenience, not accounts.

   Registry (shared by every profile in this browser):
     prepwise:profiles               { schema, active, profiles: [{ id, name, ns, createdAt, lastUsedAt }] }

   Profile namespaces:
     ns "p" (every profile created since v2.2):
       prepwise:p:<id>:store         the profile's store (settings, certifications, progress)
       prepwise:p:<id>:bank:<cert>   question banks of user-created/imported certifications
       prepwise:p:<id>:snapshots     automatic snapshots
     ns "legacy" (the person who used PrepWise before profiles existed):
       prepwise:v2, prepwise:bank:<cert>, prepwise:snapshots, prepwise:backup:v1
       The existing keys are adopted in place, so the upgrade copies,
       rewrites and deletes nothing.

   Works in the browser (window.PrepWiseProfiles) and in Node (tests).
   ========================================================= */
'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PrepWiseProfiles = api;
})(typeof self !== 'undefined' ? self : this, () => {
  const REG_KEY = 'prepwise:profiles';
  const REG_SCHEMA = 1;
  const LEGACY = {
    store: 'prepwise:v2',
    bankPrefix: 'prepwise:bank:',
    snaps: 'prepwise:snapshots',
    v1Backup: 'prepwise:backup:v1',
    v1: 'm365-study-tracker:v1',
    corruptPrefix: 'prepwise:corrupt:',
  };
  const NAME_MAX = 40;
  const ID_RE = /^p[a-z0-9]{8,24}$/;

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const now = () => new Date().toISOString();
  const cleanName = (n) => String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

  function newId() {
    let s = '';
    try {
      const a = new Uint8Array(10);
      (globalThis.crypto || require('crypto').webcrypto).getRandomValues(a);
      s = Array.from(a, (b) => (b % 36).toString(36)).join('');
    } catch (e) {
      s = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 10);
    }
    return `p${s}`;
  }

  // Storage keys of one profile. Every user-specific key lives under these.
  function keys(profile) {
    if (profile.ns === 'legacy') return { ...LEGACY, ownsPrefix: null };
    const base = `prepwise:p:${profile.id}:`;
    return {
      store: `${base}store`, bankPrefix: `${base}bank:`, snaps: `${base}snapshots`,
      v1Backup: null, v1: null, corruptPrefix: `${base}corrupt:`, ownsPrefix: base,
    };
  }

  // Every localStorage key that belongs to a profile (used for delete and tests).
  function keysOf(ls, profile) {
    const k = keys(profile);
    const out = [];
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key == null) continue;
      if (k.ownsPrefix ? key.startsWith(k.ownsPrefix)
        : key === k.store || key === k.snaps || key === k.v1Backup || key === k.v1 || key.startsWith(k.bankPrefix) || key.startsWith(k.corruptPrefix)) out.push(key);
    }
    return out;
  }

  const get = (ls, k) => { try { return ls.getItem(k); } catch (e) { return null; } };
  const parse = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
  const nameInStore = (raw) => { const s = parse(raw); return s && isObj(s.settings) ? cleanName(s.settings.name) : ''; };

  function normaliseRegistry(raw) {
    if (!isObj(raw) || !Array.isArray(raw.profiles)) return null;
    const seen = new Set();
    let legacySeen = false;
    const profiles = raw.profiles.filter((p) => {
      if (!isObj(p) || !ID_RE.test(String(p.id)) || seen.has(p.id)) return false;
      if (p.ns === 'legacy') { if (legacySeen) return false; legacySeen = true; }
      seen.add(p.id);
      return true;
    }).map((p) => ({
      id: p.id, name: cleanName(p.name), ns: p.ns === 'legacy' ? 'legacy' : 'p',
      createdAt: p.createdAt || now(), lastUsedAt: p.lastUsedAt || p.createdAt || now(),
    }));
    return {
      schema: REG_SCHEMA,
      active: profiles.some((p) => p.id === raw.active) ? raw.active : (profiles[0] ? profiles[0].id : null),
      profiles,
      migration: isObj(raw.migration) ? raw.migration : null,
    };
  }

  function readRegistry(ls) { return normaliseRegistry(parse(get(ls, REG_KEY))); }
  function writeRegistry(ls, reg) { ls.setItem(REG_KEY, JSON.stringify(reg)); return reg; }

  /**
   * Find or build the registry. Called once at start-up.
   * - Registry present: used as is.
   * - No registry, but data from before profiles (prepwise:v2 or the v1 tracker):
   *   that data becomes the first profile ("legacy" namespace, adopted in place).
   * - No registry and no data: no profiles; the app shows onboarding.
   * A missing or unreadable registry is rebuilt from the profile stores found,
   * so profiles are never orphaned.
   * Returns { reg, migrated, rebuilt }.
   */
  function init(ls) {
    const existing = readRegistry(ls);
    if (existing) return { reg: existing, migrated: false, rebuilt: false };
    const hadRaw = get(ls, REG_KEY) != null;
    const reg = { schema: REG_SCHEMA, active: null, profiles: [], migration: null };
    let migrated = false;
    const v2 = get(ls, LEGACY.store);
    const v1 = get(ls, LEGACY.v1);
    if (v2 != null || v1 != null) {
      const p = { id: newId(), name: v2 != null ? nameInStore(v2) : nameInStore(v1), ns: 'legacy', createdAt: now(), lastUsedAt: now() };
      reg.profiles.push(p);
      reg.migration = { at: now(), profileId: p.id, from: v2 != null ? LEGACY.store : LEGACY.v1, copied: false };
      migrated = true;
    }
    // Rebuild entries for namespaced stores that have no registry entry.
    const found = [];
    for (let i = 0; i < ls.length; i++) {
      const m = /^prepwise:p:(p[a-z0-9]{8,24}):store$/.exec(ls.key(i) || '');
      if (m) found.push(m[1]);
    }
    found.forEach((id) => reg.profiles.push({ id, name: nameInStore(get(ls, `prepwise:p:${id}:store`)), ns: 'p', createdAt: now(), lastUsedAt: now() }));
    reg.active = reg.profiles[0] ? reg.profiles[0].id : null;
    if (reg.profiles.length || hadRaw) writeRegistry(ls, reg);
    return { reg, migrated, rebuilt: hadRaw || found.length > 0 };
  }

  const find = (reg, id) => reg.profiles.find((p) => p.id === id) || null;
  const active = (reg) => find(reg, reg.active);

  // A display name that no other profile on this device uses.
  function uniqueName(reg, name, exceptId = null) {
    const base = cleanName(name) || 'New profile';
    const taken = new Set(reg.profiles.filter((p) => p.id !== exceptId).map((p) => p.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; i < 100; i++) {
      const n = `${base.slice(0, NAME_MAX - 5)} (${i})`;
      if (!taken.has(n.toLowerCase())) return n;
    }
    return `${base.slice(0, NAME_MAX - 9)} ${Date.now().toString(36).slice(-6)}`;
  }

  function create(ls, reg, name, { activate = true } = {}) {
    let id = newId();
    while (find(reg, id)) id = newId();
    const p = { id, name: uniqueName(reg, name), ns: 'p', createdAt: now(), lastUsedAt: now() };
    reg.profiles.push(p);
    if (activate) reg.active = id;
    writeRegistry(ls, reg);
    return p;
  }

  function rename(ls, reg, id, name) {
    const p = find(reg, id);
    if (!p) return null;
    p.name = cleanName(name);
    writeRegistry(ls, reg);
    return p;
  }

  function setActive(ls, reg, id) {
    const p = find(reg, id);
    if (!p) return null;
    reg.active = id;
    p.lastUsedAt = now();
    writeRegistry(ls, reg);
    return p;
  }

  // Delete a profile and every key it owns. Other profiles are never touched.
  function remove(ls, reg, id) {
    const p = find(reg, id);
    if (!p) return false;
    keysOf(ls, p).forEach((k) => { try { ls.removeItem(k); } catch (e) { /* ignore */ } });
    reg.profiles = reg.profiles.filter((x) => x.id !== id);
    if (reg.active === id) reg.active = reg.profiles[0] ? reg.profiles[0].id : null;
    if (reg.migration && reg.migration.profileId === id) reg.migration.deleted = now();
    writeRegistry(ls, reg);
    return true;
  }

  // Write a backup's store and question banks into a profile's own keys.
  function writeData(ls, profile, storeObj, banks = {}) {
    const k = keys(profile);
    ls.setItem(k.store, JSON.stringify(storeObj));
    Object.entries(banks || {}).forEach(([cid, list]) => ls.setItem(k.bankPrefix + cid, JSON.stringify(list)));
  }

  const initials = (name) => {
    const parts = cleanName(name).split(' ').filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };

  return {
    REG_KEY, REG_SCHEMA, LEGACY, NAME_MAX,
    newId, keys, keysOf, init, readRegistry, writeRegistry, normaliseRegistry,
    find, active, create, rename, setActive, remove, writeData, uniqueName, cleanName, initials,
  };
});
