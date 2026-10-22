import { getEffectiveCatalog } from "./event-catalog-store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyStats, familyEffects, familyLabels, initialStats, type Game, type Stats, type HistoricalEvent } from "@/lib/game";
import { getCurrentEvent, resolveChoice } from "@/lib/event-engine";
import { playbackKey } from '@/lib/record-playback';
import { rollStartingStats, validStartingStats } from '@/lib/starting-stats';
import { createWorld } from "@/lib/world";
import { restoreHistoryRecords } from '@/lib/history-records';

type GameStore = { game: Game | null; startGame: (name: string, stats?: Stats) => void; changeStats: (delta: Partial<Stats>) => void; nextTurn: (choiceKey: string) => void; advanceRecord: (expectedKey: string) => void; resetGame: () => void };
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
export function newGame(name: string, year: number, region: string, family: string, catalog?: HistoricalEvent[]): Game {
  return { name, startYear: year, year, month: null, region, birthRegion: region, birthYear: year - 20, family, age: 20, turn: 0, fame: 0, stats: applyStats(initialStats, familyEffects[family] ?? {}), completed: false, factionId: null, role: "civilian", reputation: family === "gentry" ? { han: 20 } : {}, resolvedEventIds: [], world: createWorld(year,catalog), decisions: [] };
}
// This edition has independent storage; previous saves stay in their old key.
export function migrateGame(persisted:unknown,_version=0):{game:Game|null}{
 const game=(persisted as {game?:Game}|null)?.game;
 return game?.stats&&game.world&&Array.isArray(game.decisions)?{game:{...game,fame:game.fame??0,stats:applyStats({leadership:game.stats.leadership,strength:game.stats.strength,intelligence:game.stats.intelligence,politics:game.stats.politics,charisma:game.stats.charisma},{})}}:{game:null};
}
export const useGameStore = create<GameStore>()(persist((set) => ({
  game: null,
  startGame: (input, rolled) => {
    const name = input.trim().slice(0, 20);
    const stats = rolled ?? rollStartingStats();
    if (!name || !validStartingStats(stats)) return;
    const game = newGame(name, 184, 'zhuo', pick(Object.keys(familyLabels)), getEffectiveCatalog());
    set({ game: { ...game, stats: { ...stats }, introChoicePending: true } });
  },
  changeStats: delta => set(({ game }) => game && !game.completed ? { game: { ...game, stats: applyStats(game.stats, delta) } } : {}),
  nextTurn: key => set(({ game }) => game && !game.completed && !getCurrentEvent(game, getEffectiveCatalog(), true)?.automatic ? { game: resolveChoice(game, key, getEffectiveCatalog()) } : {}),
  advanceRecord: expectedKey => set(({ game }) => {
    if (!game || game.completed || playbackKey(game) !== expectedKey) return {};
    const next = getCurrentEvent(game, getEffectiveCatalog(), true);
    return next?.automatic ? { game: next.state } : {};
  }),
  resetGame: () => set({ game: null }),
}), { name: "tk-survival-game-romance-v1", version: 1, migrate: migrateGame, partialize: ({ game }) => ({ game }), skipHydration: true }));
