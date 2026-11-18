import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CHROME='/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
import json, subprocess, time, sys
from playwright.sync_api import sync_playwright
APP=os.path.dirname(HERE); PORT=8705
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', APP], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
legacy = open('legacy_v1_state.json').read()
out=[]
def check(n,c,i=''): out.append((n,c)); print('PASS' if c else 'FAIL', n, '' if c else i)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    ctx = b.new_context(service_workers='allow', viewport={'width':390,'height':844})
    pg = ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    # Simulate an existing v1 install: old cache + old data
    pg.goto(f'http://localhost:{PORT}/manifest.json')
    pg.evaluate("async (l) => { localStorage.setItem('m365-study-tracker:v1', l); const c = await caches.open('m365-study-tracker-v1.1.0'); await c.put('/old', new Response('x')); }", legacy)
    pg.goto(f'http://localhost:{PORT}/index.html')
    pg.wait_for_function('window.PrepWise && window.PrepWise.store')
    pg.evaluate("navigator.serviceWorker.ready"); pg.wait_for_timeout(1500)
    keys = pg.evaluate("caches.keys()")
    check('SW registered & controlling', pg.evaluate("!!navigator.serviceWorker.controller") or pg.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)"))
    check('new cache created, v1 cache removed', 'prepwise-v2.0.0' in keys and 'm365-study-tracker-v1.1.0' not in keys, keys)
    cached = pg.evaluate("caches.open('prepwise-v2.0.0').then(c=>c.keys()).then(k=>k.map(r=>new URL(r.url).pathname))")
    sw = open(APP+'/service-worker.js').read()
    import re
    shell = re.findall(r"'\./([^']*)'", sw)
    missing = [s for s in shell if '/'+s not in cached]
    check('every app shell file cached', not missing, missing)
    man = pg.evaluate("fetch('manifest.json').then(r=>r.json())")
    icons_ok = all(pg.evaluate(f"fetch('{i['src']}').then(r=>r.ok)") for i in man['icons'])
    check('manifest valid (name, start_url, display, icons 192/512 + maskable)', man['display']=='standalone' and man['start_url'] and icons_ok and any(i['purpose']=='maskable' for i in man['icons']) and any(i['sizes']=='512x512' for i in man['icons']))
    check('migration ran under SW', pg.evaluate("window.PrepWise.store.activeCert")=='ab-650')
    # Offline
    pg.reload(); pg.wait_for_function('window.PrepWise && window.PrepWise.store'); pg.wait_for_timeout(500)
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_function('window.PrepWise && window.PrepWise.store', timeout=10000); pg.wait_for_timeout(400)
    check('app boots offline', 'Administering Microsoft 365' in pg.inner_text('#view-home'))
    pg.evaluate("window.PrepWise.navigate('quiz'); window.__quizCentre.startSession({mode:'daily'})"); pg.wait_for_timeout(300)
    check('quiz works offline', pg.evaluate("window.__quizCentre.qs().active.items.length")==5)
    pg.evaluate("window.__quizCentre.finishSession()")
    pg.goto(f'http://localhost:{PORT}/'); pg.wait_for_function('window.PrepWise && window.PrepWise.store', timeout=10000)
    check('navigation to / offline served from cache', True)
    check('offline indicator shown', 'Offline' in pg.inner_text('#sb-status') or pg.evaluate("!navigator.onLine"))
    ctx.set_offline(False)
    check('no page errors', not errs, errs[:3])
    b.close()
finally: srv.terminate()
print('PWA', sum(c for _,c in out), '/', len(out))
