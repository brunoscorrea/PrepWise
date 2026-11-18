/* Runs tests/browser-multicert.js (SC-300 / MD-102 profiles) in headless Edge or Chrome.
   No npm packages needed (Node 22+).   node tests/run-multicert.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { serve, launch, newPage, sleep } = require('./cdp.js');

(async () => {
  const SRC = fs.readFileSync(path.join(__dirname, 'browser-multicert.js'), 'utf8');
  const srv = await serve();
  const br = await launch();
  let code = 1;
  try {
    const pg = await newPage(br.cdp, { width: 1366, height: 900 });
    await pg.goto(`http://127.0.0.1:${srv.port}/index.html`);
    // A ready-made local profile skips the first-run welcome screen.
    await pg.eval("sessionStorage.removeItem('__mc'); localStorage.setItem('prepwise:profiles', JSON.stringify({ schema: 1, active: 'ptestprofile1', profiles: [{ id: 'ptestprofile1', name: 'Tester', ns: 'p' }] })); return true");
    await pg.reload();
    for (let i = 0; i < 10; i++) {
      await pg.waitFor('return !!(window.PrepWise && PrepWise.store)'); await sleep(500);
      const r = await pg.eval(`eval(${JSON.stringify(SRC)}); return await __mc.run();`);
      if (r.next === 'done') break;
      await pg.reload();
    }
    const rep = await pg.eval(`eval(${JSON.stringify(SRC)}); return __mc.report();`);
    rep.failed.forEach((f) => console.log('FAIL', f.name, f.info));
    console.log(`multicert ${rep.pass}/${rep.total}`);
    code = rep.pass === rep.total && rep.total > 0 ? 0 : 1;
  } catch (e) { console.log('FAIL run', e.stack); }
  await br.close(); await srv.stop();
  process.exit(code);
})();
