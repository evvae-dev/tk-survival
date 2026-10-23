const fs = require('node:fs');
const assert = require('node:assert/strict');
const {launchBrowser} = require('./check-page.cjs');
const [url='http://127.0.0.1:4173',out='/tmp/tk-participation-results']=process.argv.slice(2);
const scenarios=[
 {event:'r005-04',node:'front',choice:'군적을 확인받고 화웅에게 직접 맞선다',fixture:'hua-capture-ready',image:'v2-hua-captured',flag:'huaCaptured'},
 {event:'r005-08',node:'coalition',choice:'뒤의 포위 대열을 맞춰 여포를 생포한다',fixture:'lu-capture-ready',image:'v2-lu-captured',flag:'luBuCaptured'},
];
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await launchBrowser(),report=[];
 try{for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['short',1440,720]]){
  const cx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await cx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Math.random=()=>0});
  for(const scenario of scenarios){
   const game=JSON.parse(fs.readFileSync(`/tmp/tk-participation-fixtures/${scenario.fixture}.json`,'utf8'));
   assert(['soldier','officer'].includes(game.role),`실제 군적 경로 필요: ${scenario.event}`);
   await p.goto(url);
   await p.evaluate(game=>localStorage.setItem('tk-survival-game-participation-v2',JSON.stringify({state:{game:{...game,introChoicePending:false}},version:1})),game);
   await p.reload();await p.getByRole('button',{name:'선택하기',exact:false}).click();
   await p.locator('dialog[open]').getByRole('button').filter({has:p.locator('strong',{hasText:scenario.choice})}).click();
   const result=p.getByTestId('choice-result');await result.waitFor();
   assert((await result.innerText()).includes('성공'));assert((await result.locator('img').getAttribute('src')).includes(scenario.image));
   await result.locator('img').evaluate(img=>img.complete?true:new Promise(resolve=>{img.onload=resolve}));
   const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-participation-v2')).state.game);
   assert.equal(saved.world.flags[scenario.flag],true);assert(saved.pendingResult);assert.equal(saved.decisions.at(-1).detail.split('나는 ').length-1,1);
   await p.screenshot({path:`${out}/${name}-${scenario.image}.png`});
   await p.reload();await result.waitFor();
   const restored=await p.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-participation-v2')).state.game);
   assert.equal(restored.pendingResult.expiresAt,saved.pendingResult.expiresAt);assert.deepEqual(restored.decisions,saved.decisions);
   await result.waitFor({state:'hidden',timeout:8000});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   report.push({name,event:scenario.event,successImage:true,resultReloadPreserved:true,automaticTransition:true});
  }
  assert.deepEqual(errors,[]);await cx.close();
 }}finally{await browser.close()}
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
