const fs = require('node:fs');
const assert = require('node:assert/strict');
const { launchBrowser } = require('./check-page.cjs');
const [baseUrl = 'http://localhost:4173', output = '/tmp/tk-game-browser'] = process.argv.slice(2);
fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await launchBrowser();
 const results = [];
 try {
  for (const [name, width, height] of [['desktop',1440,1000],['mobile',390,844],['short-desktop',1440,720]]) {
   const context = await browser.newContext({ viewport: {width,height} });
   const page = await context.newPage();
   const errors = [], failed = [];
   page.on('pageerror', e=>errors.push(e.message));
   page.on('response', response=>{if(response.status()>=400 && response.url().startsWith(new URL(baseUrl).origin)) failed.push({status:response.status(),url:response.url()});});
   await page.goto(baseUrl, {waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'시작하기',exact:true}).click();
   await page.getByLabel('이 시대에 남길 이름').fill('표정검증');
   await page.getByRole('button',{name:'이름 넣고 시작'}).click();
   await page.getByTestId('event-panel').waitFor();
   await page.getByRole('button',{name:'자동 ▶',exact:true}).click();
   const art=page.getByTestId('scene-art');
   await art.locator('img').evaluate(img=>img.complete && img.naturalWidth>0 ? true : new Promise((resolve,reject)=>{img.onload=()=>resolve(true);img.onerror=()=>reject(new Error('scene image failed'));}));
   const box=await art.boundingBox(); assert(box && box.height>=100, name+' scene visible');
   assert.match(await art.locator('img').getAttribute('src'),/opening/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' horizontal overflow');
   await page.getByTestId('event-panel').screenshot({path:`${output}/${name}-scene.png`});
   await page.getByTestId('event-panel').getByRole('button',{name:'선택하기'}).click();
   const dialog=page.locator('dialog[open]'); await dialog.waitFor();
   await page.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img')].every(img=>img.complete && img.naturalWidth>0));
   assert.equal(await dialog.locator('img').count(),3);
   await dialog.screenshot({path:`${output}/${name}-choices.png`});
   await dialog.getByRole('button',{name:/관군에 붙는다/}).click();
   await page.getByRole('button',{name:'다음 기록',exact:true}).click();
   await page.getByTestId('event-panel').waitFor();
   await page.waitForFunction(()=>document.querySelector('[data-testid="scene-art"] img')?.getAttribute('src')?.includes('travel-wagons'));
   await page.getByTestId('scene-art').locator('img').evaluate(img=>img.complete && img.naturalWidth>0 ? true : new Promise(resolve=>img.onload=resolve));
   await page.getByTestId('event-panel').screenshot({path:`${output}/${name}-next-scene.png`});
   results.push({name,sceneSize:box,choiceImages:3,nextScene:'travel-wagons',errors,failed});
   assert.equal(errors.length,0,JSON.stringify(errors)); assert.equal(failed.length,0,JSON.stringify(failed));
   await context.close();
  }
 } finally {await browser.close();fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
