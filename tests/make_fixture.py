import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CHROME='/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
# Drive the ORIGINAL (v1) app to create realistic legacy data for migration testing.
import json, subprocess, time, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8701', '-d', os.environ.get('LEGACY_APP','../legacy-app')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = b.new_context(service_workers='block'); pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8701/index.html')
        pg.wait_for_function('window.__studyTracker && window.__quizCentre')
        pg.evaluate('''() => {
          const s = window.__studyTracker.state;
          s.settings.startDate = '2026-11-02'; s.settings.dailyTargets = [45,60,60,60,60,180,150];
          s.settings.name = 'Sample User'; s.settings.masteryTarget = 80;
          s.sessions.slice(0,9).forEach((x,i)=>{ x.status = i===4?'partial':'completed'; x.actualSec = 3000+i*60; x.notes='note '+i; x.completedOn='2026-11-0'+(2+Math.min(i,7)); });
          s.sessions[2].lectures = [{id:'l1',title:'Lecture 12 Entra roles',done:true}];
          s.weeks[0].objectives[0].done = true; s.weeks[0].assessmentScore = 78; s.weeks[0].revision='done';
          s.quizzes.push({id:'mq1', name:'Udemy practice test 1', date:'2026-11-08', questions:50, correct:39, topics:'PIM', notes:'', week:1});
          s.udemy = {lectureTitle:'Conditional Access basics', section:'7', progress: 34, resumeUrl:'', updatedAt: new Date().toISOString()};
          s.activity = {'2026-11-02':{min:50,done:1},'2026-11-03':{min:61,done:1},'2026-11-04':{min:62,done:1}};
          window.__studyTracker.save(true);
        }''')
        # Take one real quiz through the v1 engine
        pg.evaluate('''() => { const Q = window.__quizCentre; Q.startSession({mode:'quick', exam:false, diff:'all'}); const s = Q.qs().active;
            s.items.forEach((it,i)=>{ const q = Q.QMAP.get(it.q); s.resp[i] = q.type==='single'||q.type==='multi' ? (i%3? q.ans.slice(): [ (q.ans[0]+1)%q.opts.length ]) : q.type==='order' ? q.opts.map((_,k)=>k) : q.pairs.map((_,k)=>k); });
            Q.finishSession(); window.__studyTracker.save(true); }''')
        pg.wait_for_timeout(500)
        pg.evaluate('''() => { const Q = window.__quizCentre; Q.qs().flagged.push('D2-010'); window.__studyTracker.save(true); }''')
        pg.evaluate('''() => { const Q = window.__quizCentre; Q.startSession({mode:'domain', domain:2, exam:true, diff:'all'}); const s = Q.qs().active; s.items.slice(0,8).forEach((it,i)=>{ const q=Q.QMAP.get(it.q); if(q.type==='single'||q.type==='multi') s.resp[i]=[0];}); Q.finishSession(); window.__studyTracker.save(true); }''')
        pg.wait_for_timeout(500)
        raw = pg.evaluate("localStorage.getItem('m365-study-tracker:v1')")
        open('legacy_v1_state.json','w').write(raw)
        d = json.loads(raw)
        print('errors', errs)
        print('attempts', len(d['quiz']['attempts']), 'stats', len(d['quiz']['stats']), 'flagged', d['quiz']['flagged'], 'sessions', len(d['sessions']))
        print([ (a['title'], a['pct']) for a in d['quiz']['attempts']])
        b.close()
finally:
    srv.terminate()
