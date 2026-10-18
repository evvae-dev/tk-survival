import data from '@/data/collection/5-1-yellow-turban.json';

export const collectedChapter = data;
export type CollectedEvent = typeof data.events[number];
export type CollectedStage = CollectedEvent['stages'][number];
export type Intervention = CollectedEvent['gameplayDraft']['interventions'][number];
export const collectionPeople = new Map(data.people.map(person => [person.id, person]));
export const collectionPlaces = new Map(data.places.map(place => [place.id, place]));
export const collectionSources = new Map(data.sourceRecords.map(source => [source.id, source]));
