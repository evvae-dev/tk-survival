import chronologyData from '@/data/reference/chronology.json';
import officerData from '@/data/reference/officers.json';
import type { HistoricalEvent, OfficerLinkInference } from './game';

export type TimelineEntry = {
  id: string; year: number; month: number | null; precision: HistoricalEvent['precision'];
  calendar: 'lunar'; leapMonth: boolean | null; title: string; content: string;
  regionIds: string[]; factionIds: string[]; relatedPeople: string[];
  relatedOfficerIds: string[];
  officerLinkInferences: OfficerLinkInference[];
  officerLinkIssues: { name: string; reason: 'ambiguous' | 'not-found' | 'excluded'; candidateOfficerIds: string[] }[];
  category: HistoricalEvent['category']; parentId: string | null;
  source: { title: string; record: string | null }; verification: 'secondary'; section: string; dateNote?: string;
};
export type Officer = typeof officerData[number];
export const timeline = chronologyData as TimelineEntry[];
export const officers: Officer[] = officerData;

