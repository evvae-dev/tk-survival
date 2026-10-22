const fs=require('node:fs');const assert=require('node:assert/strict');const {launchBrowser}=require('./check-page.cjs');
const [url='http://127.0.0.1:4173',out='/tmp/tk-story-conditions']=process.argv.slice(2);
const events=JSON.parse(fs.readFileSync('data/history/events.json','utf8'));
const states=JSON.parse(fs.readFileSync('/tmp/tk-story-fixtures/c-success.json','utf8')).states;
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await launchBrowser();const reports=[];try{
 for(const chapter of ['001','002','003']){
  const e=events.find(e=>e.chapterId===`chapter-${chapter}`);
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',err=>errors.push(err.message));
  console.log('검증 시작',chapter);await page.goto(`${url}/admin/events?event=${e.id}`);await page.getByLabel('사건 ID',{exact:true}).waitFor();
  const checkA=page.locator('[data-id="scene-a-check"]'),checkB=page.locator('[data-id="scene-b-check"]');await checkA.waitFor();await checkB.waitFor();
  const a=await checkA.boundingBox(),b=await checkB.boundingBox();assert(a&&b);assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'A/B 판정 노드가 겹치면 안 된다');
  for(const [node,marker]of [[checkA,'A 판정 안내 편집 검증'],[checkB,'B 판정 안내 편집 검증']]){
   await node.dispatchEvent('click');await page.getByRole('tab',{name:'노드 속성',exact:true}).click();await page.getByLabel(/^성공 결과 안내/).fill(marker);
  }
  await page.getByRole('button',{name:'흐름 저장 · 게임 반영',exact:true}).click();await page.getByRole('status').filter({hasText:'흐름을 저장했습니다'}).waitFor();await page.reload();
  for(const [id,marker]of [['scene-a-check','A 판정 안내 편집 검증'],['scene-b-check','B 판정 안내 편집 검증']]){
   await page.locator(`[data-id="${id}"]`).dispatchEvent('click');await page.getByRole('tab',{name:'노드 속성',exact:true}).click();assert.equal(await page.getByLabel(/^성공 결과 안내/).inputValue(),marker);
  }
  await page.screenshot({path:`${out}/${chapter}-checks.png`,fullPage:true});
  const game=states.find(s=>s.flowProgress?.eventId===e.id&&s.flowProgress?.nodeId==='scene');assert(game);
  await page.evaluate(game=>localStorage.setItem('tk-survival-game-romance-v1',JSON.stringify({state:{game:{...game,introChoicePending:false}},version:1})),game);await page.goto(url);await page.getByTestId('event-panel').waitFor();await page.getByRole('button',{name:'선택하기',exact:false}).click();const dialog=page.locator('dialog[open]');await dialog.waitFor();assert((await dialog.innerText()).includes('A 판정 안내 편집 검증'));assert((await dialog.innerText()).includes('B 판정 안내 편집 검증'));assert.deepEqual(errors,[]);
  reports.push({chapter,checksDoNotOverlap:true,bothChecksEditSaveReloadGame:true,errors});await context.close();
 }
 }finally{await browser.close();}fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
})().catch(e=>{console.error(e);process.exitCode=1;});
