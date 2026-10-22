import type { HistoricalEvent,RecordEntry } from './game';
import { narrativeText } from './record-presentation';
export function chronicleLines(entry:RecordEntry,_catalog?:HistoricalEvent[]):string[]{return [narrativeText(entry.detail)||entry.title];}
export function buildChronicle(entries:RecordEntry[]){return entries.flatMap((entry,index)=>chronicleLines(entry).map((text,part)=>({year:entry.year,text,id:`${index}-${part}`})));}
