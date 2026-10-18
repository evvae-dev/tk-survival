const { playbackButton } = require('./playback-helper.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { launchBrowser } = require('./check-page.cjs');
const [baseUrl='http://localhost:4173',output='/tmp/tk-image-audit'] = process.argv.slice(2);
const root=path.resolve(__dirname,'../../../..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/history/events.json'),'utf8'));
const roster=JSON.parse(fs.readFileSync(path.join(root,'data/reference/officer-abilities.json'),'utf8'));
const labels={leadership:'통솔',strength:'무력',intelligence:'지력',politics:'정치',charisma:'매력'};
const weights={duel:{strength:1},battle:{leadership:1.5,strength:1},strategy:{intelligence:1},politics:{politics:1},relationship:{charisma:1}};
const results=[];fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await launchBrowser();
 try{
  for(const [screen,width,height] of [['desktop',1440,1000],['mobile',390,844],['short',1440,720]]){
   const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(baseUrl,{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'시작하기',exact:true}).click();
   await page.getByRole('textbox',{name:'이 시대에 남길 이름',exact:true}).fill('이미지전체검증');
   await page.getByRole('button',{name:'이름 넣고 시작'}).click();
   await page.getByTestId('game-screen').waitFor();
   const base=await page.evaluate(()=>JSON.parse(localStorage.getItem('tk-survival-game-v1')));
   for(let i=0;i<catalog.length;i++) for(const node of catalog[i].flow.nodes.filter(n=>n.type==='choice')){
    const event=catalog[i],key=`${screen}-${event.id}-${node.id}`;
    const save=structuredClone(base),game=save.state.game;
    game.flowProgress={eventId:event.id,nodeId:node.id};game.completed=false;game.turn=2;
    game.factionId=node.id==='yellow-plan'?'yellow-turban':node.id==='civilian'?null:'han';
    game.role=game.factionId?'soldier':'civilian';
    game.world.appliedEventIds=catalog.slice(0,i).map(e=>e.id);game.resolvedEventIds=[...game.world.appliedEventIds];
    game.decisions=[];game.world.log=[];
    await page.evaluate(value=>localStorage.setItem('tk-survival-game-v1',JSON.stringify(value)),save);
    await page.reload({waitUntil:'domcontentloaded'});await page.getByTestId('event-panel').waitFor();
    await playbackButton(page,'자동 ▶');
    const img=page.getByTestId('scene-art').locator('img');
    await img.evaluate(img=>img.complete&&img.naturalWidth?true:new Promise((resolve,reject)=>{img.onload=()=>resolve(true);img.onerror=()=>reject(Error('scene image failed'))}));
    const sceneSrc=await img.getAttribute('src');
    if(event.id==='battle-184-daxingshan'&&node.id==='yellow-plan') assert.match(sceneSrc,/yellow-face-generals/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,key+' overflow');
    if(screen==='mobile'||(event.id==='battle-184-daxingshan'&&node.id==='yellow-plan'))await page.getByTestId('event-panel').screenshot({path:`${output}/${key}-scene.png`});
    await page.getByTestId('event-panel').getByRole('button',{name:'선택하기'}).click();
    const dialog=page.locator('dialog[open]');await dialog.waitFor();
    const text=await dialog.innerText();assert(!text.includes('상대 없음'),key+' no-opponent text');
    const pictures=dialog.locator('img');const count=await pictures.count();
    for(const image of await pictures.all()){
     await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.complete&&img.naturalWidth?true:new Promise((resolve,reject)=>{img.onload=()=>resolve(true);img.onerror=()=>reject(Error('choice image failed'))}));
    }
    const sources=await pictures.evaluateAll(images=>images.map(img=>img.getAttribute('src')));
    assert.equal(new Set(sources).size,sources.length,key+' duplicate choice images');assert(!sources.includes(sceneSrc),key+' repeated scene');
    if(event.id==='chapter-5-1-opening'&&node.id==='front')assert.equal(count,0,key+' front popup text-only');
    for(const option of node.data.options){
     const edge=event.flow.edges.find(e=>e.source===node.id&&e.sourceHandle===option.id);
     const check=event.flow.nodes.find(n=>n.id===edge?.target)?.data.check;
     if(!check?.opponentId)continue;
     const opponent=roster.find(p=>p.id===check.opponentId);assert(text.includes(opponent.name),key+' opponent name');
     for(const [ability,weight]of Object.entries(check.kind==='custom'?check.weights:weights[check.kind]))if(weight>0)assert(text.includes(`${labels[ability]} ${opponent.stats[ability]}`),key+' opponent stat');
    }
    await dialog.evaluate(el=>{el.scrollTop=0;});
    if(screen==='mobile'||(event.id==='battle-184-daxingshan'&&node.id==='yellow-plan'))await dialog.screenshot({path:`${output}/${key}-popup.png`});
    results.push({screen,event:event.id,node:node.id,scene:sceneSrc,popupImages:sources,choices:node.data.options.length});
   }
   assert.equal(errors.length,0,JSON.stringify(errors));await context.close();
  }
 }finally{await browser.close();fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));}
 console.log(JSON.stringify({scenarios:results.length,choicesRendered:results.reduce((n,r)=>n+r.choices,0),errors:0,output}));
})().catch(e=>{console.error(e);process.exitCode=1});
