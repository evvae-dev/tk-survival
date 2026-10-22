import type { Game, HistoricalEvent, World } from './game';
export function blankWorld(): World {
 return {people:{}, flags:{}, factions:{han:'active','yellow-turban':'active','liu-bei':'active','cao-cao':'active','dong-zhuo':'active'},control:{luoyang:'han',zhuo:'han',qingzhou:'han',jizhou:'han',changan:'han'},log:[],historyLog:[],appliedEventIds:[]};
}
export function createWorld(_year: number, catalog: HistoricalEvent[] = []): World {
 const world=blankWorld(); for(const event of catalog) for(const id of event.relatedOfficerIds??[]) world.people[id]='alive'; return world;
}
export function normalizeWorldControl(world: World): World { return {...world,control:Object.fromEntries(Object.entries(world.control).map(([region,owner])=>[region,owner&&world.factions[owner]!=='defeated'?owner:null]))}; }
export function normalizeMembership(game: Game): Game { const world=normalizeWorldControl(game.world);return game.factionId&&world.factions[game.factionId]==='defeated'?{...game,world,factionId:null,role:'refugee'}:{...game,world}; }
export function currentCourtLabel(world: World): string { return world.control.luoyang==='han'?'낙양 · 후한':'궁정 위치 미확인'; }
