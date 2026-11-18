/* Minimal headless Chrome/Edge harness over the DevTools protocol (no npm packages; Node 22+).
   Used by profiles.js and run-multicert.js. */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- static server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.md': 'text/plain' };
function serve() {
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port, stop: () => new Promise((d) => { sockets.forEach((s) => s.destroy()); server.close(d); }) })));
}

// ---------------------------------------------------------------- browser + CDP
function findBrowser() {
  const c = [process.env.BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  return c.find((p) => p && fs.existsSync(p));
}

async function launch() {
  const exe = findBrowser();
  if (!exe) throw new Error('No Chrome/Edge found. Set BROWSER=/path/to/browser.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepwise-profiles-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-sync', '--disable-features=Translate,msEdgeSidebarV2', 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !fs.existsSync(portFile); i++) await sleep(50);
  await sleep(100);
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
  const cdp = new CDP(`ws://127.0.0.1:${port}${wsPath}`);
  await cdp.open();
  return { cdp, close: async () => { try { await cdp.send('Browser.close'); } catch (e) { /* ignore */ } proc.kill(); await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* locked */ } } };
}

class CDP {
  constructor(url) { this.url = url; this.n = 0; this.pending = new Map(); this.listeners = new Set(); }
  open() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const p = this.pending.get(d.id); this.pending.delete(d.id); d.error ? p.rej(new Error(`${p.method}: ${d.error.message}`)) : p.res(d.result); }
      else this.listeners.forEach((fn) => fn(d));
    };
    return new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.n;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej, method }));
  }
  wait(method, sessionId, ms = 15000) {
    return new Promise((res, rej) => {
      const fn = (d) => { if (d.method === method && (!sessionId || d.sessionId === sessionId)) { clearTimeout(to); this.listeners.delete(fn); res(d.params); } };
      const to = setTimeout(() => { this.listeners.delete(fn); rej(new Error(`timeout waiting for ${method}`)); }, ms);
      this.listeners.add(fn);
    });
  }
}

// Page helpers. INIT runs before the app in every document: fixed afternoon clock
// for the greeting, and capture of exported files.
const INIT = `Date.prototype.getHours = function () { return 14; };
  window.__toasts = []; addEventListener('DOMContentLoaded', () => { const r = document.getElementById('toast-root'); if (r) new MutationObserver(() => { const tx = r.innerText.trim(); if (tx) __toasts.push(tx.slice(0, 120)); }).observe(r, { childList: true, subtree: true }); });
  window.__errs = []; addEventListener('error', (e) => __errs.push(String(e.message))); addEventListener('unhandledrejection', (e) => __errs.push(String(e.reason && e.reason.stack || e.reason)));
  (() => { const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { window.__lastBlob = b; return o(b); }; })();`;

async function newPage(cdp, { width = 1280, height = 900, mobile = false } = {}) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  if (process.env.DEBUG) cdp.listeners.add((d) => { if (d.sessionId === sessionId && /^Page.(frameNavigated|loadEventFired|frameStartedLoading|navigatedWithinDocument|fileChooserOpened|javascriptDialogOpening)$/.test(d.method)) console.log('  [ev]', width, d.method, d.params.url || (d.params.frame && d.params.frame.url) || ''); });
  cdp.listeners.add((d) => { if (d.sessionId === sessionId && d.method === 'Runtime.consoleAPICalled' && /error|warn/.test(d.params.type) && process.env.DEBUG) console.log('  [console]', d.params.args.map((a) => a.value || a.description).join(' ').slice(0, 400)); });
  await s('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
  await s('Page.setInterceptFileChooserDialog', { enabled: true });
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const page = {
    cdp, sessionId, send: s,
    async eval(body) {
      const r = await s('Runtime.evaluate', { expression: `(async () => { ${body} })()`, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(body, ms = 15000) {
      const end = Date.now() + ms; let last;
      while (Date.now() < end) { try { const v = await page.eval(body); if (v) return v; } catch (e) { last = e; } await sleep(80); }
      throw new Error(`waitFor timed out: ${body.slice(0, 120)} ${last ? last.message : ''}`);
    },
    async goto(url) { const load = cdp.wait('Page.loadEventFired', sessionId); await s('Page.navigate', { url }); await load; },
    // Wait for the app (or the welcome screen) to be ready after a load.
    ready() { return page.waitFor("return !!document.getElementById('onboard-root') || document.documentElement.dataset.ready === '1'"); },
    async reloadByApp(trigger) {
      await page.eval('window.__oldDoc = true; return true');
      const load = cdp.wait('Page.loadEventFired', sessionId, 20000);
      await page.eval(trigger);
      // Don't poll the old document while the app reloads: wait for the browser's load event.
      try { await load; await page.waitFor('return !window.__oldDoc && document.readyState === "complete"', 10000); } catch (e) {
        console.log('  reload wait failed:', e.message);
        throw new Error(`no reload after trigger; page errors: ${JSON.stringify(await page.eval('return window.__errs').catch(() => null))} state: ${JSON.stringify(await page.eval("return { profiles: PrepWise.profiles.map((p) => p.name), dlg: document.getElementById('dialog-root').hidden, href: location.href, toasts: window.__toasts, active: PrepWise.profile.name }").catch((x) => x.message))}`);
      }
      await page.ready();
    },
    async reload() { const load = cdp.wait('Page.loadEventFired', sessionId); await s('Page.reload', { ignoreCache: false }); await load; await page.ready(); },
    async type(selector, text) { await page.eval(`document.querySelector(${JSON.stringify(selector)}).focus()`); await s('Input.insertText', { text }); },
    close: () => cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {}),
  };
  return page;
}

module.exports = { serve, launch, newPage, sleep, ROOT };
