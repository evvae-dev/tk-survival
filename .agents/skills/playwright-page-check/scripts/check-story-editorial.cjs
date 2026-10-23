const fs=require('node:fs'),assert=require('node:assert/strict'),{launchBrowser}=require('./check-page.cjs');
const [url='http://127.0.0.1:4173',out='/tmp/tk-story-editorial']=process.argv.slice(2);
const key='tk-survival-game-participation-v2',catalogKey='tk-survival-event-catalog-participation-v2';
const events=JSON.parse(fs.readFileSync('data/history/events.json'));
const fixtures=JSON.parse(fs.readFileSync('/tmp/tk-participation-fixtures/reachable.json'));
const oldBackground='후한 조정의 부패와 재난 속에서 장각은 태평요술서와 치료 활동으로 신도를 모았고 장보·장량과 거사를 준비했다. 요술은 연의의 설정이다.';
const forbidden=/연의(?:의| 속)? (?:기본 |요술 )?(?:설정|전개)(?:이다|다|에서)/;
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await launchBrowser(),report=[];try{
 for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844],['short',1440,720]]){
  const cx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await cx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
  await p.goto(url);await p.getByRole('button',{name:'시작하기',exact:true}).click();await p.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('시작 문구 확인');await p.getByRole('button',{name:'이름 넣고 시작'}).click();
  await p.locator('[data-testid="stat-roulette"][data-phase="complete"]').waitFor();await p.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();await p.getByRole('button',{name:'선택하기',exact:false}).waitFor();
  const background=p.locator('[data-testid="history-record"][data-record-type="background"]');assert((await background.innerText()).includes('거사를 준비하고 있다'));assert(!forbidden.test(await p.getByTestId('game-screen').innerText()));await background.scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${name}-fresh.png`});
  const game=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).state.game,key);game.introChoicePending=false;const bg=game.world.log.find(r=>r.recordType==='background');bg.detail=oldBackground;
  const catalog=structuredClone(events[0]);catalog.flow.nodes.find(n=>n.id==='market-background').data.text=oldBackground+' 내가 덧붙인 기록이다.';
  await p.evaluate(({game,catalog,key,catalogKey})=>{localStorage.setItem(key,JSON.stringify({state:{game},version:1}));localStorage.setItem(catalogKey,JSON.stringify({state:{overrides:{[catalog.id]:catalog},deletedIds:[]},version:1}));},{game,catalog,key,catalogKey});
  await p.reload();await p.getByRole('button',{name:'선택하기',exact:false}).waitFor();assert(!forbidden.test(await p.getByTestId('game-screen').innerText()));assert((await background.innerText()).includes('장보·장량과 거사를 준비했다'));
  assert.deepEqual(await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).state.game,key),game);await background.scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${name}-existing-save.png`});
  await p.goto(`${url}/admin/events?event=r001-01`);await p.getByLabel('사건 ID',{exact:true}).waitFor();await p.locator('[data-id="market-background"]').dispatchEvent('click');await p.getByRole('tab',{name:'노드 속성',exact:true}).click();const edited=await p.getByLabel('결과 대사',{exact:true}).inputValue();assert(!forbidden.test(edited));assert(edited.includes('내가 덧붙인 기록이다'));
  const second=fixtures.states.find(s=>s.flowProgress?.eventId==='r002-02'&&s.flowProgress?.nodeId==='liu');assert(second);await p.goto(url);await p.evaluate(({key,game})=>localStorage.setItem(key,JSON.stringify({state:{game:{...game,introChoicePending:false}},version:1})),{key,game:second});await p.reload();await p.getByRole('button',{name:'선택하기',exact:false}).waitFor();assert(!forbidden.test(await p.getByTestId('game-screen').innerText()));assert((await p.getByTestId('event-panel').innerText()).includes('주준'));await p.getByTestId('event-panel').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${name}-chapter2.png`});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);report.push({name,freshStart:true,existingSaveUnchanged:true,oldCatalogRepaired:true,adminProsePreserved:true,chapter2:true,errors});await cx.close();
 }
}finally{await browser.close()}fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));})().catch(e=>{console.error(e);process.exitCode=1});
