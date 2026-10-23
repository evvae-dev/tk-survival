const fs=require('node:fs');const assert=require('node:assert/strict');const {launchBrowser}=require('./check-page.cjs');
const [url='http://127.0.0.1:4173',chapter='001',out='/tmp/tk-participation-browser']=process.argv.slice(2);
const fixtures=JSON.parse(fs.readFileSync('/tmp/tk-participation-fixtures/reachable.json','utf8'));
const events=JSON.parse(fs.readFileSync('data/history/events.json','utf8')).filter(e=>e.chapterId===`chapter-${chapter}`);
const key='tk-survival-game-participation-v2';fs.mkdirSync(out,{recursive:true});
const scenarios=fixtures.states.filter(s=>events.some(e=>e.id===s.flowProgress?.eventId));
async function seed(page,game){await page.goto(url);await page.evaluate(({game,key})=>localStorage.setItem(key,JSON.stringify({state:{game:{...game,introChoicePending:false}},version:1})),{game,key});await page.reload();}
async function images(page){
 const imgs=page.locator('img');for(let i=0;i<await imgs.count();i++){const img=imgs.nth(i);if(!await img.isVisible())continue;await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.complete?true:new Promise(resolve=>{el.onload=()=>resolve(true);el.onerror=()=>resolve(false);setTimeout(()=>resolve(false),5000)}));}
 return imgs.evaluateAll(list=>list.filter(img=>img.getBoundingClientRect().width>0&&img.naturalWidth===0).map(img=>img.src));
}
(async()=>{const browser=await launchBrowser(),reports=[];try{
 for(const [label,width,height]of [['desktop',1440,1000],['mobile',390,844],['short',1440,720]]){
  const cx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await cx.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  for(const state of scenarios){
   const e=events.find(e=>e.id===state.flowProgress.eventId),node=e.flow.nodes.find(n=>n.id===state.flowProgress.nodeId);
   await seed(page,state);await page.getByTestId('event-panel').waitFor();assert((await page.getByTestId('event-panel').innerText()).includes(node.data.text));
   await page.getByRole('button',{name:'선택하기',exact:false}).click();const dialog=page.locator('dialog[open]');await dialog.waitFor();
   const expected=node.data.options.filter(o=>(o.conditions??[]).every(c=>{const v=c.field.split('.').reduce((o,k)=>o?.[k],state);return c.operator==='eq'?v===c.value:c.operator==='neq'?v!==c.value:c.operator==='in'?c.value.includes(v):true}));
   assert.equal(await dialog.locator('button strong').count(),expected.length);assert.equal(await dialog.locator('button img').count(),expected.length);assert.deepEqual(await images(page),[]);assert.equal(await page.locator('img[src*="/characters/"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await dialog.evaluate(el=>el.scrollTop=0);if(chapter==='005'||state===scenarios[0]||['oath','yellow','civil','evidence'].includes(node.id))await page.screenshot({path:`${out}/${chapter}-${label}-${e.id}-${node.id}.png`,fullPage:false});
   await dialog.getByRole('button',{name:/팝업 닫기/}).click();
  }
  // The source is a real preceding-choice state, not a fabricated attendance flag.
  const newsState=fixtures.automatic.find(s=>{const latest=s.decisions.at(-1);return chapter==='001'&&latest?.eventId==='r001-03'&&latest?.check?.success===false});
  if(newsState){await seed(page,newsState);await page.getByTestId('record-card').waitFor();assert.equal(await page.getByRole('button',{name:'선택하기',exact:false}).count(),0);assert((await page.getByTestId('record-card').innerText()).includes('참석하지 않았다'));assert((await page.getByTestId('record-card').locator('img').getAttribute('src')).includes('v2-news-courier'));await page.screenshot({path:`${out}/${chapter}-${label}-oath-news.png`});}
  assert.deepEqual(errors,[]);reports.push({label,chapter,choiceScenes:scenarios.length,newsChecked:!!newsState,errors});await cx.close();
 }
 const cx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await cx.newPage();const state=scenarios[0],e=events.find(e=>e.id===state.flowProgress.eventId),nodeId=state.flowProgress.nodeId;
 await p.goto(`${url}/admin/events?event=${e.id}`);await p.getByLabel('사건 ID',{exact:true}).waitFor();assert.equal(await p.getByLabel('사건 ID',{exact:true}).inputValue(),e.id);
 await p.locator(`[data-id="${nodeId}"]`).dispatchEvent('click');await p.getByRole('tab',{name:'노드 속성',exact:true}).click();const field=p.getByLabel('상황 대사',{exact:true});const before=await field.inputValue();const edited=before+' 나는 확인한 소식과 내 역할을 다시 짚었다.';await field.fill(edited);await p.getByRole('button',{name:'흐름 저장 · 게임 반영',exact:true}).click();await p.getByRole('status').filter({hasText:'흐름을 저장했습니다'}).waitFor();await p.reload();await p.locator(`[data-id="${nodeId}"]`).dispatchEvent('click');await p.getByRole('tab',{name:'노드 속성',exact:true}).click();assert.equal(await p.getByLabel('상황 대사',{exact:true}).inputValue(),edited);
 await seed(p,state);await p.getByTestId('event-panel').waitFor();assert((await p.getByTestId('event-panel').innerText()).includes('내 역할을 다시 짚었다'));
 await p.goto(`${url}/admin/collection`);await p.getByRole('navigation',{name:'실행 사건',exact:true}).waitFor();for(const e of events)assert(await p.getByRole('navigation',{name:'실행 사건',exact:true}).getByRole('button',{name:new RegExp(e.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).count());await p.screenshot({path:`${out}/${chapter}-admin.png`});reports.push({adminEditSaveReloadGame:true,chapter});await cx.close();
 }finally{await browser.close()}fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));})().catch(e=>{console.error(e);process.exitCode=1});
