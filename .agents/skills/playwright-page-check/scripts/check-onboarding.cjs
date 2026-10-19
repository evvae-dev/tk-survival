const fs=require('node:fs'),assert=require('node:assert/strict');
const{launchBrowser}=require('./check-page.cjs');
const[baseUrl='http://localhost:4173',out='/tmp/tk-onboarding']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await launchBrowser();const results=[];try{for(const[name,width,height,reducedMotion]of[['pc',1440,1000,'no-preference'],['mobile',390,844,'no-preference'],['small-mobile',320,740,'no-preference'],['reduced',390,844,'reduce']]){
 const c=await browser.newContext({viewport:{width,height},reducedMotion,isMobile:width<768,hasTouch:width<768}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(baseUrl);await p.getByRole('button',{name:'시작하기',exact:true}).click();const input=p.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true});await input.fill('룰렛검증');
 assert(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),'input font prevents iOS focus zoom');
 assert.equal(await p.evaluate(()=>window.visualViewport?.scale ?? 1),1);
 await p.getByRole('button',{name:'이름 넣고 시작'}).click();
 assert.equal(await p.evaluate(()=>document.activeElement?.tagName==='INPUT'),false,'name input releases focus');
 const roulette=p.getByTestId('stat-roulette');await roulette.waitFor();assert.equal(await p.locator('dialog[open]').getByRole('button',{name:'팝업 닫기'}).count(),0);await p.keyboard.press('Escape');assert(await roulette.isVisible());
 assert(await roulette.getByRole('button',{name:'다시 만들기',exact:true}).isDisabled());assert(await roulette.getByRole('button',{name:'시작',exact:true}).isDisabled());
 const start=await roulette.locator('.none,[data-locked]').allTextContents();
 if(reducedMotion!=='reduce')await p.waitForFunction(previous=>{const current=[...document.querySelectorAll('[data-testid="stat-roulette"] [data-locked]')].map(x=>x.textContent);return JSON.stringify(current)!==JSON.stringify(previous);},start);
 await p.screenshot({path:`${out}/${name}-rolling.png`});
 await p.locator('[data-testid="stat-roulette"][data-phase="complete"]').waitFor();
 let numbers=await roulette.locator('[data-locked] strong').allTextContents();assert.equal(numbers.length,5);assert(numbers.every(n=>+n>=30&&+n<=80));await p.screenshot({path:`${out}/${name}-complete.png`});
 // Results stay uncommitted until the player explicitly starts, including repeated rolls.
 const savedGame=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-v1')||'null')?.state?.game??null);
 assert.equal(await savedGame(),null);await p.waitForTimeout(1200);assert(await roulette.isVisible());assert.equal(await p.getByTestId('game-screen').count(),0);
 const rolls=[numbers];
 for(let attempt=0;attempt<3;attempt++){
  await roulette.getByRole('button',{name:'다시 만들기',exact:true}).click();
  assert.equal(await roulette.getAttribute('data-phase'),'rolling');assert(await roulette.getByRole('button',{name:'시작',exact:true}).isDisabled());
  await p.locator('[data-testid="stat-roulette"][data-phase="complete"]').waitFor();
  numbers=await roulette.locator('[data-locked] strong').allTextContents();assert(numbers.every(n=>+n>=30&&+n<=80));rolls.push(numbers);assert.equal(await savedGame(),null);
 }
 assert(new Set(rolls.map(x=>JSON.stringify(x))).size>1,'rerolls produce fresh results');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await p.screenshot({path:`${out}/${name}-rerolled.png`});
 await roulette.getByRole('button',{name:'시작',exact:true}).click();
 await p.getByTestId('game-screen').waitFor();const awakening=p.getByTestId('awakening-transition');await awakening.waitFor();await p.keyboard.press('Escape');assert(await awakening.isVisible());await p.screenshot({path:`${out}/${name}-awakening.png`});await awakening.waitFor({state:'detached'});await p.getByTestId('event-panel').waitFor();await p.getByRole('button',{name:'진행',exact:true}).click();const initial=p.locator('dialog[open]');await initial.getByRole('heading',{name:/갑자기 분위기 황건적/}).waitFor();
 assert.equal(await p.evaluate(()=>window.visualViewport?.scale ?? 1),1);
 const game=await p.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-v1')).state.game);
 assert.equal(game.region,'unknown');assert.equal(game.birthRegion,'unknown');assert.equal(game.introChoicePending,true);
 assert.deepEqual(Object.values(game.stats),numbers.map(Number));
 assert((await p.getByTestId('mobile-character-row').textContent()).includes('모름'));
 await p.screenshot({path:`${out}/${name}-first-choice.png`});
 await initial.getByRole('button',{name:/관군에 붙는다/}).click();await p.reload();await p.getByTestId('event-panel').waitFor();assert.equal(await p.locator('dialog[open]').count(),0);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(errors.length,0,JSON.stringify(errors));results.push({name,stats:game.stats,location:'모름',firstChoice:true,rerolls:3,manualStart:true,errors});await c.close();
}}finally{await browser.close()}fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exitCode=1});
