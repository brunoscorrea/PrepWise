import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CHROME='/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
import json, subprocess, time, sys
from playwright.sync_api import sync_playwright
APP=os.path.dirname(HERE); PORT=8704
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', APP], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
storage = json.load(open('dl/all_storage.json'))
VPS = {'android-small':(320,640), 'mobile':(390,844), 'tablet':(820,1180), 'desktop':(1440,900)}
fails=[]; n=0
OVERLAP_JS = """() => [...document.querySelectorAll('.num-field')].filter(f=>f.offsetParent).map(f=>{
  const i=f.querySelector('input'), u=f.querySelector('.num-unit'); const ir=i.getBoundingClientRect();
  // measure rendered text width of the value
  const c=document.createElement('canvas').getContext('2d'); const cs=getComputedStyle(i); c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
  const tw=c.measureText(i.value||i.placeholder||'').width; const pr=parseFloat(cs.paddingRight), pl=parseFloat(cs.paddingLeft);
  const textRight = ir.right - pr, textLeft = textRight - tw;
  const ur = u ? u.getBoundingClientRect() : null;
  return {bind:i.dataset.bind||i.name||i.getAttribute('aria-label'), inputW:ir.width, fits: textLeft >= ir.left + pl - 0.5, unitClear: ur ? ur.left >= ir.right - 0.5 : true, w:f.getBoundingClientRect().width};
})"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for name,(w,h) in VPS.items():
        ctx = b.new_context(service_workers='block', viewport={'width':w,'height':h}, is_mobile=False, has_touch=w<1024, device_scale_factor=2 if w<800 else 1)
        ctx.add_init_script("if(!sessionStorage.getItem('s')){localStorage.clear();const d=%s;for(const k in d)localStorage.setItem(k,d[k]);sessionStorage.setItem('s','1')}" % json.dumps(storage))
        pg = ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_function('window.PrepWise && window.PrepWise.store'); pg.wait_for_timeout(400)
        for cid in ['ab-650','comptia-sec']:
            pg.evaluate(f"window.PrepWise.switchCert('{cid}',{{toast:false}})")
            for v in ['home','certs','plan','resources','revision','quiz','analytics','settings']:
                pg.evaluate(f"window.PrepWise.navigate('{v}')"); pg.wait_for_timeout(120)
                n+=1
                ov = pg.evaluate("document.documentElement.scrollWidth - innerWidth")
                if ov>0: fails.append(f'{name} {cid} {v} horizontal overflow {ov}px')
                if cid=='ab-650': pg.screenshot(path=f'shots/{name}-{v}.png', full_page=(v in ('home','settings')))
                for r in pg.evaluate(OVERLAP_JS):
                    if not (r['fits'] and r['unitClear']) or r['inputW']<40: fails.append(f"{name} {v} numfield {r}")
                # elements overflowing their own container horizontally
                bad = pg.evaluate("""() => [...document.querySelectorAll('.view:not([hidden]) *')].filter(e=>{const r=e.getBoundingClientRect(); if(!(r.width>0 && r.right>innerWidth+1)) return false; for(let a=e.parentElement;a;a=a.parentElement){const cs=getComputedStyle(a); if(/hidden|clip|auto|scroll/.test(cs.overflowX) && a.getBoundingClientRect().right<=innerWidth+1) return false;} return true}).slice(0,3).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right))""")
                if bad: fails.append(f'{name} {cid} {v} offscreen {bad}')
        # sheets & dialogs fit viewport
        pg.evaluate("window.PrepWise.switchCert('ab-650',{toast:false}); window.PrepWise.navigate('plan')"); pg.wait_for_timeout(200)
        pg.locator('.session-item').first.click(); pg.wait_for_timeout(450)
        r = pg.evaluate("(()=>{const s=document.querySelector('.sheet').getBoundingClientRect(); return [s.left,s.right,s.top,s.bottom,innerWidth,innerHeight]})()")
        if r[0]<0 or r[1]>r[4]+0.5 or r[2]<0 or r[3]>r[5]+0.5: fails.append(f'{name} sheet out of viewport {r}')
        for res in pg.evaluate(OVERLAP_JS):
            if not (res['fits'] and res['unitClear']): fails.append(f'{name} sheet numfield {res}')
        pg.screenshot(path=f'shots/{name}-session-sheet.png')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        # quiz player
        pg.evaluate("window.PrepWise.navigate('quiz'); window.__quizCentre.startSession({mode:'quick',exam:false})"); pg.wait_for_timeout(400)
        ov = pg.evaluate("document.querySelector('#quiz-player').scrollWidth - innerWidth")
        if ov>0: fails.append(f'{name} quiz player overflow')
        tt = pg.evaluate("[...document.querySelectorAll('#quiz-player button')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return [b.className, Math.round(r.width), Math.round(r.height)]}).filter(x=>x[1]<40||x[2]<40)")
        if tt: fails.append(f'{name} small touch targets in player {tt[:4]}')
        pg.screenshot(path=f'shots/{name}-player.png')
        pg.evaluate("window.__quizCentre.finishSession()"); pg.wait_for_timeout(300)
        pg.screenshot(path=f'shots/{name}-results.png')
        # dialog fit
        pg.evaluate("void window.PrepWise.confirmDialog({title:'Test dialog with a fairly long title to wrap', body:'Body text '.repeat(30), ok:'OK', requireText:'AB-650'})"); pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>{const s=document.querySelector('.dialog').getBoundingClientRect(); return [s.left,s.right,s.top,s.bottom,innerWidth,innerHeight]})()")
        if r[0]<0 or r[1]>r[4]+0.5 or r[2]<0 or r[3]>r[5]+0.5: fails.append(f'{name} dialog out of viewport {r}')
        if errs: fails.append(f'{name} errors {errs[:3]}')
        ctx.close()
    b.close()
finally: srv.terminate()
print('checks', n, 'fails', len(fails)); print('\n'.join(fails[:40]))
import sys as _sys; _sys.exit(1 if fails or not n else 0)
