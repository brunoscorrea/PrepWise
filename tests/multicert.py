# Runs tests/browser-multicert.js (SC-300 / MD-102 profiles) in Chromium with Playwright.
# Usage: python tests/multicert.py   (pip install playwright && playwright install chromium)
import os, sys, json, time, subprocess
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(HERE); PORT = 8706
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', APP], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
SRC = open(os.path.join(HERE, 'browser-multicert.js'), encoding='utf-8').read()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(service_workers='block', viewport={'width': 1366, 'height': 900})
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.evaluate("sessionStorage.removeItem('__mc')")
        # A ready-made local profile skips the first-run welcome screen.
        pg.evaluate("localStorage.setItem('prepwise:profiles', JSON.stringify({schema:1, active:'ptestprofile1', profiles:[{id:'ptestprofile1', name:'Tester', ns:'p'}]}))"); pg.reload()
        for _ in range(8):
            pg.wait_for_function('window.PrepWise && window.PrepWise.store'); pg.wait_for_timeout(500)
            r = pg.evaluate("async (s) => { eval(s); return await __mc.run(); }", SRC)
            if r['next'] == 'done': break
            pg.reload()
        rep = pg.evaluate("async (s) => { eval(s); return __mc.report(); }", SRC)
        for f in rep['failed']: print('FAIL', f['name'], f['info'])
        print(f"multicert {rep['pass']}/{rep['total']}", '' if not errs else f'page errors: {errs[:3]}')
        b.close()
        sys.exit(0 if rep['pass'] == rep['total'] and not errs else 1)
finally:
    srv.terminate()
