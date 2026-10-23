const fs=require('node:fs');const assert=require('node:assert/strict');const {launchBrowser}=require('./check-page.cjs');
const [url='http://127.0.0.1:4173',chapter='001',out='/tmp/tk-story-browser']=process.argv.slice(2);
const fixtures=JSON.parse(fs.readFileSync('/tmp/tk-story-fixtures/c-success.json','utf8'));
const allStates=fs.readdirSync('/tmp/tk-story-fixtures').filter(n=>n.endsWith('.json')).flatMap(n=>JSON.parse(fs.readFileSync('/tmp/tk-story-fixtures/'+n,'utf8')).states??[]);
const events=JSON.parse(fs.readFileSync('data/history/events.json','utf8')).filter(e=>e.chapterId===`chapter-${chapter}`);
const seenStates=new Set();const scenarios=allStates.flatMap(state=>{const event=events.find(e=>e.id===state.flowProgress?.eventId);const key=event?.id+':'+state.flowProgress?.nodeId;if(!event||seenStates.has(key))return [];seenStates.add(key);return [{event,state}];});
fs.mkdirSync(out,{recursive:true});
async function images(page){
 const imgs=page.locator('img');for(let i=0;i<await imgs.count();i++){const img=imgs.nth(i);if(!await img.isVisible())continue;await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.complete?true:new Promise(resolve=>{el.onload=()=>resolve(true);el.onerror=()=>resolve(false);setTimeout(()=>resolve(false),8000);}));}
 return imgs.evaluateAll(imgs=>imgs.filter(img=>img.getBoundingClientRect().width>0&&img.naturalWidth===0).map(img=>img.src));
}
(async()=>{const browser=await launchBrowser();const reports=[];try{
 for(const [label,width,height]of [['desktop',1440,1000],['mobile',390,844],['short',1440,720]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  if(chapter==='001'){
   await page.goto(url);await page.getByRole('button',{name:'시작하기',exact:true}).click();await page.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('순차챕터검증');await page.getByRole('button',{name:'이름 넣고 시작'}).click();await page.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();await page.getByTestId('awakening-transition').waitFor({state:'detached'});
   for(let i=0;i<5&&!await page.getByTestId('event-panel').isVisible();i++){await page.keyboard.press('Space');await page.waitForTimeout(200);}
   await page.getByTestId('game-screen').waitFor();
  }
  for(const {event,state}of scenarios){
   assert(state,`fixture ${event.id}`);
   await page.goto(url);await page.evaluate(state=>localStorage.setItem('tk-survival-game-romance-v1',JSON.stringify({state:{game:{...state,introChoicePending:false}},version:1})),state);await page.reload();
   console.log(label,event.id);await page.getByTestId('event-panel').waitFor();assert(await page.getByTestId('event-panel').innerText().then(x=>x.includes(event.title)));
   assert.deepEqual(await images(page),[]);if(['r001-08','r002-08','r003-04','r003-05','r003-08','r005-03','r005-04','r005-08'].includes(event.id))await page.screenshot({path:`${out}/${chapter}-${label}-${event.id}-${state.flowProgress.nodeId}-scene.png`,fullPage:false});await page.getByRole('button',{name:'선택하기',exact:false}).click();const dialog=page.locator('dialog[open]');await dialog.waitFor();assert.equal(await dialog.locator('button').filter({has:page.locator('strong')}).count(),3);assert.equal(await dialog.locator('button img').count(),3);assert.equal(await dialog.locator('img[src*="/characters/"]').count(),0);
   assert.deepEqual(await images(page),[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await dialog.evaluate(el=>el.scrollTop=0);if(event===events[0]||event===events.at(-1))await page.screenshot({path:`${out}/${chapter}-${label}-${event.id}-${state.flowProgress.nodeId}.png`,fullPage:true});
   await dialog.getByRole('button',{name:/팝업 닫기/}).click();
  }
  assert.deepEqual(errors,[]);reports.push({label,chapter,scenes:scenarios.length,nodeIds:scenarios.map(s=>s.event.id+':'+s.state.flowProgress.nodeId),errors});await context.close();
 }
 if(chapter==='003'){
 const cx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await cx.newPage();const dead=JSON.parse(fs.readFileSync('/tmp/tk-story-fixtures/a-failure.json','utf8')).game;assert(dead.world.flags.playerDead);await p.goto(url);await p.evaluate(game=>localStorage.setItem('tk-survival-game-romance-v1',JSON.stringify({state:{game},version:1})),dead);await p.reload();await p.getByTestId('completed-screen').waitFor();assert((await p.getByTestId('completed-screen').innerText()).includes('일기토에서 전사'));const endBox=await p.getByTestId('completed-screen').boundingBox();assert(endBox.y>=0&&endBox.y<500,'전사 안내가 화면 위쪽에 보여야 한다');assert.equal(await p.getByRole('button',{name:'선택하기',exact:false}).count(),0);await p.screenshot({path:`${out}/003-mobile-death.png`,fullPage:false});await cx.close();reports.push({deathEndingAndNoFurtherChoice:true});
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();const e=events[0];await page.goto(`${url}/admin/events?event=${e.id}`);await page.getByLabel('사건 ID',{exact:true}).waitFor();assert.equal(await page.getByLabel('사건 ID',{exact:true}).inputValue(),e.id);
 // Edit an actual choice via the editor, persist it, and check game reflection.
 await page.locator('[data-id="scene"]').dispatchEvent('click');await page.getByRole('tab',{name:'노드 속성',exact:true}).click();const field=page.getByLabel('상황 대사',{exact:true});await field.waitFor();const before=await field.inputValue();const edited=before+' 나는 숨을 고르고 눈앞의 선택을 다시 살폈다.';await field.fill(edited);await page.getByRole('button',{name:'흐름 저장 · 게임 반영',exact:true}).click();await page.getByRole('status').filter({hasText:'흐름을 저장했습니다'}).waitFor();await page.reload();await page.locator('[data-id="scene"]').dispatchEvent('click');await page.getByRole('tab',{name:'노드 속성',exact:true}).click();assert.equal(await page.getByLabel('상황 대사',{exact:true}).inputValue(),edited);
 const g=fixtures.states.find(g=>g.flowProgress?.eventId===e.id);await page.evaluate(game=>localStorage.setItem('tk-survival-game-romance-v1',JSON.stringify({state:{game:{...game,introChoicePending:false}},version:1})),g);await page.goto(url);await page.getByTestId('event-panel').waitFor();assert((await page.getByTestId('event-panel').innerText()).includes('나는 숨을 고르고'));
 await page.goto(`${url}/admin/collection`);await page.getByRole('navigation',{name:'실행 사건',exact:true}).waitFor();for(const event of events)assert(await page.getByRole('navigation',{name:'실행 사건',exact:true}).getByRole('button',{name:new RegExp(event.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).count());
 await page.screenshot({path:`${out}/${chapter}-admin-flow.png`});reports.push({adminEditSaveReloadGame:true,chapter});await context.close();
 }finally{await browser.close();}fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));})().catch(e=>{console.error(e);process.exitCode=1;});
