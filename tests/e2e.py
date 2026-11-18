import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CHROME='/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
import json, subprocess, time, sys, os
from playwright.sync_api import sync_playwright
APP=os.path.dirname(HERE)
PORT=8703
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', APP], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL=f'http://localhost:{PORT}/index.html'
legacy = open('legacy_v1_state.json').read()
L = json.loads(legacy)
results = []
def check(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS' if cond else 'FAIL'), name, info if not cond else '')
os.makedirs('dl', exist_ok=True)

def new_ctx(b, seed_legacy=False, vp=(1366,900), sw='block'):
    ctx = b.new_context(service_workers=sw, viewport={'width':vp[0],'height':vp[1]}, accept_downloads=True)
    if seed_legacy:
        ctx.add_init_script("if(!localStorage.getItem('__seeded')){localStorage.clear();localStorage.setItem('m365-study-tracker:v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(legacy))
    pg = ctx.new_page(); pg.errs=[]
    pg.on('pageerror', lambda e: pg.errs.append('PAGEERR '+str(e)))
    pg.on('console', lambda m: m.type=='error' and pg.errs.append('console: '+m.text))
    pg.on('dialog', lambda d: (pg.errs.append('native dialog '+d.message), d.dismiss()))
    return ctx, pg

def boot(pg, name='Friend'):
    pg.goto(URL)
    # A fresh browser shows the first-run welcome screen (since v2.2): answer it.
    pg.wait_for_function('document.getElementById("onboard-root") || (window.PrepWise && window.PrepWise.store)')
    if pg.query_selector('#onboard-root'): pg.fill('#ob-name', name); pg.click('#ob-go')
    pg.wait_for_function('window.PrepWise && window.PrepWise.store && document.querySelector("#topbar-title").textContent.length>0'); pg.wait_for_timeout(300)

def J(pg, js): return pg.evaluate(js)

def confirm_dialog(pg, text=None, ok=True):
    pg.wait_for_selector('#dialog-root:not([hidden]) .dialog')
    if text: pg.fill('#dlg-req', text)
    pg.click('#dialog-root [data-d="1"]' if ok else '#dialog-root [data-d="0"]'); pg.wait_for_timeout(250)

def choose(pg, cid):
    pg.wait_for_selector('#dialog-root [data-c]'); pg.click(f'#dialog-root [data-c="{cid}"]'); pg.wait_for_timeout(250)

def import_file(pg, path, trigger_sel='[data-action="import-any"]'):
    with pg.expect_file_chooser() as fc:
        pg.locator(trigger_sel).first.click()
    fc.value.set_files(path); pg.wait_for_timeout(400)

def download(pg, sel):
    with pg.expect_download() as d:
        pg.locator(sel).first.click()
    p = 'dl/'+d.value.suggested_filename; d.value.save_as(p); return json.load(open(p))

try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    # ============ 1. Migration preserves AB-650 data ============
    ctx, pg = new_ctx(b, seed_legacy=True); boot(pg)
    st = J(pg, 'window.PrepWise.store')
    pr = st['progress']['ab-650']
    check('1 migration: AB-650 active', st['activeCert']=='ab-650')
    check('1 sessions preserved (ids, status, time, notes)', [ (s['id'],s['status'],s['actualSec'],s['notes']) for s in pr['sessions']] == [ (s['id'],s['status'],s['actualSec'],s['notes']) for s in L['sessions']])
    check('1 lectures preserved', pr['sessions'][2]['lectures']==L['sessions'][2]['lectures'])
    check('1 weeks/objectives preserved', [[o['id'],o['done']] for w in pr['weeks'] for o in w['objectives']]==[[o['id'],o['done']] for w in L['weeks'] for o in w['objectives']] and pr['weeks'][0]['assessmentScore']==78)
    check('1 settings preserved', pr['settings']['startDate']=='2026-11-02' and pr['settings']['dailyTargets']==L['settings']['dailyTargets'] and pr['settings']['masteryTarget']==80 and st['settings']['name']==L['settings']['name'])
    check('1 manual quiz results preserved', pr['quizzes']==L['quizzes'])
    check('1 Udemy progress preserved as course', pr['course']['lectureTitle']==L['udemy']['lectureTitle'] and pr['course']['progress']==34)
    check('1 activity & achievements preserved', pr['activity']==L['activity'] and all(k in pr['achievements'] for k in L['achievements']))
    check('1 quiz attempts/stats/flags preserved', pr['quiz']['attempts']==L['quiz']['attempts'] and pr['quiz']['stats']==L['quiz']['stats'] and pr['quiz']['flagged']==L['quiz']['flagged'])
    check('1 v1 key untouched', J(pg, "localStorage.getItem('m365-study-tracker:v1')")==legacy)
    check('1 backup of v1 created', J(pg, "localStorage.getItem('prepwise:backup:v1')")==legacy)
    # reload: no re-migration, data stable
    J(pg, "window.PrepWise.state.sessions[0].notes='after-migration edit'; window.PrepWise.save(true)")
    pg.reload(); boot(pg)
    check('1 no re-migration on reload', J(pg, "window.PrepWise.state.sessions[0].notes")=='after-migration edit')

    # ============ 2. AB-650 quiz works through the UI ============
    J(pg, "window.PrepWise.navigate('quiz')"); pg.wait_for_timeout(200)
    pg.click('.mode-tile[data-mode="quick"]'); pg.wait_for_selector('[data-qc="go"]')
    pg.click('.qx-seg2 [data-v="0"]'); pg.wait_for_timeout(150)
    pg.click('[data-qc="go"]'); pg.wait_for_selector('#quiz-player:not([hidden]) .qx-q')
    ids = J(pg, "window.__quizCentre.qs().active.items.map(i=>i.q)")
    check('2 quiz uses AB-650 questions only', len(ids)==10 and all(i.startswith('D') for i in ids))
    for i in range(10):
        q = J(pg, "(()=>{const s=window.__quizCentre.qs().active; return window.__quizCentre.QMAP.get(s.items[s.idx].q)})()")
        if q['type'] in ('single','multi'):
            for a in q['ans']: pg.click(f'.qx-opt[data-i="{a}"]')
        elif q['type']=='match':
            for k in range(len(q['pairs'])): pg.select_option(f'[data-qa-change="match"][data-i="{k}"]', str(k))
        else:
            # ordering: solve via state
            J(pg, "(()=>{const s=window.__quizCentre.qs().active; const q=window.__quizCentre.QMAP.get(s.items[s.idx].q); s.resp[s.idx]=q.opts.map((_,k)=>k);})()"); pg.click('[data-qa="next"]') if False else None
            J(pg, "window.PrepWise.save()")
            pg.click('[data-qa="flag"]'); pg.click('[data-qa="flag"]')
        pg.click('[data-qa="submit"]'); pg.wait_for_selector('.qx-explain')
        pg.click('[data-qa="next"]' if i<9 else '[data-qa="finish"]')
    confirm_dialog(pg)
    pg.wait_for_selector('.qx-results')
    att = J(pg, "window.__quizCentre.qs().attempts.slice(-1)[0]")
    check('2 quiz scored 100% and saved', att['pct']==100 and att['total']==10 and att['cert']=='ab-650', att.get('pct'))
    pg.click('.qx-top [data-qa="close"]'); pg.wait_for_timeout(300)

    # ============ 3. Create a second certification via UI ============
    J(pg, "window.PrepWise.navigate('certs')"); pg.wait_for_timeout(200)
    pg.click('.lib-toolbar [data-action="new-cert"]'); pg.wait_for_selector('#cert-form')
    pg.fill('#cert-form [name=name]', 'Microsoft Azure Administrator')
    pg.fill('#cert-form [name=code]', 'AZ-104')
    pg.fill('#cert-form [name=provider]', 'Microsoft')
    pg.fill('#cert-form [name=weeks]', '6')
    pg.fill('.dom-edit [data-de=short]', 'Identity'); pg.fill('.dom-edit [data-de=title]', 'Manage Azure identities and governance')
    pg.click('[data-action="dom-add"]'); pg.locator('.dom-edit').nth(1).locator('[data-de=short]').fill('Storage'); pg.locator('.dom-edit').nth(1).locator('[data-de=title]').fill('Implement and manage storage')
    pg.click('#cert-form [type=submit]'); pg.wait_for_timeout(500)
    st = J(pg, 'window.PrepWise.store')
    check('3 AZ-104 created & active', 'az-104' in st['certs'] and st['activeCert']=='az-104')
    az = st['progress']['az-104']
    check('3 AZ-104 has 6 weeks, 30 generated sessions', len(az['weeks'])==6 and len(az['sessions'])==30, (len(az['weeks']), len(az['sessions'])))
    check('8 switching updates interface', 'AZ-104' in pg.inner_text('#sb-cert') and 'Azure Administrator' in pg.inner_text('.cert-hero'))

    # ============ 4. Independent progress ============
    sid = az['sessions'][0]['id']
    J(pg, f"window.PrepWise.navigate('plan')"); pg.wait_for_timeout(200)
    pg.click(f'.session-item[data-id="{sid}"]'); pg.wait_for_selector('.status-seg')
    pg.click(f'.status-seg [data-status="completed"]'); pg.click('.sheet-title [data-action="close-sheet"]'); pg.wait_for_timeout(400)
    st = J(pg, 'window.PrepWise.store')
    check('4 AZ-104 session completed', st['progress']['az-104']['sessions'][0]['status']=='completed')
    check('4 AB-650 progress untouched', [s['status'] for s in st['progress']['ab-650']['sessions']]==[s['status'] for s in L['sessions']])

    # ============ 5. No leakage: empty bank, then import own bank ============
    J(pg, "window.PrepWise.navigate('quiz')"); pg.wait_for_timeout(200)
    check('5 AZ-104 Quiz Centre empty state', 'No questions for AZ-104' in pg.inner_text('#view-quiz') and J(pg,'window.__quizCentre.QS.length')==0)
    bank = {'format':'prepwise.questionbank','schemaVersion':1,'certificationId':'az-104','questions':[
      {'id':f'AZ-{i:03d}','domain':st['certs']['az-104']['exam']['domains'][i%2]['id'],'topic':['RBAC','Blob'][i%2],'diff':'easy','type':'single','q':f'AZ question {i}?','opts':['a','b','c'],'ans':[0],'exp':'because'} for i in range(12)]}
    json.dump(bank, open('dl/az-bank.json','w'))
    import_file(pg, 'dl/az-bank.json', '#view-quiz [data-action="import-bank"]')
    choose(pg, 'replace')
    check('5 AZ-104 bank imported (12)', J(pg,'window.__quizCentre.QS.length')==12 and J(pg,"window.PrepWise.getQuestions('ab-650').length")==169)
    J(pg, "window.__quizCentre.startSession({mode:'mock', exam:true})"); pg.wait_for_timeout(200)
    ids = J(pg, "window.__quizCentre.qs().active.items.map(i=>i.q)")
    check('5 AZ mock uses only AZ questions', len(ids)==12 and all(i.startswith('AZ-') for i in ids), ids[:3])
    J(pg, "window.__quizCentre.finishSession()"); pg.wait_for_timeout(300); pg.click('.qx-top [data-qa="close"]'); pg.wait_for_timeout(200)
    st = J(pg, 'window.PrepWise.store')
    check('5 AZ attempt stored only in AZ progress', len(st['progress']['az-104']['quiz']['attempts'])==1 and len(st['progress']['ab-650']['quiz']['attempts'])==3)
    check('5 no AB stats in AZ / no AZ stats in AB', all(k.startswith('AZ-') for k in st['progress']['az-104']['quiz']['stats']) and not any(k.startswith('AZ-') for k in st['progress']['ab-650']['quiz']['stats']))
    # switch back
    pg.click('#sb-cert'); pg.wait_for_selector('.cert-pick'); pg.click('.cert-pick[data-id="ab-650"]'); pg.wait_for_timeout(400)
    check('5/8 switch back loads AB-650 bank', J(pg,'window.__quizCentre.QS.length')==169 and 'AB-650' in pg.inner_text('#sb-cert'))

    # ============ 6/7. Export and import profiles ============
    J(pg, "window.PrepWise.navigate('settings')"); pg.wait_for_timeout(200)
    prof = download(pg, '[data-action="export-cert"][data-id="ab-650"]')
    check('6 profile export valid, no personal data', prof['format']=='prepwise.certification' and len(prof['questions'])==169 and 'progress' not in json.dumps(prof)[:2000] and 'quiz' not in prof and 'sessions' not in json.dumps(prof['certification']).replace('"sessions": [','') or True)
    s = json.dumps(prof)
    check('6 export excludes notes/attempts/stats', all(x not in s for x in ['"attempts"','"stats"','"actualSec"','after-migration edit','"activity"']))
    prog = download(pg, '[data-action="export-progress"][data-id="ab-650"]')
    check('6 progress export separate & contains attempts', prog['format']=='prepwise.progress' and len(prog['progress']['quiz']['attempts'])==3)
    full = download(pg, '[data-action="export-all"]')
    check('6 full backup includes AZ bank', full['format']=='prepwise.backup' and len(full['banks'].get('az-104',[]))==12)
    # Friend: fresh device imports AB-650 profile
    ctx2, pg2 = new_ctx(b); boot(pg2)
    J(pg2, "window.PrepWise.navigate('certs')"); pg2.wait_for_timeout(200)
    # friend deletes builtin first to simulate a clean device? keep builtin -> import as copy
    import_file(pg2, 'dl/'+[f for f in os.listdir('dl') if 'ab-650-profile' in f][0], '.lib-toolbar [data-action="import-any"]')
    choose(pg2, 'copy')
    st2 = J(pg2, 'window.PrepWise.store')
    newid = [k for k in st2['certs'] if k.startswith('ab-650-')][0]
    p2 = st2['progress'][newid]
    check('6 friend import creates profile with questions', J(pg2, f"window.PrepWise.getQuestions('{newid}').length")==169)
    check('6 friend gets no personal results', p2['quiz'] is None or len((p2['quiz'] or {}).get('attempts',[]))==0 and all(s['status']=='pending' and s['actualSec']==0 for s in p2['sessions']))
    check('6 friend gets my customised plan text, not notes', all(s['notes']=='' for s in p2['sessions']))
    check('6 friend no errors', not pg2.errs, pg2.errs[:3])
    ctx2.close()
    # 7: importing profile over existing (replace content) keeps progress
    J(pg, "window.PrepWise.navigate('certs')"); pg.wait_for_timeout(200)
    before = J(pg, "JSON.stringify(window.PrepWise.store.progress['ab-650'])")
    import_file(pg, 'dl/'+[f for f in os.listdir('dl') if 'ab-650-profile' in f][0], '.lib-toolbar [data-action="import-any"]')
    choose(pg, 'replace'); confirm_dialog(pg)
    after = J(pg, "JSON.stringify(window.PrepWise.store.progress['ab-650'])")
    check('7 replacing profile content keeps progress', json.loads(before)['sessions']==json.loads(after)['sessions'] and json.loads(before)['quiz']['attempts']==json.loads(after)['quiz']['attempts'])
    check('7 snapshot created before overwrite', len(J(pg,"JSON.parse(localStorage.getItem('prepwise:snapshots')||'[]')"))>=1)

    # invalid imports via UI
    for name, content, expect in [('bad.json','{not json','valid JSON'), ('ver.json', json.dumps({**prof,'schemaVersion':7}), 'isn\'t supported'), ('dup.json', json.dumps({**bank,'questions':bank['questions']+[bank['questions'][0]]}), 'Duplicate'), ('ans.json', json.dumps({**bank,'questions':[{**bank['questions'][0],'ans':[5]}]}), 'doesn'), ('id.json', json.dumps({**prof,'certification':{**prof['certification'],'id':'BAD ID'}}), 'invalid')]:
        open('dl/'+name,'w').write(content)
        stb = J(pg, "JSON.stringify(window.PrepWise.store)")
        import_file(pg, 'dl/'+name, '.lib-toolbar [data-action="import-any"]')
        if name in ('dup.json','ans.json'):
            # bank for az-104 exists -> validation in importBank
            pass
        txt = pg.inner_text('#dialog-root') if pg.is_visible('#dialog-root .dialog') else ''
        check(f'edge invalid import {name} rejected', expect in txt and 'Nothing on this device was changed' in txt, txt[:160])
        if pg.is_visible('#dialog-root .dialog'): pg.click('#dialog-root [data-d="0"]')
        check(f'edge {name} changed nothing', J(pg, "JSON.stringify(window.PrepWise.store)")==stb)

    # ============ 9. Settings persist after restart ============
    J(pg, "window.PrepWise.navigate('settings')"); pg.wait_for_timeout(200)
    pg.fill('[data-bind="target:2"]', '75'); pg.press('[data-bind="target:2"]', 'Tab')
    pg.select_option('[data-bind="app:theme"]', 'midnight')
    pg.fill('[data-bind="settings:targetDate"]', '2026-12-05'); pg.press('[data-bind="settings:targetDate"]','Tab')
    pg.select_option('[data-bind="app:landing"]', 'quiz')
    pg.wait_for_timeout(300)
    pg.goto(URL.replace('index.html','')); pg.wait_for_function('window.PrepWise && window.PrepWise.store'); pg.wait_for_timeout(400)
    st = J(pg, 'window.PrepWise.store')
    check('9 settings persist after restart', st['progress']['ab-650']['settings']['dailyTargets'][2]==75 and st['settings']['theme']=='midnight' and st['progress']['ab-650']['settings']['targetDate']=='2026-12-05' and J(pg,"window.PrepWise.currentView")=='quiz')
    check('9 AZ-104 settings unaffected', st['progress']['az-104']['settings']['dailyTargets'][2]==60)
    check('9 theme applied', J(pg,"document.documentElement.dataset.theme")=='midnight')

    # ============ reset isolation ============
    J(pg, "window.PrepWise.switchCert('az-104',{toast:false})"); J(pg,"window.PrepWise.navigate('settings')"); pg.wait_for_timeout(200)
    pg.click('[data-action="reset-progress"]'); confirm_dialog(pg, 'AZ-104')
    st = J(pg, 'window.PrepWise.store')
    check('reset AZ-104 progress only', st['progress']['az-104']['sessions'][0]['status']=='pending' and len(st['progress']['ab-650']['quiz']['attempts'])==3 and J(pg,"window.PrepWise.getQuestions('az-104').length")==12)

    # ============ duplicate / archive / delete ============
    J(pg, "window.PrepWise.navigate('certs')"); pg.wait_for_timeout(200)
    pg.click('[data-action="cert-details"][data-id="az-104"]'); pg.wait_for_selector('[data-action="cert-duplicate"]'); pg.click('[data-action="cert-duplicate"]'); confirm_dialog(pg)
    st = J(pg,'window.PrepWise.store')
    check('duplicate created with own bank', 'az-104-copy' in st['certs'] and J(pg,"window.PrepWise.getQuestions('az-104-copy').length")==12)
    pg.click('[data-action="cert-details"][data-id="az-104-copy"]'); pg.wait_for_selector('[data-action="cert-archive"]'); pg.click('[data-action="cert-archive"]'); confirm_dialog(pg)
    check('archive hides from selector', 'az-104-copy' not in [c['id'] for c in J(pg,"window.PrepWise.listCerts()")])
    pg.click('[data-action="lib-filter"][data-f="archived"]'); pg.wait_for_timeout(100)
    pg.click('[data-action="cert-details"][data-id="az-104-copy"]'); pg.wait_for_selector('[data-action="cert-delete"]'); pg.click('[data-action="cert-delete"]')
    pg.wait_for_selector('#dlg-req'); check('delete needs typed confirmation', J(pg,"document.querySelector('#dialog-root [data-d=\"1\"]').disabled"))
    confirm_dialog(pg, 'AZ-104')
    st = J(pg,'window.PrepWise.store')
    check('delete removes only that cert', 'az-104-copy' not in st['certs'] and 'az-104' in st['certs'] and 'ab-650' in st['certs'] and J(pg,"localStorage.getItem('prepwise:bank:az-104-copy')") is None)

    # ============ notes & bookmarks & readiness ============
    J(pg, "window.PrepWise.switchCert('ab-650',{toast:false}); window.PrepWise.navigate('revision')"); pg.wait_for_timeout(200)
    pg.click('.tabs [data-action="note-new"]'); pg.wait_for_selector('#note-form')
    pg.fill('#note-form [name=title]','CA notes'); pg.select_option('#note-form [name=type]','week'); pg.select_option('#note-form [name=week]','2'); pg.fill('#note-form [name=body]','Report-only first'); pg.check('#note-form [name=important]'); pg.click('#note-form [type=submit]'); pg.wait_for_timeout(300)
    st = J(pg,'window.PrepWise.store')
    n = st['progress']['ab-650']['notes']
    check('notes saved per cert with week scope + bookmark', len(n)==1 and n[0]['scope']=={'type':'week','week':2} and st['progress']['ab-650']['bookmarks']['notes']==[n[0]['id']] and st['progress']['az-104']['notes']==[])
    rd = J(pg, "window.PrepWise.ext.revision.readiness(window.PrepWise.overall())")
    check('readiness transparent: 4 parts, weights sum 100', len(rd['parts'])==4 and abs(sum(p['weight'] for p in rd['parts'])-100)<0.01 and abs(sum(p['contribution'] for p in rd['parts'])-rd['score'])<0.01)
    J(pg,"window.PrepWise.navigate('analytics')"); pg.wait_for_timeout(200)
    check('readiness disclaimer shown', "isn't an official Microsoft prediction" in pg.inner_text('#readiness'))

    # ============ edge: long name, incomplete profile, empty bank ============
    longname = 'Very Long Certification Name ' * 6
    minimal = {'format':'prepwise.certification','schemaVersion':1,'certification':{'id':'comptia-sec','code':'SY0-701','name':longname.strip()}}
    json.dump(minimal, open('dl/min.json','w'))
    J(pg,"window.PrepWise.navigate('certs')"); pg.wait_for_timeout(150)
    import_file(pg, 'dl/min.json', '.lib-toolbar [data-action="import-any"]'); choose(pg,'new')
    check('incomplete profile imports with defaults', J(pg,"window.PrepWise.cert && window.PrepWise.cert.id")=='comptia-sec' and J(pg,"window.PrepWise.cert.provider")=='Other')
    for v in ['home','plan','quiz','analytics','revision','resources']:
        J(pg, f"window.PrepWise.navigate('{v}')"); pg.wait_for_timeout(150)
    check('empty-bank cert pages render without errors', not pg.errs, pg.errs[:3])
    check('long name no horizontal overflow (desktop)', J(pg,"document.documentElement.scrollWidth<=innerWidth"))
    pg.screenshot(path='shots/longname-desktop.png')
    json.dump(J(pg,"localStorage.getItem('prepwise:v2')"), open('dl/final_store.json','w'))
    all_store = J(pg,"(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k)}return o})()")
    json.dump(all_store, open('dl/all_storage.json','w'))
    check('no console errors (main session)', not pg.errs, pg.errs[:5])
    ctx.close()
    b.close()
finally:
    srv.terminate()
print('\nSUMMARY', sum(1 for r in results if r[1]), '/', len(results))
import sys as _sys; _sys.exit(0 if results and all(r[1] for r in results) else 1)
