import type { EventFlow } from './event-flow-types';
import collected from '@/data/collection/5-1-yellow-turban.json';
import entities from "@/data/history/entities.json";
export type OfficerLinkInference = { name: string; officerId: string; method: 'lifespan' | 'context'; reason: string };
export type Stats = { leadership: number; strength: number; intelligence: number; politics: number; charisma: number };
export type Role = "child" | "civilian" | "soldier" | "officer" | "refugee";
export type FactionStatus = "active" | "defeated" | "preserved";
export type AbilityRoll = { weights: Partial<Stats>; opponentId?: string; playerScore: number; opponentScore?: number; multiplier: number; chance: number; roll: number; success: boolean };
export type ChoiceGrowth = { stats: Partial<Stats>; fame: number };
export type RecordEntry = { year: number; month: number | null; title: string; detail: string; kind: "history" | "fiction" | "action"; growth?: ChoiceGrowth; check?: AbilityRoll };
export type World = { people: Record<string, 'alive' | 'dead'>; flags: Record<string, boolean>; factions: Record<string, FactionStatus>; control: Record<string, string | null>; log: RecordEntry[]; appliedEventIds: string[] };
export type Game = { introChoicePending?: boolean; flowProgress?: {eventId:string;nodeId:string}; name: string; startYear: number; year: number; month: number | null; region: string; birthRegion: string; birthYear: number; family: string; age: number; turn: number; fame?: number; stats: Stats; completed: boolean; factionId: string | null; role: Role; reputation: Record<string, number>; resolvedEventIds: string[]; world: World; decisions: RecordEntry[] };
export type HistoricalEvent = { id:string;chapterId?:string;sequence?:number;prerequisiteEventIds?:string[];connections?:{targetId:string;label:string}[];year:number;month:number|null;precision:"month"|"year"|"approximate";calendar:"lunar";leapMonth?:boolean|null;dateNote?:string;endYear?:number;title:string;summary:string;regionIds:string[];factionIds:string[];category:"history"|"novel";relatedPeople:string[];relatedOfficerIds?:string[];officerLinkInferences?:OfficerLinkInference[];source:{title:string;record:string};verification?:"reviewed";flow?:EventFlow };
export const statLabels: Record<keyof Stats, string> = { leadership: "통솔", strength: "무력", intelligence: "지력", politics: "정치", charisma: "매력" };
export const initialStats: Stats = { leadership: 50, strength: 50, intelligence: 50, politics: 50, charisma: 50 };
export const regionLabels: Record<string, string> = { unknown: "모름", luoyang: "낙양", changan: "장안", zhuo: "탁군", chenliu: "진류", chengdu: "성도", jizhou: "기주", qingzhou: "청주", xuzhou: "서주", jingzhou: "형주", yangzhou: "양주", liangzhou: "량주", hanzhong: "한중", guandu: "관도", chibi: "적벽", jianye: "건업", shouchun: "수춘", liaodong: "요동", yizhou: "익주", yuzhou: "예주", yanzhou: "연주", bingzhou: "병주", xuchang: "허창" };
for (const place of collected.places) regionLabels[place.id] = place.label;
export const factionLabels: Record<string, string> = { han: "후한", "yellow-turban": "황건 주력군", "dong-zhuo": "동탁", coalition: "반동탁 연합", "cao-cao": "조조", "yuan-shao": "원소", "yuan-shu": "원술", "gongsun-zan": "공손찬", "liu-biao": "유표", "liu-zhang": "유장", "zhang-lu": "장로", sun: "손씨", "liu-bei": "유비", wei: "위", shu: "촉", wu: "오", jin: "진", sima: "사마씨", "northern-tribes": "북방 세력" };
export const familyLabels: Record<string, string> = { farmer: "농민", merchant: "상인", scholar: "서생", military: "군인", gentry: "사족" };
for (const entity of entities.regions) if (!regionLabels[entity.id]) regionLabels[entity.id] = entity.label;
for (const entity of entities.factions) if (!factionLabels[entity.id]) factionLabels[entity.id] = entity.label;
export const roleLabels: Record<Role, string> = { child: "아이", civilian: "민간인", soldier: "병사", officer: "장교", refugee: "피란민" };
export const birthRegions = ["luoyang", "changan", "zhuo", "chenliu", "chengdu"];
export const familyEffects: Record<string, Partial<Stats>> = { farmer: { strength: 10 }, merchant: { charisma: 5 }, scholar: { intelligence: 15, politics: 5 }, military: { leadership: 15, strength: 15 }, gentry: { intelligence: 8, politics: 10, charisma: 12 } };
export const label = (map: Record<string, string>, id: string) => map[id] ?? id;
export const factionLabel = (id: string, year: number) => id === "yuan-shao" && year > 202 ? "원씨" : label(factionLabels, id);
export function applyStats(stats: Stats, delta: Partial<Stats>): Stats { return Object.fromEntries((Object.keys(initialStats) as (keyof Stats)[]).map(key => [key, Math.max(0, Math.min(100, stats[key] + (delta[key] ?? 0)))])) as Stats; }
export const dateLabel = (year: number, month: number | null) => month === null ? `${year}년` : `${year}년 · 음력 ${month}월`;

