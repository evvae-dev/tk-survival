import { upgradeLegacyCatalog, upgradeLegacyEvent } from '@/lib/catalog-upgrade';
import { create } from 'zustand';
import exclusions from '@/data/reference/event-exclusions.json';
const excludedEventIds = new Set([...Object.keys(exclusions.chronology), ...Object.keys(exclusions.gameEvents)]);
import { persist } from 'zustand/middleware';
import { CHAPTER_ID } from '@/lib/chapter';
import { historicalEvents, sortEvents } from '@/lib/history';
import type { HistoricalEvent } from '@/lib/game';
import { validateEvent, validateDependencies } from '@/lib/event-flow';
type CatalogStore = { overrides:Record<string,HistoricalEvent>;deletedIds:string[];saveEvent:(event:HistoricalEvent)=>void;deleteEvent:(id:string)=>void;restoreDefaults:()=>void;importCatalog:(events:HistoricalEvent[])=>void };
const check=(event:HistoricalEvent)=>{const errors=validateEvent(event);if(event.chapterId!==CHAPTER_ID)errors.push('현재 목록은 5.1 사건만 지원합니다.');if(event&&!event.flow)errors.push("새 사건은 실행할 플로가 필요합니다.");if(errors.length)throw new Error(errors.join('\n'));};
export const useEventCatalogStore=create<CatalogStore>()(persist((set)=>({overrides:{},deletedIds:[],saveEvent:event=>{check(event);const errors=validateDependencies([...getEffectiveCatalog().filter(e=>e.id!==event.id),event]);if(errors.length)throw new Error(errors.join("\n"));set(s=>({overrides:{...s.overrides,[event.id]:event},deletedIds:s.deletedIds.filter(id=>id!==event.id)}));},deleteEvent:id=>set(s=>({deletedIds:[...new Set([...s.deletedIds,id])],overrides:Object.fromEntries(Object.entries(s.overrides).filter(([key])=>key!==id))})),restoreDefaults:()=>set({overrides:{},deletedIds:[]}),importCatalog:events=>{if(!Array.isArray(events))throw new Error('사건 배열이 필요합니다.');events.forEach(check);const errors=validateDependencies(events);if(errors.length)throw new Error(errors.join("\n"));if(new Set(events.map(e=>e.id)).size!==events.length)throw new Error('사건 ID가 중복됩니다.');set({overrides:Object.fromEntries(events.map(e=>[e.id,e])),deletedIds:historicalEvents.filter(e=>!events.some(item=>item.id===e.id)).map(e=>e.id)});}}),{name:'tk-survival-event-catalog-5.1-v1',skipHydration:true,merge:(saved,current)=>{try{const value=saved as CatalogStore;Object.values(value.overrides??{}).forEach(event=>check(upgradeLegacyEvent(event)));return {...current,overrides:value.overrides??{},deletedIds:Array.isArray(value.deletedIds)?value.deletedIds:[]};}catch{return current;}}}));
export function getCatalogForSync():HistoricalEvent[]{const {overrides,deletedIds}=useEventCatalogStore.getState();return sortEvents(Object.values({...Object.fromEntries(historicalEvents.map(e=>[e.id,e])),...overrides}).filter(e=>!deletedIds.includes(e.id)&&!excludedEventIds.has(e.id)));}

export function getEffectiveCatalog():HistoricalEvent[]{return upgradeLegacyCatalog(getCatalogForSync().map(upgradeLegacyEvent));}
