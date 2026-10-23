import type { HistoricalEvent } from './game';
import { CATALOG_EDITION, supportedChapter } from './chapter';
import { historicalEvents } from './history';
import { checkWeights } from './ability-check';
import { repairLegacyEditorialText } from './record-presentation';
const defaults = new Map(historicalEvents.map(event => [event.id, event]));
const fallback = {src:'/art/choices/strategy.png',alt:'군영의 지도와 주변 상황을 살피는 주인공'};
const illustrated = (art: import('./artwork').Artwork | null | undefined) => !!art && !art.src.startsWith('/art/characters/');
// A new edition never revives retired story definitions. Current edits stay intact.
export function upgradeLegacyEvent(event: HistoricalEvent): HistoricalEvent {
 if(!event.flow)return event;
 let changed=false;
 const nodes=event.flow.nodes.map(node=>{
  const base=defaults.get(event.id)?.flow?.nodes.find(n=>n.id===node.id);
  if(node.data.text!==undefined){
   const text=repairLegacyEditorialText(node.data.text);
   if(text!==node.data.text){changed=true;node={...node,data:{...node.data,text}};}
  }
  if(node.type==='choice'){
   const artwork=illustrated(node.data.artwork)?node.data.artwork:base?.data.artwork??fallback;
   const options=(node.data.options??[]).map(option=>illustrated(option.artwork)?option:{...option,artwork:base?.data.options?.find(o=>o.id===option.id)?.artwork??artwork});
   if(artwork===node.data.artwork&&options.every((option,i)=>option===node.data.options?.[i]))return node;
   changed=true;return {...node,data:{...node.data,artwork,options}};
  }
  if(node.type==='check'&&node.data.check){
   const check=node.data.check,original=base?.data.check;
   if(check.weights&&check.difficulty!==undefined&&check.fameReward!==undefined)return node;
   changed=true;return {...node,data:{...node.data,check:{...check,weights:check.weights??(original?.kind===check.kind?original.weights:undefined)??(check.kind==='custom'?{intelligence:1}:checkWeights[check.kind]),difficulty:check.difficulty??original?.difficulty??50,fameReward:check.fameReward??original?.fameReward??4,fameReason:check.fameReason??original?.fameReason}}};
  }
  return node;
 });
 return changed?{...event,flow:{...event.flow,nodes}}:event;
}
export function upgradeLegacyCatalog(events: HistoricalEvent[], deletedIds: string[] = []): HistoricalEvent[] {
 return events.filter(event => event.edition === CATALOG_EDITION && supportedChapter(event.chapterId) && !deletedIds.includes(event.id)).map(upgradeLegacyEvent);
}
