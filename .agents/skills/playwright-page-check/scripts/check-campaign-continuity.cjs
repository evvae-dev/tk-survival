const fs=require('fs'),assert=require('assert/strict');
const {launchBrowser}=require('./check-page.cjs');
const [base='http://127.0.0.1:4173',fixtures='/tmp/tk-continuity',out='/tmp/tk-continuity-browser']=process.argv.slice(2);
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await launchBrowser(),reports=[];try{
 for(const file of ['dong-journey.json','legacy-v8-dong.json'])for(const [name,width,height] of [['pc',1440,1000],['mobile',390,844]]){
  const fixture=JSON.parse(fs.readFileSync(`${fixtures}/${file}`));const game=fixture.game;
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(({game,version})=>{if(localStorage.getItem('continuity-fixture'))return;localStorage.setItem('tk-survival-game-v1',JSON.stringify({version,state:{game}}));localStorage.setItem('continuity-fixture','1');},{game,version:file.startsWith('legacy')?8:9});
  await page.goto(base);await page.getByTestId('game-screen').waitFor();
  const records=page.getByTestId('history-log');await records.waitFor();
  assert.equal(await records.locator('[data-record-type="background"] h3,[data-record-type="outcome"] h3,[data-record-type="news"] h3').count(),0,'facts must have no scene title');
  const text=await records.innerText();
  assert(!text.includes('새해에도 내 선택과 인연은 그대로'),'annual default filler');
  for(const title of ['왕분의 영제 폐위 모의','하제의 현성 방어','서원팔교위 설치','유우의 유주 회유','장연의 조정 귀순'])assert(!text.includes(title),`unrelated headline: ${title}`);
  assert(!text.includes('관군의 완전한 승리.'));assert(!text.includes('한나라 관군의 결정적 대승.'));
  assert.equal(await records.locator('[data-officer-name="사정"],[data-officer-name="봉기"],[data-officer-name="조정"],[data-officer-name="전해"]').count(),0,'ordinary words must not link to officers');
  assert(text.includes('동탁'),'current faction must remain visible');
  const before=await records.locator('[data-testid="history-record"]').count();await page.reload();await page.getByTestId('game-screen').waitFor();assert.equal(await page.getByTestId('history-record').count(),before,'reload must not duplicate records');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const retained=await page.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-v1')).state.game);
  assert.equal(retained.turn,game.turn);assert.equal(retained.factionId,game.factionId);assert.deepEqual(retained.stats,game.stats);assert.deepEqual(retained.decisions,game.decisions);
  await page.screenshot({path:`${out}/${file}-${name}.png`,fullPage:true});await page.locator('aside').last().screenshot({path:`${out}/${file}-${name}-records.png`});assert.deepEqual(errors,[]);
  reports.push({fixture:file,viewport:name,factsWithoutHeadings:true,noAnnualFiller:true,noUnrelatedHeadlineWall:true,progressPreserved:true,count:before,errors});await context.close();
 }
}finally{await browser.close();}fs.writeFileSync(`${out}/results.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));})().catch(e=>{console.error(e);process.exit(1)});
