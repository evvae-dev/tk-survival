const fs=require('node:fs'),assert=require('node:assert/strict');
const {launchBrowser}=require('./check-page.cjs');
const {playbackButton}=require('./playback-helper.cjs');
const [url='http://localhost:4173',out='/tmp/tk-narrative-continuity']=process.argv.slice(2);
const events=JSON.parse(fs.readFileSync('data/history/events.json','utf8'));
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await launchBrowser(),results=[];try{for(const [name,width,height] of [['pc',1440,1000],['mobile',390,844]]){
 const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<768,hasTouch:width<768});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url);await p.getByRole('button',{name:'시작하기',exact:true}).click();await p.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('협상검증');await p.getByRole('button',{name:'이름 넣고 시작'}).click();await p.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();await p.getByTestId('event-panel').waitFor();
 await p.evaluate(ids=>{const save=JSON.parse(localStorage.getItem('tk-survival-game-v1'));const g=save.state.game;Object.assign(g,{introChoicePending:false,factionId:'han',region:'jingzhou',flowProgress:{eventId:'battle-184-wan',nodeId:'han-plan'},turn:2});for(const key of Object.keys(g.stats))g.stats[key]=100;g.world.appliedEventIds=ids.filter(id=>id!=='battle-184-wan');g.world.log=[];g.decisions=[];localStorage.setItem('tk-survival-game-v1',JSON.stringify(save));},events.map(e=>e.id));
 await p.reload();await p.getByTestId('event-panel').waitFor();await playbackButton(p,'자동 ▶');
 await p.getByTestId('event-panel').getByRole('button',{name:'선택하기'}).click();await p.locator('dialog[open]').getByRole('button',{name:/한충과 협상한다/}).click();
 const record=p.getByTestId('history-record').first();await record.getByText(/협상이 성사됐다/).waitFor();assert(!(await record.textContent()).includes('나부터 좀 살자'));
 await playbackButton(p,'다음 기록');await p.getByTestId('event-panel').getByText(/협상이 성사됐다/).waitFor();assert((await p.getByTestId('event-panel').textContent()).includes('칼을 뽑는다'));await p.screenshot({path:`${out}/${name}-negotiated.png`,fullPage:true});
 // Show a pre-fix save without changing its stored outcome or decisions.
 await p.evaluate(()=>{const save=JSON.parse(localStorage.getItem('tk-survival-game-v1'));save.state.game.world.log.at(-1).detail='성공 · 한충의 항복을 받아내고 포로 처우를 협의한다.\n서로 칼 내려놓고 얘기하면 안 되나, 나부터 좀 살자.';localStorage.setItem('tk-survival-game-v1',JSON.stringify(save));});
 await p.reload();await p.getByTestId('history-record').first().getByText(/협상이 성사됐다/).waitFor();assert(!(await p.getByTestId('history-record').first().textContent()).includes('나부터 좀 살자'));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);results.push({name,successNarrated:true,nextSceneConnected:true,legacyRecordCorrected:true,errors});await c.close();
}}finally{await browser.close()}fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exitCode=1});
