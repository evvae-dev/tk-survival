const fs=require('node:fs');const assert=require('node:assert/strict');const {launchBrowser}=require('./check-page.cjs');
const [url='http://127.0.0.1:4173',out='/tmp/tk-story-playthrough']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});const expected=JSON.parse(fs.readFileSync('data/history/events.json','utf8')).length;
(async()=>{const browser=await launchBrowser();try{const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('연속완주');await page.getByRole('button',{name:'이름 넣고 시작'}).click();await page.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();await page.getByTestId('awakening-transition').waitFor({state:'detached'});
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-romance-v1')).state.game);
 for(let step=0;step<expected*15+30;step++){
  const game=await saved();if(game.completed)break;
  const dialog=page.locator('dialog[open]');
  if(await dialog.count()){
   const choices=dialog.locator('button').filter({has:page.locator('strong')});const count=await choices.count();if(count){const choice=choices.nth(count===3?2:0);await choice.scrollIntoViewIfNeeded();await choice.click();await page.waitForFunction(turn=>{const g=JSON.parse(localStorage.getItem('tk-survival-game-romance-v1')).state.game;return g.turn>turn||g.completed;},game.turn);continue;}
   await dialog.getByRole('button',{name:'팝업 닫기'}).click();
  }
  const button=page.getByRole('button',{name:'선택하기',exact:false});if(await button.isVisible()){await button.click();continue;}
  await page.mouse.click(5,320);await page.waitForTimeout(100);
 }
 const result=await saved();assert.equal(result.completed,true);assert.equal(result.turn,expected);assert.equal(new Set(result.world.appliedEventIds).size,expected);assert.equal(new Set(result.decisions.map(e=>e.eventId)).size,expected);assert.deepEqual(errors,[]);
 await page.screenshot({path:`${out}/completed.png`,fullPage:false});
 const before=JSON.stringify(result);await page.reload();await page.getByTestId('completed-screen').waitFor();assert.equal(JSON.stringify(await saved()),before);
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({completed:true,turns:result.turn,events:result.world.appliedEventIds,records:result.world.log.length,saveReloadIdentical:true,errors},null,2));console.log(`${expected}개 사건 C 경로 실제 화면 완주·저장 복원 통과`);await context.close();}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
