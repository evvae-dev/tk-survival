import { getEffectiveCatalog } from "./event-catalog-store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyStats, birthRegions, familyEffects, familyLabels, initialStats, type Game, type Stats, type HistoricalEvent } from "@/lib/game";
import { getCurrentEvent, resolveChoice } from "@/lib/event-engine";
import { playbackKey } from '@/lib/record-playback';
import { createWorld } from "@/lib/world";

type GameStore = { game: Game | null; startGame: (name: string) => void; changeStats: (delta: Partial<Stats>) => void; nextTurn: (choiceKey: string) => void; advanceRecord: (expectedKey: string) => void; resetGame: () => void };
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
export function newGame(name: string, year: number, region: string, family: string, catalog?: HistoricalEvent[]): Game {
  return { name, startYear: year, year, month: null, region, birthRegion: region, birthYear: year - 20, family, age: 20, turn: 0, fame: 0, stats: applyStats(initialStats, familyEffects[family] ?? {}), completed: false, factionId: null, role: "civilian", reputation: family === "gentry" ? { han: 20 } : {}, resolvedEventIds: [], world: createWorld(year,catalog), decisions: [] };
}
// 이전 연간 성장·역사 상태는 새 5.1 테스트와 호환되지 않는다.
export function migrateGame(persisted: unknown, version = 0): { game: Game | null } {
  const saved = (persisted as { game?: Game } | null)?.game;
  if (version < 4 || !saved || saved.year !== 184 || !saved.stats) return { game: null };
  const defaults = applyStats(initialStats, familyEffects[saved.family] ?? {});
  return { game: { ...saved, fame: saved.fame ?? 0, stats: applyStats({ ...defaults, ...saved.stats }, {}) } };
}
export const useGameStore = create<GameStore>()(persist((set) => ({
  game: null,
  startGame: input => { const name = input.trim().slice(0, 20); if (name) set({ game: newGame(name, 184, pick(birthRegions), pick(Object.keys(familyLabels)), getEffectiveCatalog()) }); },
  changeStats: delta => set(({ game }) => game && !game.completed ? { game: { ...game, stats: applyStats(game.stats, delta) } } : {}),
  nextTurn: key => set(({ game }) => game && !game.completed && !getCurrentEvent(game, getEffectiveCatalog(), true)?.automatic ? { game: resolveChoice(game, key, getEffectiveCatalog()) } : {}),
  advanceRecord: expectedKey => set(({ game }) => {
    if (!game || game.completed || playbackKey(game) !== expectedKey) return {};
    const next = getCurrentEvent(game, getEffectiveCatalog(), true);
    return next?.automatic ? { game: next.state } : {};
  }),
  resetGame: () => set({ game: null }),
}), { name: "tk-survival-game-v1", version: 6, migrate: migrateGame, partialize: ({ game }) => ({ game }), skipHydration: true }));
