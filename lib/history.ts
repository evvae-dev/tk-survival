import data from "@/data/history/events.json";
import type { HistoricalEvent } from "./game";
export const sortEvents = (events: HistoricalEvent[]) => events.slice().sort((a, b) => a.year - b.year || (a.sequence ?? 1000) - (b.sequence ?? 1000) || (a.month ?? 13) - (b.month ?? 13) || a.id.localeCompare(b.id));
export const historicalEvents = sortEvents(data as HistoricalEvent[]);
export const yearHistory = (year: number) => historicalEvents.filter((event) => event.year === year);
