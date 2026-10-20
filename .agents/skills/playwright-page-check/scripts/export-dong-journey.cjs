const fs=require('fs'),path=require('path'),Module=require('module'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../../..'),ts=require(root+'/node_modules/typescript');
const output=process.argv[2]??'/tmp/tk-continuity';
const original=Module._resolveFilename;Module._resolveFilename=function(id,...rest){return original.call(this,id.startsWith('@/')?path.join(root,id.slice(2)):id,...rest)};
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {newGame}=require(root+'/stores/game-store.ts'),{historicalEvents}=require(root+'/lib/history.ts'),{getCurrentEvent,choiceKey,resolveChoice}=require(root+'/lib/event-engine.ts');
const {unifiedRecords}=require(root+'/lib/history-records.ts');
let g=newGame('서방여정검증',184,'unknown','farmer');g.stats={leadership:70,strength:70,intelligence:70,politics:70,charisma:70};
const decisions=[];
for(let n=0;n<160&&!g.completed;n++){
 const e=getCurrentEvent(g,historicalEvents,true);if(!e)break;
 if(e.automatic){g=e.state;continue;}g=e.state;
 const ids=e.choices.map(o=>o.id.split(':').at(-1));let id;
 if(e.id==='chapter-5-1-opening')id=ids.includes('han')?'han':ids.includes('liu')?'liu':ids[0];
 else if(e.id==='chapter-5-1-service'&&ids.includes('join-liu-bei')){id='join-liu-bei';g.stats.charisma=0;}
 else if(ids.includes('liangzhou'))id='liangzhou';
 else if(e.id.includes('service')&&ids.includes('join-dong-zhuo')){id='join-dong-zhuo';g.stats.charisma=100;}
 else if(ids.includes('stay'))id='stay';
 else if(e.id==='chapter-end')id='finish';
 else id=['alternate','recover','continue','follow','done','wait'].find(x=>ids.includes(x))??ids[0];
 assert(id,JSON.stringify({event:e.id,cursor:g.flowProgress,ids}));
 const choice=e.choices.find(c=>c.id.split(':').at(-1)===id)||e.choices.find(c=>c.id===id);decisions.push({year:g.year,event:e.id,node:g.flowProgress?.nodeId,choice:id});
 const roll=id==='join-dong-zhuo'?0:.99;
 g=resolveChoice(g,choiceKey(e,choice.id),historicalEvents,()=>roll);
}
assert(g.completed,'journey did not complete');fs.mkdirSync(output,{recursive:true});const legacyFile=path.join(output,'legacy-v8-dong.json');if(!fs.existsSync(legacyFile))fs.copyFileSync(path.resolve(__dirname,'../fixtures/legacy-v8-dong.json'),legacyFile);fs.writeFileSync(path.join(output,'dong-journey.json'),JSON.stringify({game:g,records:unifiedRecords(g.world),decisions},null,2));
console.log(JSON.stringify({year:g.year,faction:g.factionId,region:g.region,decisions:decisions.length,records:unifiedRecords(g.world).length,complete:g.completed}));
