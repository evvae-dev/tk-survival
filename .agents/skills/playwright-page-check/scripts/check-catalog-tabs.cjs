const fs = require('node:fs');
const assert = require('node:assert/strict');
const { launchBrowser } = require('./check-page.cjs');
const [url = 'http://localhost:3002', out = '/tmp/tk-catalog-tabs', mode = 'fixed'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const oldTitle = '[천하통일에 나선다]';
const newTitle = '[황궁으로 가는 부대를 따라간다]';
async function openChoices(page) {
  for (let step = 0; step < 100; step++) {
    const dialog = page.locator('dialog[open]');
    if (await dialog.count()) return dialog;
    const proceed = page.getByRole('button', { name: '진행', exact: true });
    const next = page.getByRole('button', { name: '다음 기록', exact: true });
    if (await proceed.isVisible() && await proceed.isEnabled()) await proceed.click();
    else if (await next.isVisible() && await next.isEnabled()) await next.click();
    else await page.mouse.click(5, 300);
    await page.waitForTimeout(80);
  }
  throw new Error('Choice dialog did not open');
}
(async () => {
  const browser = await launchBrowser();
  const reports = [];
  try {
    for (const [name, width, height] of (mode === 'before' ? [['desktop',1440,1000]] : [['desktop',1440,1000],['mobile',390,844],['short',1440,720]])) {
      const context = await browser.newContext({ viewport: {width,height}, reducedMotion:'reduce' });
      const game = await context.newPage();
      const admin = await context.newPage();
      const errors = [], failed = [];
      for (const page of [game,admin]) {
        page.setDefaultTimeout(15000);
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', request => { if (request.url().startsWith(url)) failed.push(request.url()); });
      }
      await game.goto(url);
      await game.getByRole('button',{name:'시작하기',exact:true}).click();
      await game.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('탭저장검증');
      await game.getByRole('button',{name:'이름 넣고 시작'}).click();
      await game.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();
      await game.getByTestId('awakening-transition').waitFor({state:'detached'});
      await (await openChoices(game)).getByRole('button',{name:/황건적 코스프레/}).click();
      const route = await openChoices(game);
      await route.getByRole('button',{name:/천하통일에 나선다/}).waitFor();
      const before = await game.evaluate(() => JSON.parse(localStorage.getItem('tk-survival-game-v1')).state.game);
      await admin.goto(`${url}/admin/events?event=chapter-5-1-opening`);
      await admin.getByLabel('사건 ID',{exact:true}).waitFor();
      await admin.locator('[data-id="yellow-route"] strong').click();
      await admin.getByLabel('선택 제목',{exact:true}).first().fill(newTitle);
      await admin.getByRole('button',{name:'사건 정보 저장',exact:true}).click();
      if (mode !== 'before') {
        await admin.getByRole('status').filter({hasText:'노드·선택지 변경은 아직 저장되지 않았습니다'}).waitFor();
        assert(await admin.getByText('저장하지 않은 변경 있음',{exact:false}).isVisible());
      }
      await admin.getByRole('button',{name:'흐름 저장 · 게임 반영',exact:true}).click();
      await admin.getByRole('status').filter({hasText:'흐름을 저장했습니다'}).waitFor();
      const savedTitle = await admin.evaluate(() => JSON.parse(localStorage.getItem('tk-survival-event-catalog-5.1-v1')).state.overrides['chapter-5-1-opening'].flow.nodes.find(n=>n.id==='yellow-route').data.options[0].title);
      assert.equal(savedTitle,newTitle);
      if (mode === 'before') {
        await game.waitForTimeout(700);
        assert(await route.getByRole('button',{name:/천하통일에 나선다/}).isVisible());
        assert.equal(await route.getByRole('button',{name:/황궁으로 가는 부대를 따라간다/}).count(),0);
        reports.push({name,savedTitle,existingGameTab:'stale'});
      } else {
        await route.getByRole('button',{name:/황궁으로 가는 부대를 따라간다/}).waitFor();
        assert.equal(await route.getByRole('button',{name:/천하통일에 나선다/}).count(),0);
        const after = await game.evaluate(() => JSON.parse(localStorage.getItem('tk-survival-game-v1')).state.game);
        assert.deepEqual(after,before,'catalog changes preserve game progress');
        const img = route.getByRole('button',{name:/황궁으로 가는 부대를 따라간다/}).locator('img');
        await img.evaluate(img=>img.complete&&img.naturalWidth>0?true:new Promise(resolve=>img.onload=resolve));
        await game.screenshot({path:`${out}/${name}-game-updated.png`});
        await admin.reload();
        await admin.locator('[data-id="yellow-route"] strong').click();
        assert.equal(await admin.getByLabel('선택 제목',{exact:true}).first().inputValue(),newTitle);
        await game.reload();await game.getByTestId('event-panel').waitFor();
        await (await openChoices(game)).getByRole('button',{name:/황궁으로 가는 부대를 따라간다/}).waitFor();
        assert.equal(await game.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        reports.push({name,savedTitle,existingGameTab:'updated',reload:'preserved',gameProgress:'unchanged'});
      }
      assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));
  console.log(JSON.stringify(reports,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
