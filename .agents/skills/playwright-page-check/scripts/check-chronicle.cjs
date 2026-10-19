const fs = require('node:fs'), assert = require('node:assert/strict');
const { launchBrowser } = require('./check-page.cjs');
const [url = 'http://localhost:4173', out = '/tmp/tk-chronicle'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const events = JSON.parse(fs.readFileSync('data/history/events.json', 'utf8'));
// Isolated completed-save fixture: actual recorded outcomes, synthetic years for grouping coverage.
const outcomes = events.flatMap(e => e.flow.nodes.filter(n => n.type === 'result').map(n => ({ year: 184, month: e.month, title: e.title, detail: n.data.text, kind: 'fiction' })));
const logs = outcomes.slice(0, 24).map((e, i) => ({ ...e, year: 184 + Math.floor(i / 8) }));
(async () => {
 const browser = await launchBrowser(), results = [];
 try { for (const [name, width, height, reducedMotion] of [['pc',1440,1000,'no-preference'],['mobile',390,844,'no-preference'],['small',320,740,'no-preference'],['reduced',390,844,'reduce']]) {
  const c = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const p = await c.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(url); await p.getByRole('button', { name:'시작하기', exact:true }).click();
  await p.getByRole('textbox', { name:'이 시대에 남길 이름', exact:true }).fill('연대기검증');
  await p.getByRole('button', { name:'이름 넣고 시작' }).click();await p.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();
  await p.getByRole('heading', { name:/갑자기 분위기 황건적/ }).last().waitFor();
  await p.evaluate(log => { const save = JSON.parse(localStorage.getItem('tk-survival-game-v1')); Object.assign(save.state.game, { completed:true, introChoicePending:false, flowProgress:undefined, year:186, turn:24 }); save.state.game.world.log=log; localStorage.setItem('tk-survival-game-v1', JSON.stringify(save)); }, logs);
  await p.reload(); await p.getByRole('heading', { name:'연대기검증의 연대기' }).waitFor();
  assert.equal(await p.getByRole('heading', { name:/나의 기록/ }).count(),0);
  const count = await p.getByTestId('chronicle-entry').count();
  if (reducedMotion !== 'reduce') {
   assert(count < 24); await p.waitForFunction(n => document.querySelectorAll('[data-testid="chronicle-entry"]').length > n, count);
   // A completed long save must move its viewport down as further lines appear.
   await p.clock.install(); await p.clock.runFor(15000);
   await p.waitForFunction(() => document.querySelector('[data-testid="chronicle-scroll"]').scrollTop > 0);
   await p.screenshot({ path:`${out}/${name}-playing.png` });
   await p.getByRole('button', { name:'전체 보기', exact:true }).click();
  }
  assert.equal(await p.getByTestId('chronicle-entry').count(),24);
  assert.deepEqual(await p.getByTestId('chronicle-year').locator('h3').allTextContents(), ['184년','185년','186년']);
  assert.equal(await p.getByTestId('chronicle-scroll').evaluate(e => getComputedStyle(e).maxHeight),'none');
  const last=p.getByTestId('chronicle-entry').last();
  await last.scrollIntoViewIfNeeded();
  const rect=await last.boundingBox(); assert(rect.y>=0 && rect.y<height, 'last chronicle line reachable');
  await p.getByRole('heading',{name:'연대기검증의 연대기'}).scrollIntoViewIfNeeded();
  await p.screenshot({ path:`${out}/${name}-all.png`, fullPage:true });
  await p.getByRole('button', { name:'다시 재생', exact:true }).click(); assert((await p.getByTestId('chronicle-entry').count()) < 24);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false);
  assert.deepEqual(errors,[]); results.push({name,years:3,entries:24,automaticScroll:reducedMotion!=='reduce',allAndReplay:true,errors}); await c.close();
 } } finally { await browser.close(); }
 fs.writeFileSync(`${out}/results.json`, JSON.stringify(results,null,2)); console.log(JSON.stringify(results,null,2));
})().catch(e=>{ console.error(e); process.exitCode=1; });
