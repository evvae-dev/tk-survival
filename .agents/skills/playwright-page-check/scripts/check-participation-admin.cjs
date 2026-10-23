const fs=require('node:fs'),assert=require('node:assert/strict'),{launchBrowser}=require('./check-page.cjs');
const [url='http://127.0.0.1:4173',out='/tmp/tk-participation-admin']=process.argv.slice(2);
fs.mkdirSync(out,{recursive:true});
async function seed(p,file){const game=JSON.parse(fs.readFileSync(`/tmp/tk-participation-fixtures/${file}.json`));await p.goto(url);await p.evaluate(game=>localStorage.setItem('tk-survival-game-participation-v2',JSON.stringify({state:{game:{...game,introChoicePending:false}},version:1})),game);await p.reload();}
async function node(p,id){await p.goto(`${url}/admin/events?event=r001-04`);await p.getByLabel('사건 ID',{exact:true}).waitFor();await p.locator(`[data-id="${id}"]`).dispatchEvent('click');await p.getByRole('tab',{name:'노드 속성',exact:true}).click();}
async function save(p){await p.getByRole('button',{name:'흐름 저장 · 게임 반영',exact:true}).click();await p.getByRole('status').filter({hasText:'흐름을 저장했습니다'}).waitFor();}
(async()=>{const browser=await launchBrowser();try{
 const cx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await cx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await node(p,'oath-eligible-0');assert.equal(await p.getByLabel('전체 필드명',{exact:true}).inputValue(),'world.flags.liuInvitation');await p.getByLabel('비교 값',{exact:false}).selectOption('false');await save(p);
 await node(p,'oath-eligible-0');assert.equal(await p.getByLabel('비교 값',{exact:false}).inputValue(),'false');await p.screenshot({path:`${out}/condition-saved.png`});
 await seed(p,'oath-accepted');await p.getByTestId('record-card').waitFor();assert((await p.getByTestId('record-card').innerText()).includes('참석하지 않았다'));assert.equal(await p.getByRole('button',{name:'선택하기',exact:false}).count(),0);
 await seed(p,'oath-rejected');await p.getByRole('button',{name:'선택하기',exact:false}).waitFor();assert((await p.getByTestId('event-panel').innerText()).includes('복숭아'));
 await node(p,'oath-eligible-0');await p.getByLabel('비교 값',{exact:false}).selectOption('true');await save(p);
 await node(p,'news-0');assert.equal(await p.getByLabel('기록 유형',{exact:true}).inputValue(),'news');const field=p.getByLabel('결과 대사',{exact:true});const edited=(await field.inputValue())+' 나는 전해 들은 결의와 내 발걸음을 구분했다.';await field.fill(edited);await save(p);
 await node(p,'news-0');assert.equal(await p.getByLabel('결과 대사',{exact:true}).inputValue(),edited);await p.getByText('결과·소식 이미지',{exact:true}).click();assert((await p.getByLabel('결과·소식 이미지 경로',{exact:true}).inputValue()).includes('v2-news-courier'));
 await seed(p,'oath-rejected');await p.getByTestId('record-card').waitFor();assert((await p.getByTestId('record-card').innerText()).includes('내 발걸음을 구분했다'));assert.equal(await p.getByRole('button',{name:'선택하기',exact:false}).count(),0);await p.screenshot({path:`${out}/edited-news-in-game.png`});assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({conditionEditSaveReload:true,trueAndFalseGamePaths:true,newsEditSaveReloadGame:true,resultImageEditor:true,errors},null,2));await cx.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
