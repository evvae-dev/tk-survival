import chapter from '@/data/collection/5-1-yellow-turban.json';
import type { Game, HistoricalEvent, World } from './game';

export function blankWorld(): World {
  return {
    people: Object.fromEntries(chapter.people.map(person => [person.id, 'alive' as const])),
    flags: {}, factions: { han: 'active', 'yellow-turban': 'active' },
    control: { luoyang: 'han', changan: 'han', zhuo: 'han', chenliu: 'han', chengdu: 'han', ...Object.fromEntries(chapter.places.map(place => [place.id, 'yellow-turban'])) },
    log: [], appliedEventIds: [],
  };
}
export function createWorld(_year: number, _catalog?: HistoricalEvent[]): World { return blankWorld(); }
export function normalizeWorldControl(world: World): World {
  return { ...world, control: Object.fromEntries(Object.entries(world.control).map(([region, owner]) => [region, owner && world.factions[owner] !== 'defeated' ? owner : null])) };
}
export function normalizeMembership(game: Game): Game {
  const world = normalizeWorldControl(game.world);
  return game.factionId && world.factions[game.factionId] === 'defeated'
    ? { ...game, world, factionId: null, role: 'refugee' }
    : { ...game, world };
}
export function currentCourtLabel(world: World): string { return world.flags.yellowEmpireFounded ? '낙양 · 황건국 (황제 생포)' : world.control.luoyang === 'han' ? '낙양 · 후한' : '궁정 위치 미확인'; }
