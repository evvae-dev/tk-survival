const fs=require('fs'),assert=require('assert/strict');
const {launchBrowser}=require('./check-page.cjs');
const events=JSON.parse(fs.readFileSync('data/history/events.json'));
const [base='http://127.0.0.1:4173',out='/tmp/tk-rework-browser']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
async function advance(p){for(let i=0;i<60;i++){const panel=p.getByTestId('event-panel');if(await panel.isVisible())return;const next=p.getByRole('button',{name:'다음 기록',exact:true});if(await next.isVisible()&&await next.isEnabled())await next.click();else await p.mouse.click(4,300);await p.waitForTimeout(60);}throw Error('event panel not revealed');}
async function seed(p,patch){await p.evaluate(({events,patch})=>{let v=JSON.parse(localStorage.getItem('tk-survival-game-v1'));const g=v.state.game;Object.assign(g,{introChoicePending:false,completed:false,year:184,month:null,turn:1,factionId:'han',role:'soldier',region:'zhuo',flowProgress:undefined},patch);g.world={...g.world,log:[],historyLog:[],flags:patch.flags??{},appliedEventIds:patch.applied??[]};delete g.flags;delete g.applied;g.decisions=[];v.version=8;localStorage.setItem('tk-survival-game-v1',JSON.stringify(v));},{events,patch});await p.reload();await advance(p);}
(async()=>{const browser=await launchBrowser(),reports=[];try{for(const [name,width,height] of [['pc',1440,1000],['short',1440,720],['mobile',390,844],['small',320,740],['tablet',769,900]]){
 console.log(`Checking ${name}`);
 const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
 await p.goto(base);await p.getByRole('button',{name:'시작하기',exact:true}).click();await p.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('기록검증');await p.getByRole('button',{name:'이름 넣고 시작'}).click();await p.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();await advance(p);
 await seed(p,{flowProgress:{eventId:'battle-184-daxingshan',nodeId:'start'},applied:['chapter-5-1-opening','chapter-5-1-yellow-conquest'],flags:{chapter51AccompaniedLiuBei:true}});
 const record=p.getByTestId('history-record');await record.filter({hasText:'5만'}).waitFor();assert((await record.allTextContents()).join(' ').includes('500'));
 assert.equal(await p.getByRole('heading',{name:/^역사 흐름|^나의 기록/}).count(),0);assert.equal(await p.getByRole('heading',{name:/^기록\s*\d/}).count(),1);
 if(width>1000){const r=await p.locator('aside').last().boundingBox(),scene=await p.getByTestId('event-panel').boundingBox();assert(r.x>scene.x+scene.width-2);assert(r.width>=380);}
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name} overflow`);
 await p.getByRole('button',{name:'사건 기록과 출처 ↗'}).click();const source=p.locator('dialog[open]');assert(!(await source.textContent()).includes('원사서 미대조'));assert(!(await source.textContent()).includes('정원지 및 부장 등무 전사'));await source.getByRole('button',{name:'닫기'}).click();
 await p.screenshot({path:`${out}/${name}-background.png`,fullPage:true});
 await p.getByTestId('event-panel').getByRole('button',{name:'선택하기'}).click();
 await p.locator('dialog[open]').getByRole('button').filter({hasText:'유비군을 따라간다'}).click();
 const outcome=p.getByTestId('history-record').filter({has:p.locator('[data-record-type="outcome"]')});
 await p.locator('[data-record-type="outcome"]').filter({hasText:'정원지'}).waitFor();
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-v1')).state.game.world.log);
 const entries=saved.filter(entry=>entry.eventId==='battle-184-daxingshan');
 assert.equal(entries.filter(entry=>entry.recordType==='background').length,1);assert.equal(entries.filter(entry=>entry.recordType==='outcome').length,1);
 assert(entries.findIndex(entry=>entry.recordType==='background')<entries.findIndex(entry=>entry.recordType==='outcome'));
 await p.screenshot({path:`${out}/${name}-outcome.png`,fullPage:true});
 await seed(p,{factionId:null,role:'civilian',region:'jizhou',flowProgress:{eventId:'chapter-5-1-service',nodeId:'offers'},flags:{chapter51AccompaniedCaoCao:true},applied:events.filter(e=>e.year===184&&e.id!=='chapter-5-1-service').map(e=>e.id)});
 await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('tk-survival-game-v1'));v.state.game.stats.charisma=0;localStorage.setItem('tk-survival-game-v1',JSON.stringify(v));});await p.reload();await advance(p);
 await p.getByTestId('event-panel').getByRole('button',{name:'선택하기'}).click();const choices=p.locator('dialog[open]');assert.equal(await choices.getByRole('button').filter({hasText:'유비 휘하에 지원한다'}).count(),0);await choices.getByRole('button').filter({hasText:'조조 휘하에 지원한다'}).click();await advance(p);
 await p.getByTestId('event-panel').getByRole('button',{name:'선택하기'}).click();const travel=p.locator('dialog[open]');for(const dest of ['서방의 양주','기주','탁군'])assert.equal(await travel.getByRole('button').filter({hasText:`${dest}로 향한다`}).count(),1);
 await p.screenshot({path:`${out}/${name}-declined.png`,fullPage:true});await travel.getByRole('button',{name:'닫기'}).click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);reports.push({name,oneRecord:true,backgroundBeforeOutcome:true,onlyCaoOffer:true,declineDestinations:3,errors});await c.close();
}
 const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`${base}/admin/events?event=battle-184-daxingshan`);
 await p.locator('[data-id="battle-background"] strong').click();
 await p.getByLabel('기록 유형',{exact:true}).selectOption('background');
 const custom='정원지가 탁군으로 진격하자 유비 일행은 요격을 준비했다. 관리자 저장 검증 기록이다.';
 await p.getByLabel('결과 대사',{exact:true}).fill(custom);
 await p.getByRole('button',{name:'흐름 저장 · 게임 반영',exact:true}).click();
 await p.reload();await p.locator('[data-id="battle-background"] strong').click();
 assert.equal(await p.getByLabel('결과 대사',{exact:true}).inputValue(),custom);assert.equal(await p.getByLabel('기록 유형',{exact:true}).inputValue(),'background');
 await p.screenshot({path:`${out}/admin-record-type.png`});
 await p.goto(base);await p.getByRole('button',{name:'시작하기',exact:true}).click();await p.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('관리검증');await p.getByRole('button',{name:'이름 넣고 시작'}).click();await p.getByTestId('stat-roulette').getByRole('button',{name:'시작',exact:true}).click();await advance(p);
 await seed(p,{flowProgress:{eventId:'battle-184-daxingshan',nodeId:'start'},applied:['chapter-5-1-opening','chapter-5-1-yellow-conquest']});
 await p.getByTestId('history-record').filter({hasText:custom}).waitFor();assert.deepEqual(errors,[]);reports.push({name:'admin',recordTypeSaved:true,customTextPreserved:true,gameReflected:true,errors});await c.close();
 }finally{await browser.close();}fs.writeFileSync(`${out}/results.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));})().catch(e=>{console.error(e);process.exit(1)});
